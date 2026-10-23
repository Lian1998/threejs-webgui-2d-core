import type { ColorInput, CommonOptions, LineOptions, PolygonGeometry, PolygonOptions, PrimitiveHandle, SizeMode, SpriteOptions, TextOptions, Vec2 } from "../../contracts";
import type { MotionController } from "../../motion/MotionController";
import type { EntityView } from "../../composition/EntityView";
import { DebugField } from "./metadata";

function json<T>(value: string): T {
  return JSON.parse(value) as T;
}

/** 把 GUI 字段读写转换为 handle API, 编辑姿态前暂停该目标的插帧. */
export class CommonDebugProxy {
  constructor(
    protected readonly handle: PrimitiveHandle<any>,
    private readonly motion?: MotionController,
  ) {}
  protected get options(): CommonOptions {
    return this.handle.getOptions();
  }
  protected patch(value: object): void {
    this.handle.update(value);
  }
  protected editTransform(operation: () => void): void {
    this.motion?.getBinding(this.handle)?.pause();
    operation();
  }

  @DebugField({ kind: "string", name: "图元 ID", folder: "身份", readOnly: true, order: -100 })
  get id(): string {
    return this.handle.id;
  }
  @DebugField({ kind: "string", name: "所属设备", folder: "身份", readOnly: true, order: -99 })
  get ownerId(): string {
    return this.options.ownerId ?? "";
  }
  @DebugField({ kind: "string", name: "部件", folder: "身份", readOnly: true, order: -98 })
  get partId(): string {
    return this.options.partId ?? "";
  }
  @DebugField({ kind: "string", name: "图层", folder: "显示" })
  get layer(): string {
    return this.options.layer;
  }
  set layer(value: string) {
    this.patch({ layer: value });
  }
  @DebugField({ kind: "number", name: "同层顺序", folder: "显示", step: 1 })
  get order(): number {
    return this.options.order ?? 0;
  }
  set order(value: number) {
    this.patch({ order: value });
  }
  @DebugField({ kind: "boolean", name: "可见", folder: "显示" })
  get visible(): boolean {
    return this.options.visible !== false;
  }
  set visible(value: boolean) {
    this.handle.setVisible(value);
  }
  @DebugField({ kind: "number", name: "透明度", folder: "显示", min: 0, max: 1, step: 0.01 })
  get opacity(): number {
    return this.options.opacity ?? 1;
  }
  set opacity(value: number) {
    this.patch({ opacity: value });
  }
  @DebugField({ kind: "vec2", name: "位置", folder: "变换", step: 0.1 })
  get position(): Vec2 {
    return this.handle.transform.position;
  }
  set position(value: Vec2) {
    this.editTransform(() => this.handle.setPosition(value));
  }
  @DebugField({ kind: "number", name: "角度 rad", folder: "变换", step: 0.01 })
  get rotation(): number {
    return this.handle.transform.rotation;
  }
  set rotation(value: number) {
    this.editTransform(() => this.handle.setRotation(value));
  }
  @DebugField({ kind: "vec2", name: "缩放", folder: "变换", step: 0.1 })
  get scale(): Vec2 {
    return this.handle.transform.scale;
  }
  set scale(value: Vec2) {
    this.editTransform(() => this.patch({ transform: { scale: value } }));
  }
  @DebugField({ kind: "number", name: "高度 m", folder: "变换", step: 0.1 })
  get height(): number {
    return this.handle.transform.height;
  }
  set height(value: number) {
    this.editTransform(() => this.patch({ transform: { height: value } }));
  }
  @DebugField({ kind: "boolean", name: "允许拾取", folder: "拾取" })
  get pickable(): boolean {
    return this.options.pickable !== false;
  }
  set pickable(value: boolean) {
    this.patch({ pickable: value });
  }
  @DebugField({ kind: "select", name: "拾取范围", folder: "拾取", choices: ["visible", "bounds"] })
  get hitMode(): string {
    return this.options.hit?.mode ?? "visible";
  }
  set hitMode(value: string) {
    this.patch({ hit: { mode: value } });
  }
  @DebugField({ kind: "number", name: "Alpha 阈值", folder: "拾取", min: 0, max: 1, step: 0.01 })
  get alphaThreshold(): number {
    return this.options.hit?.alphaThreshold ?? 0.1;
  }
  set alphaThreshold(value: number) {
    this.patch({ hit: { alphaThreshold: value } });
  }
  @DebugField({ kind: "number", name: "容差 CSS px", folder: "拾取", min: 0, step: 1 })
  get tolerance(): number {
    return this.options.hit?.tolerancePx ?? 0;
  }
  set tolerance(value: number) {
    this.patch({ hit: { tolerancePx: value } });
  }
  @DebugField({ kind: "number", name: "拾取优先级", folder: "拾取", step: 1 })
  get priority(): number {
    return this.options.hit?.priority ?? 0;
  }
  set priority(value: number) {
    this.patch({ hit: { priority: value } });
  }
  @DebugField({ kind: "action", name: "继续插帧", folder: "变换" })
  resumeMotion(): void {
    this.motion?.getBinding(this.handle)?.resume();
  }
}

