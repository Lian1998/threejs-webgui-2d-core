import * as THREE from "three";
import type { PickQuery, PrimitiveKind, PrimitiveRenderBackend, RenderContext, RenderFeature, Vec2 } from "../contracts";
import type { LayerManager } from "../layers/LayerManager";
import type { BasePrimitive } from "../primitives/PrimitiveHandle";
import type { PrimitiveRegistry } from "../primitives/PrimitiveRegistry";

export function comparePaint(a: RenderFeature, b: RenderFeature): number {
  return a.paintKey.layerOrder - b.paintKey.layerOrder || a.paintKey.primitiveOrder - b.paintKey.primitiveOrder || a.paintKey.insertionSequence - b.paintKey.insertionSequence;
}
/** 把逻辑图元转换为 RenderFeature, 统一应用图层和父变换后排序.
 * 仅把连续同类区段交给后端, 最终将 Mesh 按 renderOrder 放入颜色或拾取 Scene. */
export class BatchManager {
  readonly colorScene = new THREE.Scene();
  readonly pickScene = new THREE.Scene();
  private backends = new Map<PrimitiveKind, PrimitiveRenderBackend>();
  private unsubscribe: () => void;
  constructor(
    private registry: PrimitiveRegistry,
    private layers: LayerManager,
  ) {
    this.unsubscribe = registry.onRemoved((handle) => this.backends.get(handle.kind)?.remove(handle.id));
  }
  register(backend: PrimitiveRenderBackend): void {
    if (this.backends.has(backend.kind)) throw new Error(`图元后端 ${backend.kind} 已存在.`);
    this.backends.set(backend.kind, backend);
  }
  prepare(handle: BasePrimitive<any>): Promise<void> {
    return this.backends.get(handle.kind)?.prepare(handle) ?? Promise.resolve();
  }
  /** 将 handle 快照与图层有效值组合, 不创建几何, 拾取过滤只改变 pickable. */
  features(scale: number, query?: PickQuery): RenderFeature[] {
    return this.registry
      .list()
      .map((handle) => {
        const options = handle.getOptions(),
          layer = this.layers.effective(options.layer, scale);
        return {
          handle,
          options,
          matrix: handle.getEffectiveMatrix(),
          opacity: (options.opacity ?? 1) * layer.opacity,
          visible: layer.visible && handle.effectiveVisible,
          pickable: layer.pickable && options.pickable !== false && (!query?.layers || query.layers.includes(options.layer)),
          pickId: handle.pickId,
          hit: handle.hit,
          version: handle.version,
          paintKey: {
            layerOrder: layer.order,
            primitiveOrder: options.order ?? 0,
            insertionSequence: handle.insertionSequence,
          },
          dirty: this.registry.dirtyFor(handle.id),
        } as RenderFeature;
      })
      .filter((feature) => feature.visible && feature.opacity > 0);
  }
  /** 颜色按画家顺序排列, 拾取先按 priority 排列; 后端自行处理同类区段的纹理和容量拆分. */
  build(context: RenderContext, candidates?: readonly RenderFeature[]): THREE.Scene {
    const scene = context.pass === "color" ? this.colorScene : this.pickScene;
    scene.clear();
    const features = [...(candidates ?? this.features(context.scale))];
    features.sort(context.pass === "pick" ? (a, b) => a.hit.priority - b.hit.priority || comparePaint(a, b) : comparePaint);
    this.backends.forEach((backend) => backend.beginFrame(context.pass));
    let index = 0,
      order = 0;
    while (index < features.length) {
      const kind = features[index].handle.kind,
        start = index;
      while (index < features.length && features[index].handle.kind === kind) index++;
      const run = features.slice(start, index),
        backend = this.backends.get(kind);
      if (!backend) continue;
      // 仅连续区段合批, 不跨过其他类型的图元破坏画家顺序.
      const items = backend.build(`${context.pass}:${kind}:${run[0].handle.id}`, run, context);
      for (const item of items) {
        item.object.renderOrder = order++;
        scene.add(item.object);
      }
    }
    this.backends.forEach((backend) => backend.endFrame(context.pass));
    return scene;
  }
  statistics(): { bytes: number; ranges: number; rebuiltBatches: number; batches: number; utilization: number } {
    const stats = { bytes: 0, ranges: 0, rebuiltBatches: 0, batches: this.colorScene.children.length, utilization: 0 };
    let observed = 0;
    for (const object of this.colorScene.children) {
      const geometry = (object as THREE.Mesh).geometry;
      if (!geometry) continue;
      const instanced = geometry as THREE.InstancedBufferGeometry;
      const capacity = instanced.isInstancedBufferGeometry ? geometry.getAttribute("aMatrix")?.count : geometry.getAttribute("position")?.count;
      const count = instanced.isInstancedBufferGeometry ? instanced.instanceCount : geometry.drawRange.count;
      if (!capacity || !Number.isFinite(count)) continue;
      // 先计算每批容量利用率再取平均, 不将顶点数与实例数当成同一种容量累加.
      stats.utilization += Math.min(1, count / capacity);
      observed++;
    }
    if (observed) stats.utilization /= observed;
    this.backends.forEach((backend) => {
      stats.bytes += backend.stats.bytes;
      stats.ranges += backend.stats.ranges;
      stats.rebuiltBatches += backend.stats.rebuiltBatches;
    });
    return stats;
  }
  bounds(feature: RenderFeature, scale: number): readonly [Vec2, Vec2] {
    const backend = this.backends.get("text") as PrimitiveRenderBackend & {
      getLayout?(id: string):
        | {
            rect: readonly [number, number, number, number];
            glyphs: readonly { rect: readonly [number, number, number, number] }[];
          }
        | undefined;
    };
    const layout = feature.handle.kind === "text" ? backend?.getLayout?.(feature.handle.id) : undefined;
    return featureBounds(feature, scale, layout ? [layout.rect, ...layout.glyphs.map((glyph) => glyph.rect)] : undefined);
  }
  contextRestored(): void {
    this.backends.forEach((backend) => backend.contextRestored());
  }
  dispose(): void {
    this.unsubscribe();
    this.backends.forEach((backend) => backend.dispose());
    this.backends.clear();
    this.colorScene.clear();
    this.pickScene.clear();
  }
}

