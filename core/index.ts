export { Viewer2D } from "./Viewer2D";
export type { Viewer2DOptions, ViewerStats } from "./Viewer2D";
export * from "./contracts";
export * from "./coordinates";
export * from "./viewport";
export * from "./scheduler";
export * from "./motion";
export * from "./composition";
export { LayerManager, LayerHandle } from "./layers/LayerManager";
export { PolygonPrimitive, LinePrimitive, SpritePrimitive, TextPrimitive, PrimitiveFactory } from "./primitives/PrimitiveFactory";
export { ResourceStore } from "./resources/ResourceStore";
export type { SpriteImageSource, SpriteAtlasOptions } from "./resources/sprites/SpriteAtlas";
export type { FontSource } from "./resources/fonts/FontStore";
export { InteractionController } from "./interaction/InteractionController";
export type { SelectionTarget, SelectionOptions, SelectionChange } from "./interaction/InteractionController";
export { GpuPicker } from "./picking/GpuPicker";

// 新业务 ID 为字符串. 旧 ECS 数字 ID 通过兼容别名访问, 避免 star export 同名歧义.
export type { EntityId } from "./contracts";
export type { EntityId as LegacyEntityId } from "./ECS";