/** 精灵的调试适配, 将图片, 尺寸, 锚点和颜色字段写回 SpriteHandle. */
export class SpriteDebugProxy extends CommonDebugProxy {
  private get sprite(): SpriteOptions {
    return this.handle.getOptions();
  }
  @DebugField({ kind: "string", name: "图片 ID", folder: "精灵" })
  get image(): string {
    return this.sprite.image;
  }
  set image(value: string) {
    this.patch({ image: value });
  }
  @DebugField({ kind: "vec2", name: "尺寸", folder: "精灵", min: 0.001, step: 0.1 })
  get size(): Vec2 {
    return this.sprite.size;
  }
  set size(value: Vec2) {
    this.patch({ size: value });
  }
  @DebugField({ kind: "select", name: "尺寸单位", folder: "精灵", choices: ["world", "screen"] })
  get sizeMode(): SizeMode {
    return this.sprite.sizeMode ?? "world";
  }
  set sizeMode(value: SizeMode) {
    this.patch({ sizeMode: value });
  }
  @DebugField({ kind: "vec2", name: "锚点", folder: "精灵", min: 0, max: 1, step: 0.01 })
  get anchor(): Vec2 {
    return this.sprite.anchor ?? [0.5, 0.5];
  }
  set anchor(value: Vec2) {
    this.patch({ anchor: value });
  }
  @DebugField({ kind: "color", name: "颜色", folder: "精灵" })
  get tint(): ColorInput {
    return this.sprite.tint ?? "#ffffff";
  }
  set tint(value: ColorInput) {
    this.patch({ tint: value });
  }
}

