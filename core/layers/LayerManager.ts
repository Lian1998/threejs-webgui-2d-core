import type { DeepReadonly, LayerOptions } from "../contracts";
import { copyValue, finite } from "../primitives/PrimitiveHandle";
import type { PrimitiveRegistry } from "../primitives/PrimitiveRegistry";

/** 单层状态的受控入口, 更新后让 LayerManager 提升 revision 并触发重绘. */
export class LayerHandle {
  private disposed = false;
  constructor(
    readonly id: string,
    private options: LayerOptions,
    private changed: () => void,
  ) {}
  getOptions(): DeepReadonly<LayerOptions> {
    return Object.freeze({ ...this.options });
  }
  update(patch: Partial<Omit<LayerOptions, "id">>): this {
    if (this.disposed) throw new Error(`图层 ${this.id} 已移除.`);
    if ("id" in patch) throw new Error("图层 ID 不可修改.");
    const options = { ...this.options, ...copyValue(patch) };
    validateLayer(options);
    if (Object.keys(patch).every((key) => options[key] === this.options[key])) return this;
    this.options = options;
    this.changed();
    return this;
  }
  setVisible(visible: boolean): this {
    return this.update({ visible });
  }
  /** @internal 由 LayerManager 在移除或销毁时作废 handle. */
  dispose(): void {
    this.disposed = true;
  }
}
function validateLayer(o: LayerOptions): void {
  if (!o.id) throw new Error("图层 ID 不能为空.");
  finite(o.order, "layer.order");
  finite(o.opacity ?? 1, "layer.opacity");
  if ((o.opacity ?? 1) < 0 || (o.opacity ?? 1) > 1) throw new Error("图层 opacity 需要在 [0,1] 范围内.");
  for (const key of ["minScale", "maxScale"])
    if (o[key] !== undefined) {
      finite(o[key], key);
      if (o[key] < 0) throw new Error(`${key} 不能为负数.`);
    }
  if (o.minScale !== undefined && o.maxScale !== undefined && o.minScale >= o.maxScale) throw new Error("图层 scale 区间无效.");
}
/** 逻辑图层索引, 计算显隐, LOD, 透明度和画家顺序.
 * 图层不是 Three.Group, order 也不编码为物理高度, 由 BatchManager 统一排序. */
export class LayerManager {
  private layers = new Map<string, LayerHandle>();
  private listeners = new Set<() => void>();
  private disposed = false;
  revision = 0;
  constructor(
    private registry: PrimitiveRegistry,
    private invalidate: () => void,
  ) {}
  add(options: LayerOptions): LayerHandle {
    if (this.disposed) throw new Error("图层管理器已销毁.");
    validateLayer(options);
    if (this.layers.has(options.id)) throw new Error(`图层 ${options.id} 已存在.`);
    const layer = new LayerHandle(options.id, { visible: true, pickable: true, opacity: 1, ...copyValue(options) }, () => this.change());
    this.layers.set(options.id, layer);
    this.change();
    return layer;
  }
  get(id: string): LayerHandle | undefined {
    return this.layers.get(id);
  }
  list(): readonly LayerHandle[] {
    return [...this.layers.values()];
  }
  assert(id: string): void {
    if (!this.layers.has(id)) throw new Error(`图层 ${id} 尚未注册.`);
  }
  effective(id: string, scale: number): { visible: boolean; pickable: boolean; opacity: number; order: number } {
    const o = this.layers.get(id)?.getOptions();
    if (!o) return { visible: false, pickable: false, opacity: 0, order: 0 };
    return {
      visible: o.visible !== false && scale >= (o.minScale ?? 0) && scale < (o.maxScale ?? Infinity),
      pickable: o.pickable !== false,
      opacity: o.opacity ?? 1,
      order: o.order,
    };
  }
  remove(id: string, options: { disposePrimitives?: boolean } = {}): void {
    const primitives = this.registry.list().filter((handle) => handle.getOptions().layer === id);
    if (primitives.length && !options.disposePrimitives) throw new Error(`图层 ${id} 非空, 请先移除图元.`);
    primitives.forEach((handle) => handle.dispose());
    this.layers.get(id)?.dispose();
    if (this.layers.delete(id)) this.change();
  }
  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private change(): void {
    this.revision++;
    this.invalidate();
    for (const cb of [...this.listeners]) {
      try {
        cb();
      } catch (error) {
        console.error(error);
      }
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.layers.forEach((layer) => layer.dispose());
    this.layers.clear();
    this.listeners.clear();
  }
}
