# 00. 公共契约与模块边界

前置: 无. 后续: 所有任务. 本文件是分批实现的接口依据, 类型草案允许按实现补充, 但公共语义需要保持一致.

## 目标与范围

在 `core/contracts` 建立轻量类型与扩展接口. 用逻辑图元 handle 操作实例, 内部映射到批次. 业务无需接触 `instanceId`, `BufferAttribute`, `needsUpdate` 或手动重绘. 不要求业务使用 ECS 或继承多个能力基类.

采用 `Viewer2D` 组合视口, 调度器, 图元注册表, 图层, 资源, 批渲染, 拾取和交互. 首期只实现正交 2D, Three.js 使用本地 r170/WebGL2. 高度和相机接口为未来 3D 留出入口, 完整 3D 深度, 遮挡和模型拾取另行规划.

## 公共类型草案

```ts
type Vec2 = readonly [number, number];
type PrimitiveId = string;
type EntityId = string;
type LayerId = string;
type ColorInput = string | number;
type SizeMode = "world" | "screen";
type PrimitiveKind = "polygon" | "line" | "sprite" | "text";

interface Transform2D {
  position: Vec2;   // 局部世界坐标, 单位米.
  rotation: number; // 弧度, 平面内逆时针为正.
  scale: Vec2;
  height: number;   // 米, 与图层绘制顺序独立.
}

interface HitPolicy {
  mode: "visible" | "bounds"; // bounds 首期仅用于精灵和标签.
  alphaThreshold: number;
  tolerancePx: number;        // CSS 像素, 默认 0.
  priority: number;           // 默认 0, 只影响拾取.
}

interface CommonOptions {
  id?: PrimitiveId;
  layer: LayerId;
  ownerId?: EntityId;
  partId?: string;
  order?: number;             // 同层内顺序, 默认 0.
  transform?: Partial<Transform2D>;
  visible?: boolean;
  pickable?: boolean;
  opacity?: number;
  hit?: Partial<HitPolicy>;
}

type PrimitiveEventType =
  | "pointerenter" | "pointerleave" | "select" | "deselect" | "dblclick";

interface PickResult {
  primitiveId: PrimitiveId;
  ownerId?: EntityId;
  partId?: string;
  layerId: LayerId;
  screen: Vec2;
  world: Vec2;
}

interface PrimitiveEvent {
  type: PrimitiveEventType;
  target: PrimitiveHandle<CommonOptions>;
  hit?: PickResult;
  nativeEvent?: PointerEvent | MouseEvent;
}

interface TransformTarget {
  setPosition(position: Vec2): this;
  setRotation(radians: number): this;
}

type PrimitivePatch<T extends CommonOptions> = Partial<Omit<T, "id" | "transform" | "hit">> & {
  transform?: Partial<Transform2D>;
  hit?: Partial<HitPolicy>;
};

interface PrimitiveHandle<T extends CommonOptions> extends TransformTarget {
  readonly id: PrimitiveId;
  readonly kind: PrimitiveKind;
  readonly disposed: boolean;
  readonly transform: Readonly<Transform2D>;
  getOptions(): DeepReadonly<T>; // 返回递归冻结的快照, 不是可直接改写的内部对象.
  update(patch: PrimitivePatch<T>): this;
  setVisible(visible: boolean): this;
  on(type: PrimitiveEventType, listener: (event: PrimitiveEvent) => void): () => void;
  onDispose(listener: () => void): () => void;
  dispose(): void;
}

interface LayerOptions {
  id: LayerId;
  order: number;
  visible?: boolean;
  pickable?: boolean;
  opacity?: number;
  minScale?: number; // scale = 每米对应的 CSS 像素.
  maxScale?: number;
}

interface PickQuery {
  layers?: readonly LayerId[];
}
```

`DeepReadonly` 和 `PrimitivePatch` 的正式定义见 `core/contracts/index.ts`. `update` 对普通字段替换, 对 `transform` 和 `hit` 的已提供子字段合并. 默认 position=[0,0], rotation=0, scale=[1,1], height=0, visible/pickable=true, opacity=1, hit.mode=visible, alphaThreshold=0.1. ID 自动生成, 同一 Viewer 内不得重复, dispose 后旧 handle 不得操作新图元.

ColorInput 表达 RGB, 透明度通过 opacity 或背景专用 opacity 设置, 不依赖 Three.Color 从 rgba 字符串保留 alpha. ownerId/partId 未填写时图元按自身 ID 独立交互.

各图元的 `PolygonOptions`, `LineOptions`, `SpriteOptions`, `TextOptions` 分别由 08/09/11/13 完善. 它们都继承 CommonOptions, 提供相同生命周期和常用 setter.