/** 路径的调试适配, 将点列和线型控件转换为 LineHandle.update. */
export class LineDebugProxy extends CommonDebugProxy {
  private get line(): LineOptions {
    return this.handle.getOptions();
  }
  @DebugField({ kind: "select", name: "拾取范围", folder: "拾取", choices: ["visible"] })
  override get hitMode(): string {
    return super.hitMode;
  }
  override set hitMode(value: string) {
    super.hitMode = value;
  }
  @DebugField({ kind: "color", name: "颜色", folder: "线" })
  get color(): ColorInput {
    return this.line.color;
  }
  set color(value: ColorInput) {
    this.patch({ color: value });
  }
  @DebugField({ kind: "number", name: "线宽", folder: "线", min: 0, step: 0.1 })
  get width(): number {
    return this.line.width;
  }
  set width(value: number) {
    this.patch({ width: value });
  }
  @DebugField({ kind: "select", name: "线宽单位", folder: "线", choices: ["world", "screen"] })
  get widthMode(): SizeMode {
    return this.line.widthMode ?? "screen";
  }
  set widthMode(value: SizeMode) {
    this.patch({ widthMode: value });
  }
  @DebugField({ kind: "boolean", name: "闭合", folder: "线" })
  get closed(): boolean {
    return this.line.closed ?? false;
  }
  set closed(value: boolean) {
    this.patch({ closed: value });
  }
  @DebugField({ kind: "select", name: "端帽", folder: "线", choices: ["butt", "round"] })
  get cap(): string {
    return this.line.cap ?? "butt";
  }
  set cap(value: string) {
    this.patch({ cap: value });
  }
  @DebugField({ kind: "select", name: "连接", folder: "线", choices: ["miter", "bevel"] })
  get join(): string {
    return this.line.join ?? "miter";
  }
  set join(value: string) {
    this.patch({ join: value });
  }
  @DebugField({ kind: "number", name: "Miter 限制", folder: "线", min: 1, step: 0.1 })
  get miterLimit(): number {
    return this.line.miterLimit ?? 4;
  }
  set miterLimit(value: number) {
    this.patch({ miterLimit: value });
  }
  @DebugField({ kind: "string", name: "顶点 JSON", folder: "几何" })
  get points(): string {
    return JSON.stringify(this.line.points);
  }
  set points(value: string) {
    this.patch({ points: json<readonly Vec2[]>(value) });
  }
  @DebugField({ kind: "boolean", name: "虚线", folder: "虚线" })
  get dashed(): boolean {
    return Boolean(this.line.dash);
  }
  set dashed(value: boolean) {
    this.patch({ dash: value ? { length: 4, gap: 6, sizeMode: "screen" } : null });
  }
  @DebugField({ kind: "number", name: "实段", folder: "虚线", min: 0, step: 0.1 })
  get dashLength(): number {
    return this.line.dash?.length ?? 4;
  }
  set dashLength(value: number) {
    this.patch({ dash: { ...this.line.dash, length: value, gap: this.line.dash?.gap ?? 6 } });
  }
  @DebugField({ kind: "number", name: "空段", folder: "虚线", min: 0, step: 0.1 })
  get dashGap(): number {
    return this.line.dash?.gap ?? 6;
  }
  set dashGap(value: number) {
    this.patch({ dash: { ...this.line.dash, length: this.line.dash?.length ?? 4, gap: value } });
  }
  @DebugField({ kind: "number", name: "偏移", folder: "虚线", step: 0.1 })
  get dashOffset(): number {
    return this.line.dash?.offset ?? 0;
  }
  set dashOffset(value: number) {
    this.patch({ dash: { length: 4, gap: 6, ...this.line.dash, offset: value } });
  }
  @DebugField({ kind: "select", name: "虚线单位", folder: "虚线", choices: ["world", "screen"] })
  get dashMode(): SizeMode {
    return this.line.dash?.sizeMode ?? "screen";
  }
  set dashMode(value: SizeMode) {
    this.patch({ dash: { length: 4, gap: 6, ...this.line.dash, sizeMode: value } });
  }
}

/** 多边形的调试适配, 通过 JSON 字段编辑几何, 校验仍由图元执行. */
export class PolygonDebugProxy extends CommonDebugProxy {
  private get polygon(): PolygonOptions {
    return this.handle.getOptions();
  }
  @DebugField({ kind: "select", name: "拾取范围", folder: "拾取", choices: ["visible"] })
  override get hitMode(): string {
    return super.hitMode;
  }
  override set hitMode(value: string) {
    super.hitMode = value;
  }
  @DebugField({ kind: "color", name: "填色", folder: "多边形" })
  get fill(): ColorInput {
    return this.polygon.fill;
  }
  set fill(value: ColorInput) {
    this.patch({ fill: value });
  }
  @DebugField({ kind: "string", name: "外环/孔洞 JSON", folder: "多边形" })
  get geometry(): string {
    return JSON.stringify(this.polygon.geometry);
  }
  set geometry(value: string) {
    this.patch({ geometry: json<PolygonGeometry>(value) });
  }
}

