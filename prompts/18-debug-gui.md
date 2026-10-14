# 18. 每实例调试 GUI

前置: 04, 15. 联动: 03, 08, 09, 11, 13, 17. 先读 00 与对应前置文档.

## 目标与范围

用显式装饰器元数据和本地 lil-gui 自动生成每个逻辑图元/组合设备的调试面板.
反射限于已声明的可调字段, 不尝试从被擦除的 TypeScript 接口自动还原控件类型.
采用对象组合注册调试能力, 不要求图元继承 DebugGUI Mixin 或修改 Three.js 原型.
只在开发或显式 debug 构建加载和保存调试实例, 默认生产路径不创建 GUI, 实例集合或外部监听. 统一使用 01 定义的 `__WEBGUI_DEBUG__`, 不用 DEV 单独判断 debug 构建.

## 建议目录与调试入口

- `core/dev/gui/metadata.ts`: 装饰器及父子类元数据合并.
- `core/dev/gui/DebugRegistry.ts`: Viewer 作用域实例注册与注销通知.
- `core/dev/gui/DebugGUIManager.ts`: 控件, 选中实例和生命周期.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/debug-gui.html`.
- 可参考 `core/Mixins/DebugGUI`, 不沿用父构造期间注册实例与只删集合的注销行为.

## 必要类型草案

```ts
type DebugControlKind = "number" | "boolean" | "color" | "string"
  | "select" | "vec2" | "action";

interface DebugFieldOptions {
  kind: DebugControlKind;
  name?: string;
  folder?: string;
  order?: number;
  min?: number;
  max?: number;
  step?: number;
  choices?: readonly string[];
  readOnly?: boolean;
  read?: (instance: object) => unknown;
  write?: (instance: object, value: unknown) => void;
}

declare function DebugField(options: DebugFieldOptions): PropertyDecorator & MethodDecorator;

interface DebugInspectable {
  readonly debugId: string;
  readonly target: object;
  readonly label: string;
}

interface DebugRegistry {
  register(instance: DebugInspectable): () => void;
  onChange(listener: () => void): () => void;
  dispose(): void;
}
```

默认 read/write 访问被装饰的 getter/setter, 也允许显式 read/write 将嵌套字段映射到 handle.update.
禁止控件直接改写 getOptions() 快照, 内部数组或 THREE.BufferAttribute, action 调用正式操作方法.

## 实现步骤

1. 复用 01 的 legacy decorators 配置, 元数据挂在当前类自有 Symbol 属性上.
   不引入 reflect-metadata 依赖, 不依赖 emitDecoratorMetadata 自动推断 union, 元组或嵌套类型.
   decorator 在 `__WEBGUI_DEBUG__` 分支中登记元数据, 关闭时返回空操作. 装饰的代理与元数据模块都放在 dev 目录, 核心图元不静态导入它们.
2. 收集从父类到子类的元数据, 以 property 标识覆盖同名父字段, 子类配置优先.
   保留明确 order, 不读取未声明的私有字段. 返回元数据副本, 不修改父类的共享数组.
3. 各 handle 在完整初始化之后通过组合注入的 registry 注册, 返回幂等注销函数.
   注册放在 factory 或构造完成后的 attach 阶段, GUI 已挂载时也不会读取未初始化的子类字段.
4. Viewer 在 `__WEBGUI_DEBUG__ && options.debug?.gui` 分支动态导入 dev attach 模块,
   该模块再导入代理, 元数据和 `three/addons/libs/lil-gui.module.min.js`. 使用本地别名, 不请求 CDN.
   关闭时无副作用, 默认生产构建可移除整个调试依赖图. 异步 attach 返回时检查 Viewer 存活, 销毁后不再建 GUI.
5. 控件绑定独立 panel model, getter 快照只用于读取初值和刷新显示.
   每次编辑经 write, 正式 setter 或 update 提交, 统一触发校验, GPU 脏范围与 03 调度.
6. number/string/select/boolean 同样经更新入口, vec2 分量编辑先构造新元组再提交整体,
   color 编辑先构造 ColorInput, 不依赖 lil-gui 直接修改 THREE.Color 绕过 setter 的行为.
7. 图元调试代理可提供被装饰的 getter/setter, 代理组合持有 handle, 不继承图元能力基类.
   对位置调用 setPosition, 对 alpha, 线宽, 文本等调用 update/setText, 与业务编辑完全一致.
8. 默认展示 15 当前选中实例, 允许按 debugId/ownerId 查找和切换, 每个实例都有独立控件.
   大量实例使用列表搜索并按需建面板, 不在创建几万个图元时立刻建立几万个 folder.
   订阅 15 的 onSelectionChange, 同 owner 内切换部件也更新面板, 不只依赖被去重的 select 事件.
9. 17 的设备面板修改设备公开变换/部件 API, 选中部件仍可单独检查.
   registry 保存业务可读 debugId, 不用变化的 GPU slot 或 Three.js 内部 instanceId 作为显示标识.
10. 程序化更新通过 04 的 registry.onChanged/PrimitiveChange 单帧通知刷新 panel model. 若使用 lil-gui.listen(),
    只监听 dev panel model, 控制器切换/注销时停止 listen 和 RAF, 不创建生产持续 RAF.
11. 注销即时移除对应控件, folder, Map 引用和选中关联, 同时退订目标变更/交互事件.
    GUI Manager.destroy 与 Viewer.dispose 都幂等, 热更新重建前清理旧面板和监听.

## 使用草案与联动

```ts
class TextDebugProxy {
  constructor(private target: TextHandle) {}
  @DebugField({ kind: "string", name: "内容" })
  get text() { return this.target.getOptions().text; }
  set text(value: string) { this.target.setText(value); }
}
// handle 完成初始化后, 由 dev attach 阶段调用.
const unregister = registry.register({ debugId: label.id, target: proxy, label: "设备标签" });
// label.dispose 时执行 unregister, manager 收到注销变化后同时清理控件.
```

图元字段元数据由各模块补充, GUI 不需要先复制整套图元 options. 20 汇总可选 dev 启用入口.
组件替换和 getter-only 属性必须显式 write 或声明只读展示, 不静默直接覆盖只读 getter.

## 轻量验收

- 图元与 GUI 挂载的两种先后顺序都可调, 子类默认字段显示正确, 同名字段子类配置覆盖父类.
- 精灵, 文字, 线和多边形各有两个不同实例, 编辑一个仅更新该实例且无需手工 render.
- 位置, vec2, 颜色, 文本和资源换图都走公开更新入口, 数组/Color 不会绕过脏标记.
- 程序化插帧或 update 能安全刷新当前面板, 快照不被控件修改, GUI 切换不改变业务状态.
- 注销, 销毁和 HMR 后旧 folder/实例/事件/listen RAF 全部释放, 重复清理不抛异常.
- 默认生产构建无 lil-gui 模块, 调试代理, 实例集合和 GUI DOM; 开发及显式 debug 构建都可使用离线本地 lil-gui.