```ts
// 以下为目标调用方式, 在 20 汇总入口. 前置模块可以先使用内部组装入口.
const view = new Viewer2D({ container, background: "#17242b" });
view.layers.add({ id: "devices", order: 20 });
const body = view.primitives.addSprite({
  id: "igv-1/body", ownerId: "igv-1", partId: "body", layer: "devices",
  image: "igv-body", size: [3, 8], sizeMode: "world",
  transform: { position: [12, 24] },
});
body.setPosition([13, 24]).setRotation(Math.PI / 2);
body.update({ opacity: 0.8 });
body.on("select", event => showDevice(event.hit?.ownerId));
view.dispose();
```

图片和字体需通过资源接口提前注册或异步加载, 示例省略加载过程. 所有 setter 自动产生脏标记, 相同帧内只上传和重绘一次.

## 内部协作约定

- 逻辑坐标: [x,y] 为平面直角坐标, y 向上, GPU 采用 Three.js `(x,height,-y)` 的 XZ 平面. 投影, 毫米转换和旧 heading 的转换留在外部适配器, 不放进通用图元.
- 绘制顺序: `(layer.order, primitive.order, insertionSequence)` 从小到大. 2D 使用一致的绘制队列, 避免 Three.js 默认 opaque/transparent 分桶打乱这个顺序. 图层 order 不编码进物理 height.
- 批渲染: 自动按后端, 材质程序, 纹理页组和连续绘制区段划分. 合批不得跨越需要保持顺序的其他图元. 同一逻辑图元的 GPU 槽位可变, handle 不变.
- 数据更新: 区分变换, 样式, 几何/布局, 资源绑定, 顺序和显隐. 高频变换/改色更新必要范围, 只有拓扑或容量变化才重建必要部分.
- 拾取: 所有批后端预留逐图元 ID 和 mask 接口, 图元模块不依赖 GpuPicker. 14 通过渲染后端生成 pick pass, 消费同一份几何, 变换, 显隐和透明掩码.
- 业务归属: ownerId 和 partId 是逻辑关联, 与 Three.js 场景树父子关系独立. 可选图层过滤后, 不参与查询的图元不阻挡本次拾取.
- 资源与销毁: 所有容器以 Viewer 为作用域. 静态共享缓存只允许不可变资源, 不允许把图元注册, 选中状态或相机放在全局单例.

```ts
type RenderPassKind = "color" | "pick";
type DirtyKind = "transform" | "style" | "geometry" | "resource" | "order" | "visibility";

interface RenderContext {
  pass: RenderPassKind;
  scale: number;
  dpr: number;
  cssSize: Vec2;
  drawingBufferSize: Vec2;
  pick?: { centerCss: Vec2; originPx: Vec2; sizePx: Vec2 };
}

// 正式后端以连续有序区段构建颜色或拾取批次, RenderFeature/RenderItem 见 07.
interface PrimitiveRenderBackend {
  readonly kind: PrimitiveKind;
  readonly stats: UploadStats;
  prepare(handle: PrimitiveHandle): Promise<void>;
  beginFrame(pass: RenderPassKind): void;
  build(runKey: string, features: readonly RenderFeature[], context: RenderContext): readonly RenderItem[];
  endFrame(pass: RenderPassKind): void;
  remove(id: PrimitiveId): void;
  contextRestored(): void;
  dispose(): void;
}
```

## 设计依据和完成条件

- 老设备经常跨层包含精灵, 标签, 箱体和路径, 见 `templates/classes/deviceInOpenlayers/IGVInstance.ts`. 17 用组合对象维持一个设备的操作复杂度.
- 老选择管线支持 5px 容差和图层过滤, 见 `templates/inMap/listeners/selectPipeLine.js`. 新默认是可见像素, 容差按图元配置, 不能照搬上一次 hover 结果作为点击结果.
- TypeScript 类型会在编译后擦除. 18 的反射是显式装饰器元数据, 不引入全类型自动分析. 参考 [TypeScript 官方说明](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html#reflection).
- 保留每实例的可读 API, 通过组合注入调度, 注册, 资源和调试能力, 不通过多重继承叠加能力.
- 契约类型可独立导入且不创建 renderer/GUI. 公开类型与运行时代码保持 r170 一致, 新目录的临时出口在 20 统一收敛.

## 轻量验收

- 基础类型与运行时模块分离, 导入契约无 DOM/GPU/GUI 副作用. 本任务只实现通用类型, 不提前为后续模块写空壳实现.
- 用少量 stub 检查 transform patch 合并, 事件和 adapter 的类型关系. 01 工程就绪后将这些类型纳入既有类型检查, 不增加测试框架.
- 各任务复用同名公共类型, 单位, 顺序, 默认拾取和销毁语义一致.