/** 标签的调试适配, 文本和布局写回后走正常异步准备链路. */
export class TextDebugProxy extends CommonDebugProxy {
  private get textOptions(): TextOptions {
    return this.handle.getOptions();
  }
  @DebugField({ kind: "string", name: "内容", folder: "文字" })
  get text(): string {
    return this.textOptions.text;
  }
  set text(value: string) {
    this.patch({ text: value });
  }
  @DebugField({ kind: "string", name: "字体 ID", folder: "文字" })
  get font(): string {
    return this.textOptions.font;
  }
  set font(value: string) {
    this.patch({ font: value });
  }
  @DebugField({ kind: "number", name: "字号", folder: "文字", min: 0.001, step: 0.1 })
  get fontSize(): number {
    return this.textOptions.fontSize;
  }
  set fontSize(value: number) {
    this.patch({ fontSize: value });
  }
  @DebugField({ kind: "select", name: "字号单位", folder: "文字", choices: ["world", "screen"] })
  get sizeMode(): SizeMode {
    return this.textOptions.sizeMode ?? "world";
  }
  set sizeMode(value: SizeMode) {
    this.patch({ sizeMode: value });
  }
  @DebugField({ kind: "color", name: "字色", folder: "文字" })
  get color(): ColorInput {
    return this.textOptions.color ?? "#ffffff";
  }
  set color(value: ColorInput) {
    this.patch({ color: value });
  }
  @DebugField({ kind: "number", name: "行高", folder: "布局", min: 0.001, step: 0.1 })
  get lineHeight(): number {
    return this.textOptions.lineHeight ?? this.fontSize * 1.2;
  }
  set lineHeight(value: number) {
    this.patch({ lineHeight: value });
  }
  @DebugField({ kind: "number", name: "字距", folder: "布局", step: 0.1 })
  get letterSpacing(): number {
    return this.textOptions.letterSpacing ?? 0;
  }
  set letterSpacing(value: number) {
    this.patch({ letterSpacing: value });
  }
  @DebugField({ kind: "number", name: "换行宽度 0=关闭", folder: "布局", min: 0, step: 0.1 })
  get maxWidth(): number {
    return this.textOptions.maxWidth ?? 0;
  }
  set maxWidth(value: number) {
    this.patch({ maxWidth: value || undefined });
  }
  @DebugField({ kind: "select", name: "对齐", folder: "布局", choices: ["left", "center", "right"] })
  get align(): string {
    return this.textOptions.align ?? "left";
  }
  set align(value: string) {
    this.patch({ align: value });
  }
  @DebugField({ kind: "vec2", name: "锚点", folder: "布局", min: 0, max: 1, step: 0.01 })
  get anchor(): Vec2 {
    return this.textOptions.anchor ?? [0.5, 0.5];
  }
  set anchor(value: Vec2) {
    this.patch({ anchor: value });
  }
  @DebugField({ kind: "string", name: "Padding JSON", folder: "布局" })
  get padding(): string {
    return JSON.stringify(this.textOptions.padding ?? [0, 0, 0, 0]);
  }
  set padding(value: string) {
    this.patch({ padding: json<readonly number[]>(value) });
  }
  @DebugField({ kind: "boolean", name: "描边", folder: "描边" })
  get outlineEnabled(): boolean {
    return Boolean(this.textOptions.outline);
  }
  set outlineEnabled(value: boolean) {
    this.patch({ outline: value ? { color: "#000000", width: this.fontSize * 0.05 } : undefined });
  }
  @DebugField({ kind: "color", name: "描边色", folder: "描边" })
  get outlineColor(): ColorInput {
    return this.textOptions.outline?.color ?? "#000000";
  }
  set outlineColor(value: ColorInput) {
    this.patch({ outline: { width: this.fontSize * 0.05, ...this.textOptions.outline, color: value } });
  }
  @DebugField({ kind: "number", name: "描边宽", folder: "描边", min: 0, step: 0.01 })
  get outlineWidth(): number {
    return this.textOptions.outline?.width ?? 0;
  }
  set outlineWidth(value: number) {
    this.patch({ outline: { color: "#000000", ...this.textOptions.outline, width: value } });
  }
  @DebugField({ kind: "boolean", name: "背景", folder: "背景" })
  get backgroundEnabled(): boolean {
    return Boolean(this.textOptions.background);
  }
  set backgroundEnabled(value: boolean) {
    this.patch({ background: value ? { color: "#203040", opacity: 1, radius: 0 } : undefined });
  }
  @DebugField({ kind: "color", name: "背景色", folder: "背景" })
  get backgroundColor(): ColorInput {
    return this.textOptions.background?.color ?? "#203040";
  }
  set backgroundColor(value: ColorInput) {
    this.patch({ background: { opacity: 1, radius: 0, ...this.textOptions.background, color: value } });
  }
  @DebugField({ kind: "number", name: "背景 Alpha", folder: "背景", min: 0, max: 1, step: 0.01 })
  get backgroundOpacity(): number {
    return this.textOptions.background?.opacity ?? 1;
  }
  set backgroundOpacity(value: number) {
    this.patch({ background: { color: "#203040", radius: 0, ...this.textOptions.background, opacity: value } });
  }
  @DebugField({ kind: "number", name: "圆角", folder: "背景", min: 0, step: 0.1 })
  get radius(): number {
    return this.textOptions.background?.radius ?? 0;
  }
  set radius(value: number) {
    this.patch({ background: { color: "#203040", opacity: 1, ...this.textOptions.background, radius: value } });
  }
}

