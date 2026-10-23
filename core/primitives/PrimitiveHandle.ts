import * as THREE from "three";
import type { CommonOptions, DeepReadonly, DirtyKind, HitPolicy, PrimitiveEvent, PrimitiveEventType, PrimitiveHandle, PrimitiveKind, PrimitiveOptions, PrimitivePatch, Transform2D, Vec2 } from "../contracts";
import { triangulatePolygonGeometry } from "./polygons/triangulate";

export interface PrimitiveContext {
  validateLayer(id: string): void;
  changed(handle: BasePrimitive<any>, dirty: ReadonlySet<DirtyKind>): void;
  removed(handle: BasePrimitive<any>): void;
  onError?(error: unknown): void;
}
export function copyValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(copyValue) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copyValue(entry)])) as T;
  return value;
}
function freezeValue<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeValue);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
export function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} 必须为有限数值.`);
}
export function tuple(value: Vec2, name: string): void {
  if (!Array.isArray(value) || value.length !== 2) throw new Error(`${name} 必须为二元坐标.`);
  value.forEach((v, i) => finite(v, `${name}[${i}]`));
}
function nonnegative(value: number, name: string): void {
  finite(value, name);
  if (value < 0) throw new Error(`${name} 不能为负数.`);
}
function positive(value: number, name: string): void {
  finite(value, name);
  if (value <= 0) throw new Error(`${name} 必须大于 0.`);
}
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => sameValue(a[key], b[key]));
}

/** 稳定的业务 handle, 保存经过校验的不可变选项, 事件和生命周期.
 * 不拥有 Mesh. update 按字段分类脏状态, Matrix4 在渲染侧读取时才按需重算. */
export class BasePrimitive<T extends PrimitiveOptions = PrimitiveOptions> implements PrimitiveHandle<T> {
  readonly id: string;
  readonly kind: PrimitiveKind;
  readonly insertionSequence: number;
  readonly pickId: number;
  readonly generation: number;
  version = 0;
  disposed = false;
  private options: T;
  private matrix = new THREE.Matrix4();
  private localMatrix = new THREE.Matrix4();
  private parentMatrix: THREE.Matrix4 | null = null;
  private parentVisible = true;
  private matrixDirty = true;
  private listeners = new Map<PrimitiveEventType, Set<(event: PrimitiveEvent) => void>>();
  private disposal = new Set<() => void>();
  private readiness: Promise<void> = Promise.resolve();

  constructor(
    kind: PrimitiveKind,
    options: T,
    identity: { id: string; sequence: number; pickId: number; generation: number },
    private context: PrimitiveContext,
  ) {
    this.kind = kind;
    this.id = identity.id;
    this.insertionSequence = identity.sequence;
    this.pickId = identity.pickId;
    this.generation = identity.generation;
    const normalized = {
      ...copyValue(options),
      id: this.id,
      order: options.order ?? 0,
      visible: options.visible ?? true,
      pickable: options.pickable ?? true,
      opacity: options.opacity ?? 1,
      transform: { position: [0, 0], rotation: 0, scale: [1, 1], height: 0, ...copyValue(options.transform ?? {}) },
      hit: { mode: "visible", alphaThreshold: 0.1, tolerancePx: 0, priority: 0, ...copyValue(options.hit ?? {}) },
    } as T;
    this.validate(normalized, new Set(Object.keys(normalized)));
    this.options = freezeValue(normalized) as T;
  }
  get transform(): DeepReadonly<Transform2D> {
    return this.options.transform as Transform2D;
  }
  get hit(): HitPolicy {
    return this.options.hit as HitPolicy;
  }
  get effectiveVisible(): boolean {
    return this.parentVisible && this.options.visible !== false;
  }
  getOptions(): DeepReadonly<T> {
    return this.options as DeepReadonly<T>;
  }
  /** 先构造并校验候选状态, 成功后才替换快照; transform/hit 合并子字段, 其余字段替换. */
  update(patch: PrimitivePatch<T>): this {
    this.assertAlive();
    if ("id" in patch) throw new Error("图元 ID 创建后不可修改.");
    if (this.parentMatrix && (("ownerId" in patch && patch.ownerId !== this.options.ownerId) || ("partId" in patch && patch.partId !== this.options.partId))) throw new Error("组合部件的归属需要通过 EntityView 修改.");
    const keys = new Set(Object.keys(patch));
    const candidate = {
      ...this.options,
      ...copyValue(patch),
      transform: { ...this.options.transform, ...copyValue(patch.transform ?? {}) },
      hit: { ...this.options.hit, ...copyValue(patch.hit ?? {}) },
    } as T;
    this.validate(candidate, keys);
    const changed = [...keys].filter((key) => !sameValue(this.options[key], candidate[key]));
    if (!changed.length) return this;
    this.options = freezeValue(candidate) as T;
    const dirty = new Set<DirtyKind>();
    for (const key of changed) {
      if (key === "transform") {
        dirty.add("transform");
        this.matrixDirty = true;
      } else if (["geometry", "points", "closed", "cap", "join", "text", "fontSize", "lineHeight", "letterSpacing", "maxWidth", "padding", "align"].includes(key)) dirty.add("geometry");
      else if (key === "anchor" && this.kind === "text") dirty.add("geometry");
      else if (["image", "font"].includes(key)) dirty.add("resource");
      else if (["layer", "order", "ownerId", "partId", "hit", "pickable"].includes(key)) dirty.add("order");
      else if (key === "visible") dirty.add("visibility");
      else dirty.add("style");
    }
    this.version++;
    this.context.changed(this, dirty);
    return this;
  }
  setPosition(position: Vec2): this {
    return this.update({ transform: { position } } as PrimitivePatch<T>);
  }
  setRotation(rotation: number): this {
    return this.update({ transform: { rotation } } as PrimitivePatch<T>);
  }
  setVisible(visible: boolean): this {
    return this.update({ visible } as PrimitivePatch<T>);
  }
  /** 按需计算 parent * local, 逻辑 y 映射为 -Z, 正 rotation 对应绕 +Y 旋转. */
  getEffectiveMatrix(): THREE.Matrix4 {
    if (this.matrixDirty) {
      const t = this.transform;
      this.localMatrix.compose(new THREE.Vector3(t.position[0], t.height, -t.position[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rotation), new THREE.Vector3(t.scale[0], 1, t.scale[1]));
      this.matrix.copy(this.localMatrix);
      if (this.parentMatrix) this.matrix.premultiply(this.parentMatrix);
      this.matrixDirty = false;
    }
    return this.matrix;
  }
  setParentMatrix(matrix: THREE.Matrix4 | null, parentVisible = true): void {
    this.assertAlive();
    const matrixChanged = Boolean(matrix) !== Boolean(this.parentMatrix) || Boolean(matrix && this.parentMatrix && !matrix.equals(this.parentMatrix));
    const visibilityChanged = parentVisible !== this.parentVisible;
    if (!matrixChanged && !visibilityChanged) return;
    this.parentMatrix = matrix?.clone() ?? null;
    this.parentVisible = parentVisible;
    this.matrixDirty = true;
    const dirty = new Set<DirtyKind>();
    if (matrixChanged) dirty.add("transform");
    if (visibilityChanged) dirty.add("visibility");
    this.version++;
    this.context.changed(this, dirty);
  }
  setReady(promise: Promise<void>): void {
    this.readiness = promise;
    // 加载失败由 ready() 暴露, 避免用户未等待时产生未处理 rejection.
    void promise.catch(() => {});
  }
  /** 等待最新一次图片或文字准备任务, 不代表已完成 GPU 绘制或像素读回. */
  ready(): Promise<void> {
    return this.readiness;
  }
  touch(kind: DirtyKind = "style"): void {
    if (!this.disposed) {
      this.version++;
      this.context.changed(this, new Set([kind]));
    }
  }
  on(type: PrimitiveEventType, listener: (event: PrimitiveEvent) => void): () => void {
    this.assertAlive();
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    return () => set.delete(listener);
  }
  onDispose(listener: () => void): () => void {
    this.assertAlive();
    this.disposal.add(listener);
    return () => this.disposal.delete(listener);
  }
  emit(type: PrimitiveEventType, hit?: PrimitiveEvent["hit"], nativeEvent?: PrimitiveEvent["nativeEvent"]): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      try {
        listener({ type, target: this, hit, nativeEvent });
      } catch (error) {
        this.report(error);
      }
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // 先通知选择系统, 此时事件监听器仍可接收最后一次 leave/deselect.
    try {
      this.context.removed(this);
    } catch (error) {
      this.report(error);
    }
    for (const listener of [...this.disposal]) {
      try {
        listener();
      } catch (error) {
        this.report(error);
      }
    }
    this.disposal.clear();
    this.listeners.clear();
    this.parentMatrix = null;
  }
  private assertAlive(): void {
    if (this.disposed) throw new Error(`图元 ${this.id} 已销毁.`);
  }
  private report(error: unknown): void {
    try {
      if (this.context.onError) this.context.onError(error);
      else console.error(error);
    } catch (reportError) {
      console.error(reportError);
    }
  }
  private validate(options: T, keys: Set<string>): void {
    this.context.validateLayer(options.layer);
    if (!options.layer || typeof options.layer !== "string") throw new Error("图元 layer 必须为已注册 ID.");
    finite(options.order ?? 0, "order");
    nonnegative(options.opacity ?? 1, "opacity");
    if ((options.opacity ?? 1) > 1) throw new Error("opacity 不能大于 1.");
    const t = options.transform as Transform2D,
      hit = options.hit as HitPolicy;
    tuple(t.position, "position");
    tuple(t.scale, "scale");
    finite(t.rotation, "rotation");
    finite(t.height, "height");
    nonnegative(hit.alphaThreshold, "alphaThreshold");
    if (hit.alphaThreshold > 1) throw new Error("alphaThreshold 不能大于 1.");
    nonnegative(hit.tolerancePx, "tolerancePx");
    finite(hit.priority, "priority");
    if (!["visible", "bounds"].includes(hit.mode) || (hit.mode === "bounds" && !["sprite", "text"].includes(this.kind))) throw new Error("该图元不支持指定的拾取模式.");
    const o = options as any;
    if (this.kind === "polygon" && keys.has("geometry")) {
      if (!["Polygon", "MultiPolygon"].includes(o.geometry?.type)) throw new Error("多边形类型无效.");
      const polygons = o.geometry.type === "Polygon" ? [o.geometry.polygon] : o.geometry.polygons;
      for (const polygon of polygons) {
        for (const ring of [polygon.outer, ...(polygon.holes ?? [])]) {
          ring.forEach((p: Vec2) => tuple(p, "polygon point"));
          if (ring.length && new Set(ring.map((p: Vec2) => `${p[0]},${p[1]}`)).size < 3) throw new Error("多边形环至少需要三个不同顶点.");
        }
        if (!polygon.outer.length && polygon.holes?.some((r: Vec2[]) => r.length)) throw new Error("空外环不能含孔洞.");
      }
      triangulatePolygonGeometry(o.geometry);
    }
    if (this.kind === "line") {
      if (keys.has("points")) o.points.forEach((p: Vec2) => tuple(p, "line point"));
      nonnegative(o.width, "width");
      positive(o.miterLimit ?? 4, "miterLimit");
      if (o.dash) {
        nonnegative(o.dash.length, "dash.length");
        nonnegative(o.dash.gap, "dash.gap");
        finite(o.dash.offset ?? 0, "dash.offset");
      }
    }
    if (this.kind === "sprite") {
      tuple(o.size, "size");
      o.size.forEach((v: number) => positive(v, "size"));
      if (!o.image) throw new Error("image ID 不能为空.");
    }
    if (this.kind === "text") {
      positive(o.fontSize, "fontSize");
      if (!o.font || typeof o.text !== "string") throw new Error("文字需要 font ID 和字符串 text.");
      if (o.lineHeight !== undefined) positive(o.lineHeight, "lineHeight");
      if (o.maxWidth !== undefined) positive(o.maxWidth, "maxWidth");
      finite(o.letterSpacing ?? 0, "letterSpacing");
      if (o.padding !== undefined && (!Array.isArray(o.padding) || o.padding.length !== 4)) throw new Error("padding 必须为 [上,右,下,左] 四元数组.");
      (o.padding ?? []).forEach((v: number) => nonnegative(v, "padding"));
      if (o.outline) nonnegative(o.outline.width, "outline.width");
      if (o.background) {
        nonnegative(o.background.radius, "background.radius");
        nonnegative(o.background.opacity, "background.opacity");
        if (o.background.opacity > 1) throw new Error("background.opacity 不能大于 1.");
      }
    }
    if (o.anchor) {
      tuple(o.anchor, "anchor");
      if (o.anchor.some((v: number) => v < 0 || v > 1)) throw new Error("anchor 需要在 [0,1] 范围内.");
    }
    for (const key of ["sizeMode", "widthMode"]) if (o[key] !== undefined && !["world", "screen"].includes(o[key])) throw new Error(`${key} 无效.`);
  }
}
