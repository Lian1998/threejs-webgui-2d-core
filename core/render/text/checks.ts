import * as THREE from "three";
import type { PrimitiveHandle, RenderContext, RenderFeature, ResourceLease, TextOptions, UploadStats } from "../../contracts";
import type { GlyphAtlas, GlyphRegion } from "../../resources/fonts/GlyphAtlas";
import { MAX_QUAD_INSTANCES, QuadBatch, type QuadInstance } from "../sprites/QuadBatch";
import { TextBatchBackend } from "./TextBatchBackend";
import { layoutText } from "./layoutText";

function assert(value: unknown, message: string): void {
  if (!value) throw new Error(`Sprite/text check failed: ${message}`);
}

/** 少量 CPU 检查验证上传, 失败释放与分块. GPU coverage 由独立 debug 页面验证. */
export async function runSpriteTextChecks(): Promise<string[]> {
  const results: string[] = [];
  const context: RenderContext = {
    pass: "color",
    scale: 10,
    dpr: 1,
    cssSize: [800, 600],
    drawingBufferSize: [800, 600],
  };
  const stats: UploadStats = { bytes: 0, ranges: 0, rebuiltBatches: 0 };
  const batch = new QuadBatch("check", "text", undefined, stats);
  const instance: QuadInstance = {
    primitiveId: "check",
    matrix: new THREE.Matrix4().elements,
    rect: [-2, -3, 4, 6],
    uv: [0, 0, 1, 1],
    color: [1, 0.5, 0.25, 0.8],
    pick: [1 / 255, 0, 0],
    hit: [0.1, 0],
    style: [0, 1, 0.75, 0.1],
    outline: [0, 0, 0],
    bounds: 0,
    type: 1,
  };
  batch.sync([instance], context);
  const fullBytes = Object.values(batch.mesh.geometry.attributes).reduce((bytes, attribute) => bytes + attribute.array.byteLength, batch.mesh.geometry.index!.array.byteLength);
  assert(stats.bytes === fullBytes + 4, "initial allocation includes unused capacity, shared quad/index and fallback texture");
  batch.sync([instance], context);
  assert(stats.bytes === fullBytes + 4, "unchanged quad requests no upload");
  batch.sync([{ ...instance, color: [0.2, 0.3, 0.4, 0.5] }], context);
  assert(stats.bytes === fullBytes + 4 + 16, "one color writes one vec4");
  batch.contextRestored();
  assert(stats.bytes === (fullBytes + 4) * 2 + 16, "context restore submits every attribute, index and fallback texture");
  const scene = new THREE.Scene();
  scene.add(batch.mesh);
  let geometryDisposals = 0,
    materialDisposals = 0;
  batch.mesh.geometry.addEventListener("dispose", () => geometryDisposals++);
  batch.material.addEventListener("dispose", () => materialDisposals++);
  batch.sync([instance, { ...instance, primitiveId: "other" }], context);
  assert(!batch.removePrimitive("check") && batch.removePrimitive("other"), "partial members survive until the last primitive is removed");
  batch.dispose();
  batch.dispose();
  assert(scene.children.length === 0 && geometryDisposals === 1 && materialDisposals === 1, "last-member disposal detaches mesh and is idempotent");
  results.push("quad: initial/restore bytes, no-op update, color range, member lifetime");

  let references = 0;
  const texture = new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat);
  const atlas = {
    flush: () => 0,
    contextRestored: () => {},
    acquire: async (font: string, character: string): Promise<ResourceLease<GlyphRegion>> => {
      if (character === "!") throw new Error("Glyph check failure");
      references++;
      let released = false;
      const value: GlyphRegion = {
        fontId: font,
        glyph: character,
        bindingKey: "check",
        page: 0,
        uv: [0, 0, 1, 1],
        advance: character === " " ? 20 : 40,
        bearing: [0, 48],
        inkSize: character === " " ? [0, 0] : [40, 64],
        bitmapSize: [72, 96],
        sdfPadding: 16,
        rasterSize: 64,
        radius: 16,
        cutoff: 0.25,
        texture,
        fallback: false,
      };
      return {
        value,
        release: () => {
          if (!released) {
            released = true;
            references--;
          }
        },
      };
    },
  } as unknown as GlyphAtlas;
  let options: TextOptions = {
    layer: "check",
    text: "A B\n国",
    font: "check",
    fontSize: 4,
    lineHeight: 5,
    padding: [1, 2, 3, 4],
  };
  const layout = await layoutText(options, atlas);
  assert(layout.glyphs.length === 3 && layout.size[0] === 12.25 && Math.abs(layout.size[1] - 13.2) < 1e-6, "advance, spaces, baseline, padding and line height");
  layout.leases.forEach((lease) => lease.release());
  let failed = false;
  try {
    await layoutText({ ...options, text: "A!B" }, atlas);
  } catch {
    failed = true;
  }
  assert(failed && references === 0, "partial glyph failure releases successful requests");
  results.push("layout: metrics and partial acquisition cleanup");

  options = {
    layer: "check",
    text: "A".repeat(MAX_QUAD_INSTANCES + 1),
    font: "check",
    fontSize: 2,
    background: { color: "#000000", opacity: 0.5, radius: 0.2 },
  };
  const handle = {
    id: "chunk-label",
    kind: "text",
    disposed: false,
    getOptions: () => structuredClone(options),
  } as unknown as PrimitiveHandle<TextOptions>;
  const backend = new TextBatchBackend(atlas);
  try {
    await backend.prepare(handle);
    const layouts = backend.snapshot().layouts;
    const initialRect = backend.getLayout(handle.id)!.rect;
    options = { ...options, transform: { position: [3, 4] }, color: "#123456", opacity: 0.75 };
    await backend.prepare(handle);
    assert(backend.snapshot().layouts === layouts, "transform, color and opacity do not relayout a label");
    options = { ...options, anchor: [0, 0] };
    await backend.prepare(handle);
    const anchoredRect = backend.getLayout(handle.id)!.rect;
    assert(backend.snapshot().layouts === layouts + 1 && anchoredRect[0] === 0 && anchoredRect[1] === 0 && initialRect[0] < 0 && initialRect[1] < 0, "anchor changes layout origin while preserving its size");
    assert(anchoredRect[2] === initialRect[2] && anchoredRect[3] === initialRect[3], "anchor preserves label dimensions");
    const feature: RenderFeature = {
      handle,
      options,
      matrix: new THREE.Matrix4(),
      opacity: 1,
      visible: true,
      pickable: true,
      pickId: 3,
      hit: { mode: "visible", alphaThreshold: 0.1, tolerancePx: 0, priority: 0 },
      version: 0,
      dirty: new Set(),
      paintKey: { layerOrder: 0, primitiveOrder: 0, insertionSequence: 0 },
    };
    backend.beginFrame("color");
    const items = backend.build("check", [feature], context);
    backend.endFrame("color");
    assert(items.length === 2, "long label is split into bounded continuous quad batches");
    assert((items[0].object as THREE.Mesh).geometry instanceof THREE.InstancedBufferGeometry, "text uses instanced quads");
    assert(((items[0].object as THREE.Mesh).geometry as THREE.InstancedBufferGeometry).instanceCount === MAX_QUAD_INSTANCES, "first chunk obeys limit");
    assert(((items[1].object as THREE.Mesh).geometry as THREE.InstancedBufferGeometry).instanceCount === 2, "background and remaining glyph preserve order");
    assert(
      items.every((item) => item.primitiveIds.length === 1 && item.primitiveIds[0] === handle.id),
      "chunks retain one logical label identity",
    );
    backend.beginFrame("pick");
    const pickItems = backend.build("check", [{ ...feature, hit: { ...feature.hit, mode: "bounds" } }], {
      ...context,
      pass: "pick",
    });
    backend.endFrame("pick");
    assert(pickItems.length === 1 && ((pickItems[0].object as THREE.Mesh).geometry as THREE.InstancedBufferGeometry).instanceCount === 1, "bounds pass uses full label rectangle");
    const batchScene = new THREE.Scene();
    let disposedGeometry = 0,
      disposedMaterial = 0,
      disposedTexture = 0;
    texture.addEventListener("dispose", () => disposedTexture++);
    for (const item of [...items, ...pickItems]) {
      const mesh = item.object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      batchScene.add(mesh);
      mesh.geometry.addEventListener("dispose", () => disposedGeometry++);
      mesh.material.addEventListener("dispose", () => disposedMaterial++);
    }
    backend.remove(handle.id);
    assert(backend.snapshot().batches === 0 && batchScene.children.length === 0, "last label removes color, pick and all chunk batches immediately");
    assert(disposedGeometry === 3 && disposedMaterial === 3 && disposedTexture === 0, "all private buffers/materials released, shared atlas texture preserved");
  } finally {
    backend.dispose();
    texture.dispose();
  }
  assert(references === 0, "backend disposal releases glyph leases");
  results.push("text: pose/style cache, anchor layout, bounded chunks, logical IDs, bounds rectangle and last-label cleanup");
  return results;
}