/** 设备级调试适配, 修改 EntityView 的父变换并同步跨层部件. */
export class EntityDebugProxy {
  constructor(
    private readonly entity: EntityView,
    private readonly motion?: MotionController,
  ) {}
  private edit(operation: () => void): void {
    this.motion?.getBinding(this.entity)?.pause();
    operation();
  }
  @DebugField({ kind: "string", name: "设备 ID", readOnly: true })
  get id(): string {
    return this.entity.id;
  }
  @DebugField({ kind: "boolean", name: "可见" })
  get visible(): boolean {
    return this.entity.isVisible;
  }
  set visible(value: boolean) {
    this.entity.setVisible(value);
  }
  @DebugField({ kind: "vec2", name: "位置", step: 0.1 })
  get position(): Vec2 {
    return this.entity.transform.position;
  }
  set position(value: Vec2) {
    this.edit(() => this.entity.setPosition(value));
  }
  @DebugField({ kind: "number", name: "角度 rad", step: 0.01 })
  get rotation(): number {
    return this.entity.transform.rotation;
  }
  set rotation(value: number) {
    this.edit(() => this.entity.setRotation(value));
  }
  @DebugField({ kind: "vec2", name: "缩放", step: 0.1 })
  get scale(): Vec2 {
    return this.entity.transform.scale;
  }
  set scale(value: Vec2) {
    this.edit(() => this.entity.setScale(value));
  }
  @DebugField({ kind: "number", name: "高度", step: 0.1 })
  get height(): number {
    return this.entity.transform.height;
  }
  set height(value: number) {
    this.edit(() => this.entity.setHeight(value));
  }
  @DebugField({ kind: "action", name: "继续插帧" })
  resumeMotion(): void {
    this.motion?.getBinding(this.entity)?.resume();
  }
}

export function createDebugProxy(handle: PrimitiveHandle<any>, motion?: MotionController): CommonDebugProxy {
  switch (handle.kind) {
    case "sprite":
      return new SpriteDebugProxy(handle, motion);
    case "text":
      return new TextDebugProxy(handle, motion);
    case "line":
      return new LineDebugProxy(handle, motion);
    case "polygon":
      return new PolygonDebugProxy(handle, motion);
  }
}
