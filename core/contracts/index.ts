import type { Matrix4, Object3D } from "three";

export type Vec2 = readonly [number, number];
export type PrimitiveId = string;
export type EntityId = string;
export type LayerId = string;
export type ColorInput = string | number;
export type SizeMode = "world" | "screen";
export type PrimitiveKind = "polygon" | "line" | "sprite" | "text";
export type DirtyKind = "transform" | "style" | "geometry" | "resource" | "order" | "visibility";
export type RenderPassKind = "color" | "pick";
export type DeepReadonly<T> = T extends (...args: any[]) => any ? T : T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } : T;

export interface Transform2D {
  position: Vec2;
  rotation: number;
  scale: Vec2;
  height: number;
}
export interface HitPolicy {
  mode: "visible" | "bounds";
  alphaThreshold: number;
  tolerancePx: number;
  priority: number;
}
export interface CommonOptions {
  id?: PrimitiveId;
  layer: LayerId;
  ownerId?: EntityId;
  partId?: string;
  order?: number;
  transform?: Partial<Transform2D>;
  visible?: boolean;
  pickable?: boolean;
  opacity?: number;
  hit?: Partial<HitPolicy>;
}
export type PrimitivePatch<T extends CommonOptions> = Partial<Omit<T, "id" | "transform" | "hit">> & {
  transform?: Partial<Transform2D>;
  hit?: Partial<HitPolicy>;
};
export type PrimitiveEventType = "pointerenter" | "pointerleave" | "select" | "deselect" | "dblclick";
export interface PickResult {
  primitiveId: string;
  ownerId?: string;
  partId?: string;
  layerId: string;
  screen: Vec2;
  world: Vec2;
}
export interface PrimitiveEvent {
  type: PrimitiveEventType;
  target: PrimitiveHandle;
  hit?: PickResult;
  nativeEvent?: PointerEvent | MouseEvent;
}
export interface TransformTarget {
  setPosition(position: Vec2): this;
  setRotation(radians: number): this;
}
export interface PrimitiveHandle<T extends CommonOptions = CommonOptions> extends TransformTarget {
  readonly id: string;
  readonly kind: PrimitiveKind;
  readonly disposed: boolean;
  readonly transform: DeepReadonly<Transform2D>;
  getOptions(): DeepReadonly<T>;
  update(patch: PrimitivePatch<T>): this;
  setVisible(visible: boolean): this;
  on(type: PrimitiveEventType, listener: (event: PrimitiveEvent) => void): () => void;
  onDispose(listener: () => void): () => void;
  dispose(): void;
}
export interface LayerOptions {
  id: string;
  order: number;
  visible?: boolean;
  pickable?: boolean;
  opacity?: number;
  minScale?: number;
  maxScale?: number;
}
export interface PickQuery {
  layers?: readonly LayerId[];
}
export interface PolygonRings {
  outer: readonly Vec2[];
  holes?: readonly (readonly Vec2[])[];
}
export type PolygonGeometry = { type: "Polygon"; polygon: PolygonRings } | { type: "MultiPolygon"; polygons: readonly PolygonRings[] };
export interface PolygonOptions extends CommonOptions {
  geometry: PolygonGeometry;
  fill: ColorInput;
}
export interface PolygonHandle extends PrimitiveHandle<PolygonOptions> {
  setGeometry(geometry: PolygonGeometry): this;
  setFill(fill: ColorInput): this;
}
export interface LineDash {
  length: number;
  gap: number;
  offset?: number;
  sizeMode?: SizeMode;
}
export interface LineOptions extends CommonOptions {
  points: readonly Vec2[];
  color: ColorInput;
  width: number;
  widthMode?: SizeMode;
  closed?: boolean;
  cap?: "butt" | "round";
  join?: "miter" | "bevel";
  miterLimit?: number;
  dash?: LineDash | null;
}
export interface LineHandle extends PrimitiveHandle<LineOptions> {
  setPoints(points: readonly Vec2[]): this;
  setColor(color: ColorInput): this;
  setWidth(width: number): this;
}
export interface SpriteOptions extends CommonOptions {
  image: string;
  size: Vec2;
  sizeMode?: SizeMode;
  anchor?: Vec2;
  tint?: ColorInput;
}
export interface SpriteHandle extends PrimitiveHandle<SpriteOptions> {
  setImage(imageId: string): this;
  setSize(size: Vec2, sizeMode?: SizeMode): this;
  setTint(color: ColorInput): this;
  ready(): Promise<void>;
}
export interface TextOptions extends CommonOptions {
  text: string;
  font: string;
  fontSize: number;
  sizeMode?: SizeMode;
  lineHeight?: number;
  letterSpacing?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  anchor?: Vec2;
  color?: ColorInput;
  outline?: { color: ColorInput; width: number };
  background?: { color: ColorInput; opacity: number; radius: number };
  padding?: readonly [number, number, number, number];
}
export interface TextHandle extends PrimitiveHandle<TextOptions> {
  setText(text: string): this;
  ready(): Promise<void>;
}
export type PrimitiveOptions = PolygonOptions | LineOptions | SpriteOptions | TextOptions;
export interface ResourceLease<T> {
  readonly value: T;
  release(): void;
}
export interface ResourceStoreAcquireOptions {
  signal?: AbortSignal;
}
export interface PaintKey {
  layerOrder: number;
  primitiveOrder: number;
  insertionSequence: number;
}
export interface UploadStats {
  bytes: number;
  ranges: number;
  rebuiltBatches: number;
}

/** 颜色和拾取使用同一逻辑状态. 裁切在完整投影之后执行, 避免小块拾取改变线宽. */
export interface RenderContext {
  pass: RenderPassKind;
  scale: number;
  dpr: number;
  cssSize: Vec2;
  drawingBufferSize: Vec2;
  pick?: { centerCss: Vec2; originPx: Vec2; sizePx: Vec2 };
}
export interface RenderFeature {
  handle: PrimitiveHandle<any>;
  options: DeepReadonly<PrimitiveOptions>;
  matrix: Matrix4;
  opacity: number;
  visible: boolean;
  pickable: boolean;
  pickId: number;
  hit: HitPolicy;
  paintKey: PaintKey;
  version: number;
  dirty: ReadonlySet<DirtyKind>;
}
export interface RenderItem {
  object: Object3D;
  primitiveIds: readonly string[];
  key: string;
}
/** 每种图元的后端持有资源与连续批次, 不向业务暴露 GPU 槽位. */
export interface PrimitiveRenderBackend {
  readonly kind: PrimitiveKind;
  readonly stats: UploadStats;
  prepare(handle: PrimitiveHandle<any>): Promise<void>;
  beginFrame(pass: RenderPassKind): void;
  build(runKey: string, features: readonly RenderFeature[], context: RenderContext): readonly RenderItem[];
  endFrame(pass: RenderPassKind): void;
  remove(id: string): void;
  contextRestored(): void;
  dispose(): void;
}
