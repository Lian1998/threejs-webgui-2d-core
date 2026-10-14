# 20. 公共入口与交付检查

前置: 01-19. 后续: 用户按实际项目接入业务, 完整3D另行规划.

## 目标与边界

把前面模块收敛为可直接使用的 `Viewer2D`, 保留简洁的图元API和组合设备调用方式. 提供本地模拟业务示例, 公开API说明和轻量交付检查, 不在本任务修改 source 或 templates.

当前 `core/index.ts` 同时导出旧图元, ECS, 批处理和重复事件入口. 需要核对已有消费者后再整理, 不因新框架完成就直接删除全部旧入口.

实现目录: `core/Viewer2D.ts`, `core/public.ts`, `core/index.ts`, `core/legacy.ts`, `core/examples/SimulatedDevice.ts`, `core/debug/refactor/index.ts`, `multi-pages/debug/refactor/delivery.html`, `docs/api.md`, `README.md`. 各模块共用可配置场景, 保留独立 HTML 入口.

## Facade 类型草案

```ts
interface Viewer2DOptions {
  container: HTMLElement;
  background?: ColorInput;
  maxDpr?: number;
  debug?: { gui?: boolean }; // __WEBGUI_DEBUG__ 开启时生效, 18负责异步attach.
}

interface PrimitiveFactory {
  addPolygon(options: PolygonOptions): PolygonHandle;
  addLine(options: LineOptions): LineHandle;
  addSprite(options: SpriteOptions): SpriteHandle;
  addText(options: TextOptions): TextHandle;
  get(id: PrimitiveId): PrimitiveHandle<CommonOptions> | undefined;
}

interface ViewerResources {
  sprites: {
    register(source: SpriteImageSource): Promise<void>;
    unregister(imageId: string): void;
  };
  fonts: {
    register(source: FontSource): Promise<void>;
    unregister(fontId: string): void;
  };
}

class Viewer2D {
  readonly primitives: PrimitiveFactory;
  readonly layers: LayerManager;       // 使用05定义, 不另造同名类型.
  readonly resources: ViewerResources; // 包装06/10/12, 不暴露底层acquire.
  readonly motion: MotionController;  // 使用16定义.
  readonly interaction: InteractionController; // 使用15定义.
  readonly viewport: Viewport2D; // 使用02定义.
  readonly entities: { create(options: EntityOptions): EntityView }; // 使用17定义.
  dispose(): void;
}
```

Facade直接调用既有模块, 类型名以对应任务的正式实现为准. 内部renderer, 批次映射和raw实例槽位不进入业务API. `maxDpr` 由02最终尺寸策略实现, 不创建第二套DPR管理.

## 实现步骤

1. 逐项核对00与模块实际导出, 补齐名称, 默认值, patch合并规则, 错误行为和生命周期. 合并重复类型, 保持入口没有隐式创建全局Viewer.
2. 以对象组合注入时钟, 调度, 注册, 图层, 资源, batch, picker, 交互和motion, 规定创建及释放顺序. 模块构造失败时清理已创建的资源.
3. 新建Viewer后container自动拥有canvas并跟踪resize. 图元setter, 资源完成, 图层变化和交互状态自动请求必要帧, 业务不显式调用renderer.render.
4. `primitives.add*` 先规范化选项再返回稳定专用handle, 保留setPoints/setText/setImage等方法. 图片/字体register登记并预加载, facade持lease直到unregister或Viewer销毁, 图元另持lease; 失败可重试,不遗留半成品.
5. 汇总导出Viewer, 图元类型, 必要控制器与组合设备能力. 内部shader, atlas实现, pick ID分配器与debug入口不变成随手可用的公共API.
6. 搜索 `core/index.ts` 的所有已有导入消费者. 提供旧路径保留或明确的legacy出口与迁移表, 再处理重名export和重复入口.
7. 此轮保留source可引用的旧入口. 兼容映射仅在语义真正一致时提供, 对旧ECS/actor接口不做看似同名却行为不同的自动别名.
8. 构建模拟组合设备: 车身/车头精灵, 中文标签, 箱体多边形, 路线与锁闭区. 随动部件跨层但一次设备姿态更新通过17传播; 世界坐标路线仅关联ownerId, 不跟着车身旋转.
9. 点击任一可选部件返回ownerId/partId, 设备级选择通过17协作15. 展示图层过滤, 管线容差, 显示顺序与设备销毁.
10. 示例加载本地图片/字体, 用固定种子模拟低频数据并交给16插帧. 业务状态, 单位转换, 资源加载与视图操作边界清晰.
11. 比较 `templates/classes/deviceInOpenlayers/IGVInstance.ts` 同类操作所需调用. 业务只管理device/handle和资源ID, 不写feature/style/geometry指针池或GPU属性同步代码.
12. 中文文档使用英文标点, 重要集成与释放流程加中文注释. 不为交付重排或格式化无关source/templates代码.

