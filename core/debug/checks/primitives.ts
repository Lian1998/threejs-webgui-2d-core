import { Matrix4, Mesh, type BufferAttribute } from "three";
import type { PolygonGeometry, RenderContext, Vec2 } from "../../contracts";
import { PrimitiveRegistry } from "../../primitives/PrimitiveRegistry";
import { PrimitiveFactory } from "../../primitives/PrimitiveFactory";
import { LayerManager } from "../../layers/LayerManager";
import { BatchManager } from "../../batches/BatchManager";
import { PolygonBatchBackend } from "../../render/polygons/PolygonBatchBackend";
import { LineBatchBackend } from "../../render/lines/LineBatchBackend";
import { triangulatePolygonGeometry, type Triangulation } from "../../primitives/polygons/triangulate";
import { pickComponents } from "../../render/shared/material";

function assert(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}
function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}
function throws(operation: () => void, message: string): void {
  let failed = false;
  try {
    operation();
  } catch {
    failed = true;
  }
  assert(failed, message);
}
function fixture() {
  const updates = { invalidations: 0 },
    invalidate = () => {
      updates.invalidations++;
    };
  const registry = new PrimitiveRegistry(),
    layers = new LayerManager(registry, invalidate);
  layers.add({ id: "main", order: 0 });
  const batches = new BatchManager(registry, layers);
  batches.register(new PolygonBatchBackend());
  batches.register(new LineBatchBackend());
  const primitives = new PrimitiveFactory(registry, layers, (handle) => batches.prepare(handle), invalidate);
  return {
    registry,
    layers,
    batches,
    primitives,
    updates,
    dispose: () => {
      registry.dispose();
      batches.dispose();
      layers.dispose();
    },
  };
}
const context: RenderContext = { pass: "color", scale: 10, dpr: 1, cssSize: [200, 100], drawingBufferSize: [200, 100] };
const square: PolygonGeometry = {
  type: "Polygon",
  polygon: {
    outer: [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ],
  },
};
function area(triangulation: Triangulation): number {
  let total = 0;
  for (let i = 0; i < triangulation.indices.length; i += 3) {
    const a = triangulation.vertices[triangulation.indices[i]],
      b = triangulation.vertices[triangulation.indices[i + 1]],
      c = triangulation.vertices[triangulation.indices[i + 2]];
    total += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
  }
  return total;
}
function decode(r: number, g: number, b: number): number {
  return Math.round(r * 255) | (Math.round(g * 255) << 8) | (Math.round(b * 255) << 16);
}
function triangleIdentity(mesh: Mesh): void {
  const position = mesh.geometry.getAttribute("position"),
    pick = mesh.geometry.getAttribute("aPickColor");
  const count = mesh.geometry.drawRange.count;
  for (let i = 0; i < count; i += 3) {
    const ids = [i, i + 1, i + 2].map((index) => decode(pick.getX(index), pick.getY(index), pick.getZ(index)));
    assert(ids[0] !== 0 && ids.every((id) => id === ids[0]), "Triangle must belong to exactly one nonzero logical pick ID");
    const xs = [i, i + 1, i + 2].map((index) => position.getX(index));
    assert(Math.max(...xs) - Math.min(...xs) < 10, "Merged paths must not create triangles across a distant gap");
  }
}