/** 仅作候选裁剪, 最终仍由共享 shader 的 coverage 决定是否命中. */
export function featureBounds(feature: RenderFeature, scale: number, textRects?: readonly (readonly [number, number, number, number])[]): readonly [Vec2, Vec2] {
  const o = feature.options as any,
    points: Vec2[] = [];
  let padding = 0;
  if (feature.handle.kind === "polygon") {
    const polygons = o.geometry.type === "Polygon" ? [o.geometry.polygon] : o.geometry.polygons;
    polygons.forEach((polygon: any) => points.push(...polygon.outer));
  } else if (feature.handle.kind === "line") {
    points.push(...o.points);
    padding = ((o.width ?? 0) / ((o.widthMode ?? "screen") === "screen" ? scale : 1)) * (o.miterLimit ?? 4);
  } else if (feature.handle.kind === "text" && textRects) {
    const unit = (o.sizeMode ?? "world") === "screen" ? 1 / scale : 1;
    for (const [x, y, w, h] of textRects) points.push([x * unit, y * unit], [(x + w) * unit, y * unit], [(x + w) * unit, (y + h) * unit], [x * unit, (y + h) * unit]);
  } else {
    let width: number, height: number;
    const unit = (o.sizeMode ?? "world") === "screen" ? 1 / scale : 1;
    if (feature.handle.kind === "sprite") {
      width = o.size[0] * unit;
      height = o.size[1] * unit;
    } else {
      const lines = o.text.split(/\r?\n/);
      width = (Math.max(1, ...lines.map((line: string) => line.length)) * o.fontSize * 2 + (o.padding?.[1] ?? 0) + (o.padding?.[3] ?? 0)) * unit;
      height = (Math.max(1, o.text.length) * (o.lineHeight ?? o.fontSize * 1.5) + (o.padding?.[0] ?? 0) + (o.padding?.[2] ?? 0)) * unit;
      padding = (o.outline?.width ?? 0) * unit;
    }
    const anchor = o.anchor ?? [0.5, 0.5];
    points.push([-anchor[0] * width, -anchor[1] * height], [(1 - anchor[0]) * width, -anchor[1] * height], [(1 - anchor[0]) * width, (1 - anchor[1]) * height], [-anchor[0] * width, (1 - anchor[1]) * height]);
  }
  if (!points.length)
    return [
      [Infinity, Infinity],
      [-Infinity, -Infinity],
    ];
  const v = new THREE.Vector3(),
    min: [number, number] = [Infinity, Infinity],
    max: [number, number] = [-Infinity, -Infinity];
  for (const p of points) {
    v.set(p[0], 0, -p[1]).applyMatrix4(feature.matrix);
    min[0] = Math.min(min[0], v.x);
    min[1] = Math.min(min[1], -v.z);
    max[0] = Math.max(max[0], v.x);
    max[1] = Math.max(max[1], -v.z);
  }
  return [
    [min[0] - padding, min[1] - padding],
    [max[0] + padding, max[1] + padding],
  ];
}