## 使用草案

```ts
const view = new Viewer2D({ container, background: "#17242b" });
view.layers.add({ id: "devices", order: 20 });
await view.resources.sprites.register({ id: "igv-body", url: "/assets/igv-body.png" });
const body = view.primitives.addSprite({
  layer: "devices", image: "igv-body", size: [3, 8], sizeMode: "world",
  ownerId: "igv-1", partId: "body",
  transform: { position: [12, 24] },
});
await body.ready();
body.setPosition([13, 24]).setRotation(Math.PI / 2);
body.on("select", event => showDevice(event.hit?.ownerId));
const movement = view.motion.bind(body, { durationMs: 160 });
movement.push({ position: [14, 24], rotation: Math.PI / 2 });
// SimulatedDevice复用17组合对象, 对外也是TransformTarget.
view.dispose();
```

正式README配齐实际资源和字体register示例. SimulatedDevice内部用 `view.entities.create({id})` 创建17的EntityView并注册部件, 对外用一次update表达位置, 姿态, 状态和文本, 不逐部件编程. unregister不使现存图元失去lease, 同ID更换来源需等旧引用释放或用新ID.

## 文档内容

- README: 项目用途, 2D范围, r170/WebGL2前提, 依赖安装, dev/debug/build命令, 最小运行示例与任务入口.
- docs/api: 坐标/弧度/尺寸单位, 图层顺序, 资源注册, 四种图元选项, handle更新, owner事件, 拾取规则, motion模式, 销毁.
- 说明可见像素默认命中, 配置容差/priority及图层过滤的效果, 不将业务priority描述为视觉层级.
- 说明异步资源失败, 03 主导的上下文丢失/恢复, 后台插帧恢复及多Viewer资源所有权. 与各模块的正式行为保持一致.
- 公开扩展点包括高度, 相机与后端适配接口. 首期文档不宣称支持完整3D深度遮挡, 模型拾取或任意HTML图元.
- 保留兼容入口时明确标注迁移步骤, 记录性能场景配置与观察结果, 不写没有等价测量依据的速度倍数.

## 轻量验收

1. 使用公开入口运行完整本地示例, 能创建/更新/拾取/选择/销毁四种图元及一个跨层组合设备,无需导入内部batch/picker实现.
2. 打开两个独立container: 相机, GUI, 选择, 资源引用, motion和图元ID作用域互不干扰, 销毁其中一个后另一个继续使用.
3. 多次创建销毁Viewer后, DOM, RAF, 监听器, 未完成异步请求, GPU对象和GUI引用释放, disposed handle不能操作新对象.
4. 改容器大小, DPR, 后台恢复和上下文恢复后, 显示与拾取保持一致; 不支持WebGL2时按01规则提示.
5. 依赖就绪后运行适当类型检查, 默认build和debug build, 逐一打开关键模块页面. 已知旧source错误独立列出, 不通过放宽全局类型检查隐藏.
6. 仅检查此轮涉及的模块和公开入口, 不建立重型端到端体系. 保留templates与source的原有行为, 将真实业务接入交给用户.

交付时列出公开入口, 示例位置, 验证结果和具体未完成项. 只有功能及公开调用方式已实际落地才能标记整个框架实现完成.