/** 仅检查逻辑状态和 CPU 生成的 GPU 缓冲, 不创建 renderer 或测试框架. */
export function runPrimitiveChecks(): string[] {
  const results: string[] = [],
    failures: string[] = [];
  const check = (name: string, operation: () => void) => {
    try {
      operation();
      results.push(name);
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  check("primitives: partial transform/hit merge, immutable input and snapshot", () => {
    const f = fixture();
    try {
      const points: [number, number][] = [
        [0, 0],
        [1, 1],
      ];
      const initialInvalidations = f.updates.invalidations;
      const line = f.primitives.addLine({
        layer: "main",
        points,
        color: "#ffffff",
        width: 2,
        transform: { position: [3, 4], rotation: 0.5, scale: [2, 3], height: 7 },
        hit: { priority: 4, tolerancePx: 5, alphaThreshold: 0.3 },
      });
      assert(f.updates.invalidations > initialInvalidations, "Creation must invalidate an otherwise idle Viewer");
      points[0][0] = 99;
      assert(line.getOptions().points[0][0] === 0, "Constructor must copy caller points");
      const position: [number, number] = [8, 9];
      line.update({ transform: { position }, hit: { tolerancePx: 2 } });
      position[0] = 99;
      const o = line.getOptions();
      assert(o.transform?.position?.[0] === 8 && o.transform.rotation === 0.5 && o.transform.height === 7 && o.transform.scale?.[1] === 3, "Partial transform must preserve omitted fields");
      assert(o.hit?.priority === 4 && o.hit.alphaThreshold === 0.3 && o.hit.tolerancePx === 2, "Partial hit must preserve omitted fields");
      assert(Object.isFrozen(o) && Object.isFrozen(o.points) && Object.isFrozen(o.points[0]), "Snapshot must be deeply protected");
      const nextPoints: [number, number][] = [
        [2, 3],
        [4, 5],
      ];
      line.setPoints(nextPoints);
      nextPoints[0][1] = 99;
      assert(line.getOptions().points[0][1] === 3, "setPoints must copy caller input");
      const version = line.version;
      line.update({ transform: { position: [8, 9] } });
      assert(line.version === version, "No-op update must not manufacture a version change");
      const hitRevision = f.registry.hitRevision;
      line.setParentMatrix(new Matrix4().makeTranslation(1, 0, 0), false);
      assert(!line.effectiveVisible && f.registry.hitRevision > hitRevision, "Simultaneous parent transform/visibility change must invalidate pending pick coverage");
    } finally {
      f.dispose();
    }
  });

  check("identity: duplicate rejection, failed construction recycling, disposed slot generation", () => {
    const f = fixture();
    try {
      throws(
        () =>
          f.primitives.addLine({
            id: "bad",
            layer: "main",
            points: [
              [0, 0],
              [1, 0],
            ],
            color: "#ffffff",
            width: -1,
          }),
        "Invalid constructor must fail",
      );
      assert(f.registry.list().length === 0, "Invalid constructor must not register a partial handle");
      const polygon = f.primitives.addPolygon({ id: "same", layer: "main", geometry: square, fill: "#ffffff" });
      assert(polygon.pickId === 1 && polygon.generation > 1, "Failed constructor must return its allocated pick slot");
      throws(() => f.primitives.addPolygon({ id: "same", layer: "main", geometry: square, fill: "#ff0000" }), "Duplicate logical IDs must fail");
      assert(f.registry.list().length === 1 && f.registry.get("same") === polygon, "Duplicate construction must keep the original handle");
      const oldId = polygon.pickId,
        oldGeneration = polygon.generation;
      polygon.dispose();
      polygon.dispose();
      const replacement = f.primitives.addPolygon({ id: "same", layer: "main", geometry: square, fill: "#00ff00" });
      assert(replacement.pickId === oldId && replacement.generation > oldGeneration, "Reused GPU slots need a new lifetime generation");
      throws(() => polygon.setPosition([9, 9]), "Disposed handle must not modify a replacement");
      assert(replacement.transform.position[0] === 0 && f.registry.byPickId(oldId) === replacement, "Old handle must not alias a replacement");
      for (const id of [1, 255, 256, 65535, 65536, 0xffffff]) assert(decode(...pickComponents(id)) === id, "RGB24 pick encoding must roundtrip");
    } finally {
      f.dispose();
    }
  });

  check("polygons: holes, MultiPolygon and invalid patch preserve previous geometry", () => {
    const f = fixture();
    try {
      const outer: Vec2[] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ];
      const hole: Vec2[] = [
        [2, 2],
        [4, 2],
        [4, 4],
        [2, 4],
      ];
      const geometry: PolygonGeometry = { type: "Polygon", polygon: { outer, holes: [hole] } };
      assert(near(area(triangulatePolygonGeometry(geometry, true)), 96), "Hole must subtract its area from the outer ring");
      const multi: PolygonGeometry = {
        type: "MultiPolygon",
        polygons: [
          geometry.polygon,
          {
            outer: [
              [20, 0],
              [22, 0],
              [22, 2],
              [20, 2],
            ],
          },
        ],
      };
      assert(near(area(triangulatePolygonGeometry(multi, true)), 100), "Disjoint exterior must add filled area rather than become a hole");
      assert(near(area(triangulatePolygonGeometry({ type: "Polygon", polygon: { outer: [...outer].reverse(), holes: [[...hole].reverse()] } }, true)), 96), "Ring orientation must not change filled area");
      throws(
        () =>
          triangulatePolygonGeometry(
            {
              type: "Polygon",
              polygon: {
                outer,
                holes: [
                  [
                    [20, 20],
                    [21, 20],
                    [21, 21],
                    [20, 21],
                  ],
                ],
              },
            },
            true,
          ),
        "Robust diagnostics must reject an exterior hole",
      );
      const polygon = f.primitives.addPolygon({ layer: "main", geometry, fill: "#ffffff" });
      const previous = polygon.getOptions(),
        version = polygon.version;
      throws(
        () =>
          polygon.setGeometry({
            type: "Polygon",
            polygon: {
              outer: [
                [0, 0],
                [1, 0],
                [2, 0],
              ],
            },
          }),
        "Degenerate polygon patch must fail",
      );
      assert(polygon.getOptions() === previous && polygon.version === version, "Invalid geometry patch must retain prior state and version");
      polygon.setGeometry({ type: "MultiPolygon", polygons: [] });
      assert(f.batches.build(context).children.length === 0, "Empty geometry must not leave old filled triangles");
    } finally {
      f.dispose();
    }
  });

  check("merged buffers: layer opacity refresh without handle version change", () => {
    const f = fixture();
    try {
      const polygon = f.primitives.addPolygon({ layer: "main", geometry: square, fill: "#808080", opacity: 0.8 });
      const first = f.batches.build(context).children[0] as Mesh;
      assert(near(first.geometry.getAttribute("aColor").getW(0), 0.8), "Initial alpha must use primitive opacity");
      const version = polygon.version;
      f.layers.get("main")!.update({ opacity: 0.5 });
      const second = f.batches.build(context).children[0] as Mesh;
      assert(polygon.version === version && near(second.geometry.getAttribute("aColor").getW(0), 0.4), "Layer-only alpha change must invalidate merged encoding");
      const linear = second.geometry.getAttribute("aColor").getX(0);
      assert(linear > 0.21 && linear < 0.22, "sRGB input color must be represented in linear RGB before shader output conversion");
      f.layers.get("main")!.setVisible(false);
      assert(f.batches.build(context).children.length === 0, "Hidden layer must remove its draw items");
      f.layers.get("main")!.update({ visible: true, opacity: 1 });
      assert(near((f.batches.build(context).children[0] as Mesh).geometry.getAttribute("aColor").getW(0), 0.8), "Layer restore must not reuse stale opacity");
    } finally {
      f.dispose();
    }
  });

  check("lines: disconnected batch triangles, dynamic topology and per-feature dash", () => {
    const f = fixture();
    try {
      const a = f.primitives.addLine({
        layer: "main",
        points: [
          [0, 0],
          [1, 0],
        ],
        color: "#ffffff",
        width: 2,
        dash: { length: 4, gap: 6 },
      });
      const b = f.primitives.addLine({
        layer: "main",
        points: [
          [100, 0],
          [101, 0],
        ],
        color: "#ff0000",
        width: 3,
        dash: { length: 5, gap: 7 },
      });
      let mesh = f.batches.build(context).children[0] as Mesh;
      assert(mesh.geometry.drawRange.count === 12, "Two independent straight paths must contain two separate strips");
      triangleIdentity(mesh);
      const dash = mesh.geometry.getAttribute("aDash") as BufferAttribute;
      assert(dash.getX(0) === 4 && dash.getY(0) === 6 && dash.getX(6) === 5 && dash.getY(6) === 7, "Dash attributes must remain per logical path");
      a.setPoints([
        [0, 0],
        [0, 0],
        [2, 0],
        [2, 1],
      ]);
      mesh = f.batches.build(context).children[0] as Mesh;
      triangleIdentity(mesh);
      assert(
        Object.values(mesh.geometry.attributes).every((attr) => [...attr.array].every(Number.isFinite)),
        "Repeated points and joins must not produce NaN",
      );
      a.setPoints([[0, 0]]);
      mesh = f.batches.build(context).children[0] as Mesh;
      assert(mesh.geometry.drawRange.count === 6, "Empty first path must not retain previous topology");
      triangleIdentity(mesh);
      const pick = mesh.geometry.getAttribute("aPickColor");
      assert(decode(pick.getX(0), pick.getY(0), pick.getZ(0)) === b.pickId, "Remaining path must keep its logical pick ID after buffer compaction");
      const lineBackend = new LineBatchBackend(),
        feature = f.batches.features(10).find((value) => value.handle === b)!;
      const encoded = lineBackend.encode({ ...feature, matrix: new Matrix4().makeScale(2, 1, 1) });
      assert(near(Math.max(...encoded.aDistance), 2), "Dash distance must follow the transformed world path length");
      lineBackend.dispose();
    } finally {
      f.dispose();
    }
  });

  check("lifecycle: throwing removal/dispose/event listeners do not block cleanup", () => {
    const f = fixture(),
      originalError = console.error;
    const removalError = new Error("intentional removal listener failure"),
      disposalError = new Error("intentional disposal listener failure"),
      eventError = new Error("intentional primitive event failure");
    const expected = new Set([removalError, disposalError, eventError]);
    // 只捕获本项刻意抛出的诊断, 不让 debug 页面把预期错误计为渲染失败.
    console.error = (...values: unknown[]) => {
      if (!values.some((value) => expected.has(value as Error))) originalError(...values);
    };
    try {
      const polygon = f.primitives.addPolygon({ layer: "main", geometry: square, fill: "#ffffff" });
      let removals = 0,
        disposals = 0,
        events = 0;
      f.registry.onRemoved(() => {
        throw removalError;
      });
      f.registry.onRemoved(() => {
        removals++;
      });
      polygon.onDispose(() => {
        throw disposalError;
      });
      polygon.onDispose(() => {
        disposals++;
      });
      polygon.on("select", () => {
        throw eventError;
      });
      polygon.on("select", () => {
        events++;
      });
      polygon.emit("select");
      assert(events === 1, "A failed event listener must not stop the next listener");
      const invalidations = f.updates.invalidations;
      polygon.dispose();
      assert(removals === 1 && disposals === 1 && !f.registry.get(polygon.id), "Failed removal/disposal listeners must not stop independent cleanup");
      assert(f.updates.invalidations > invalidations, "Removal must invalidate even when user listeners fail");
      polygon.emit("select");
      assert(events === 1, "Disposed listeners must have been released despite earlier failures");
    } finally {
      console.error = originalError;
      f.dispose();
    }
  });

  check("merged lifecycle: deleting the last queried primitive releases pick buffers", () => {
    const f = fixture();
    try {
      const polygon = f.primitives.addPolygon({ layer: "main", geometry: square, fill: "#ffffff" });
      const scene = f.batches.build({
        ...context,
        pass: "pick",
        pick: { centerCss: [1, 1], originPx: [0, 0], sizePx: [3, 3] },
      });
      const mesh = scene.children[0] as Mesh;
      let geometries = 0,
        materials = 0;
      mesh.geometry.addEventListener("dispose", () => {
        geometries++;
      });
      if (!Array.isArray(mesh.material))
        mesh.material.addEventListener("dispose", () => {
          materials++;
        });
      polygon.dispose();
      f.batches.build(context);
      assert(geometries === 1 && materials === 1, "Obsolete pick batches must release without waiting for a future nonempty pick query");
    } finally {
      f.dispose();
    }
  });

  if (failures.length) throw new Error(`Primitive checks failed:\n${failures.join("\n")}`);
  return results;
}
