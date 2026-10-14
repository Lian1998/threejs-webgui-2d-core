# Viewer2D API

新业务从 `core/public.ts` 导入, 在本项目中可写 `@core/public`. 当前渲染基于离线 Three.js r170 和 WebGL2, 提供工业监控画面的 2D 图元, 批量渲染, GPU 拾取和设备插帧. 完整示例见 [SimulatedDevice](../core/examples/SimulatedDevice.ts) 和 [交付调试页](../multi-pages/debug/refactor/delivery.html).

## 创建视图与注册资源

容器必须有实际宽高. Viewer 自动添加 canvas, 跟踪容器尺寸/DPR, 并在图元更新后调度渲染.

```ts
import { Viewer2D } from "@core/public";

const view = new Viewer2D({
  container: document.querySelector<HTMLElement>("#map")!,
  background: "#17242b",
  center: [0, 0],
  scale: 10, // CSS px / 米.
  maxDpr: 2,
  controls: true,
  onError: error => console.error(error),
});

view.layers.add({ id: "devices", order: 20 });
view.layers.add({ id: "labels", order: 30 });
const coverage = [...new Set([...(await fetch("/fonts/demo-coverage.txt").then(r => r.text()))]
  .filter(ch => ch !== "\n" && ch !== "\r"))];
await Promise.all([
  view.resources.sprites.register({ id: "body", url: "/debug/body.svg" }),
  view.resources.fonts.register({
    id: "demo", family: "Noto Sans SC Demo", url: "/fonts/NotoSansSC-demo.woff2",
    weight: "400", coverage,
  }),
]);
```

`sprites.register({ id, url })` 和 `fonts.register({ id, url, family, weight?, style?, fallbackIds?, coverage? })` 返回预加载 Promise. URL 使用部署时可访问的本地文件. 同 ID 的不同来源不能直接覆盖, 换图/字体优先注册新 ID 并更新图元.

仓库的 `NotoSansSC-demo.woff2` 仅包含演示所需字符. 业务中文标签应换成本地完整字体, 或提供准确的 `coverage: string[]` 和已经注册的 `fallbackIds`. coverage 每项是一个 Unicode 字符. 明确缺字时依次尝试 fallback, 最终使用方框占位; 未提供 coverage 时无法可靠检测字体是否缺字. 当前文字按字符布局, 支持中文, 换行和简单自动换行, 不提供复杂语言 shaping, 双向文字或富文本排版.

## 坐标, 单位与视口

所有图元位置, 几何点和 motion 样本均为局部米坐标 `Vec2 = readonly [x, y]`, x 向右, y 向上. Three 内部映射为 `(x, height, -y)`. rotation 是绕平面的弧度, 正值在逻辑 XY 中逆时针. 业务 heading 应先转换为此约定.

```ts
import { LocalCoordinateAdapter } from "@core/public";
const coordinates = new LocalCoordinateAdapter({
  origin: [1_000_000_000, 2_000_000_000], unitsPerMeter: 1000,
  axis: [1, -1], // 可选, 对外部坐标轴翻转.
});
const position = coordinates.toLocal([1_000_012_000, 1_999_996_000]);
const original = coordinates.fromLocal(position);

view.viewport.setView({ center: position, scale: 20 });
view.viewport.fitBounds([[-20, -10], [20, 10]], 24);
const screen = view.viewport.worldToScreen(position);
const world = view.viewport.screenToWorld(screen);
```

投影转换由应用实现 `CoordinateAdapter`, CPU double 下先换算并减固定局部原点, 再传局部坐标给图元. 不直接把大投影坐标写入 GPU float32. 此适配器不会自动应用到 Viewer 或 motion.

screen 是 canvas 内容区域的 CSS px, 原点在左上角. DOM client 坐标用 `viewport.clientToScreen([clientX, clientY])` 转换. `sizeMode: "world"` 使用米, `"screen"` 使用 CSS px; 业务不乘 DPR. 默认控制支持拖动平移与光标位置滚轮缩放. `controls: false` 关闭它们. `viewport.state`, `cssSize`, `dpr`, `revision` 可读取, `onChange(callback)` 返回退订函数. 零尺寸时跳过绘制, 尺寸恢复后更新相机.

## 共同选项与更新

四种图元均接受以下选项. layer 必须已注册, Viewer 自带 `default` 图层.

颜色字符串/数字表达 RGB. 透明度使用 `opacity` 或 `background.opacity`, 不依赖 `rgba(...)` 中的 alpha 被 Three.Color 保留.

| 字段 | 默认/含义 |
| --- | --- |
| `id` | 可选字符串, 自动生成时也保持稳定; 同 Viewer 不可重复或修改 |
| `layer`, `order` | 已注册 layer ID; 图元 order 默认 0 |
| `ownerId`, `partId` | 可选业务设备 ID/部件名, 与 GPU ID 分离 |
| `transform` | `position: [0,0]`, `rotation: 0`, `scale: [1,1]`, `height: 0` |
| `visible`, `pickable`, `opacity` | true, true, 1; opacity 范围 [0,1] |
| `hit` | `{ mode: "visible", alphaThreshold: 0.1, tolerancePx: 0, priority: 0 }` |

```ts
body.setPosition([13, 24]).setRotation(Math.PI / 2);
body.update({ transform: { height: 0.5 }, opacity: 0.8, hit: { priority: 5 } });
body.setVisible(false);
const snapshot = body.getOptions();
const sameBody = view.primitives.get(body.id);
```

`update` 合并顶层选项, 并分别合并 `transform` 和 `hit` 子字段. geometry, points, dash, background, outline 等其他对象/数组按整个字段替换. 输入数组会复制, `getOptions()` 返回只读快照, 不通过修改快照更新图元. 几何, 数值或图层校验失败时同步抛错且保留原状态, 图片/字体加载失败则通过 ready 拒绝. 更新会自动标脏并请求帧, 一般无需 `view.flush()`; flush 用于立即处理当下更新和绘制.

## 四种图元

### 多边形

```ts
const area = view.primitives.addPolygon({
  id: "restricted-area", layer: "default", fill: "#456c85", opacity: 0.7,
  geometry: { type: "Polygon", polygon: {
    outer: [[0, 0], [8, 0], [8, 6], [0, 6]],
    holes: [[[2, 2], [2, 4], [4, 4], [4, 2]]],
  } },
});
area.setFill("#668a9d");
area.setGeometry({ type: "MultiPolygon", polygons: [
  { outer: [[0, 0], [2, 0], [2, 2], [0, 2]] },
  { outer: [[5, 0], [7, 0], [7, 2], [5, 2]] },
] });
```

每个 polygon 有一个外环和零个或多个孔洞. 环可以省略末尾重复的首点, 不要求业务手工统一环方向. 输入应为合法简单多边形, 孔洞位于外环内且各环不相交. dev/debug 开启完整环相交/孔洞检查并拒绝非法输入; 生产仅执行有限值, 顶点和退化等基本校验, 应在业务数据入口保证拓扑合法. 空几何可保留 handle 但不绘制/拾取. MultiPolygon 是独立区域集合. `fill` 支持 CSS 颜色字符串或十六进制数字, 不直接传可变 THREE.Color.

### 线

```ts
const route = view.primitives.addLine({
  layer: "default", points: [[0, 0], [4, 1], [8, 0]],
  color: "#edc676", width: 3, widthMode: "screen",
  cap: "round", join: "miter", miterLimit: 4,
  dash: { length: 8, gap: 5, offset: 0, sizeMode: "screen" },
  hit: { tolerancePx: 6, priority: 10 },
});
route.setPoints([[0, 0], [4, 2]]).setWidth(4).setColor("#ffffff");
route.update({ dash: null });
```

widthMode 默认 screen, dash.sizeMode 默认 screen, 也可各自设置 world. dash.length/gap/offset 采用其 sizeMode 的单位. closed 默认 false, cap 默认 butt, join 默认 miter; join 可选 bevel, miter 超过 miterLimit 时降为 bevel. 点数组可增减, 相邻重复点会清理, 不足两点时不绘制. 多条互不相连的线路使用多个 handle, 每条都保留自身 owner/hit 身份.

### 精灵

```ts
const body = view.primitives.addSprite({
  id: "truck-1/body", layer: "devices", image: "body",
  size: [2.2, 3.7], sizeMode: "world", anchor: [0.5, 0.5], tint: "#ffffff",
  ownerId: "truck-1", partId: "body", transform: { position: [12, 24] },
});
await body.ready();
body.setSize([28, 40], "screen").setTint("#ffd89a");
// 注册新资源后再 body.setImage("another-image").
```

sizeMode 默认 world, size 两项均须大于 0. anchor 是图片尺寸的归一化锚点, 默认居中. tint 默认白色. PNG/SVG 透明区域由图像 alpha 决定, shader 与拾取共用覆盖计算. atlas 页有容量上限, 大图可能按默认页尺寸缩小, 注册失败应处理 Promise rejection.

### 文字

```ts
const label = view.primitives.addText({
  layer: "labels", text: "设备 001\n正常", font: "demo",
  fontSize: 18, sizeMode: "screen", color: "#eaf8ff",
  align: "center", anchor: [0.5, 0.5], lineHeight: 23,
  letterSpacing: 0, maxWidth: 160, padding: [4, 7, 4, 7],
  outline: { color: "#17242b", width: 0.6 },
  background: { color: "#355061", opacity: 0.9, radius: 5 },
});
await label.ready();
label.setText("设备 001\n故障");
await label.ready();
```

sizeMode 默认 world, padding 顺序为上/右/下/左. fontSize, lineHeight, letterSpacing, maxWidth, padding, outline.width, background.radius 使用对应 sizeMode 的单位. lineHeight 默认 fontSize × 1.2, align 默认 left, anchor 默认居中. 描边宽度受字形 SDF 的安全范围限制, 过大的请求会限制到可用范围. 空字符串不绘制; 可见模式只命中字形/描边/可见背景, 空格和透明留白不命中. bounds 模式使用完整排版矩形, 仍受图元/图层有效 opacity 和 alphaThreshold 限制.

## 图层和顺序

```ts
const lines = view.layers.add({
  id: "pipelines", order: 10, visible: true, pickable: true, opacity: 1,
  minScale: 2, maxScale: 200,
});
route.update({ layer: "pipelines", order: 3 });
lines.update({ opacity: 0.5 });
lines.setVisible(false);
view.layers.remove("pipelines", { disposePrimitives: true });
```

2D 画面依次按 layer.order, primitive.order, 创建顺序绘制, 后绘制覆盖先绘制. 物理 height 不改变这个顺序. 图层 opacity 与图元 opacity 相乘, visible/pickable 独立控制. scale 可见区间为 `[minScale, maxScale)`, scale 单位为 CSS px/米. 删除非空图层默认抛错, 可先销毁/迁移图元或显式 disposePrimitives.

## 拾取, 设备身份与事件

```ts
const hit = view.picking.pickAt([100, 80], { layers: ["devices", "labels"] });
const hoverHit = await view.picking.pickAtAsync([100, 80]);
body.on("select", event => console.log(event.hit?.ownerId, event.hit?.partId));
const unsubscribe = view.interaction.onSelectionChange(({ previous, current, selectionChanged }) => {
  console.log(current?.primitiveId, selectionChanged);
});
view.interaction.select({ ownerId: "truck-1", preferredPartId: "body" }, { focus: true, durationMs: 300 });
view.interaction.setQuery({ layers: ["devices", "labels"] });
view.interaction.clearSelection();
unsubscribe();
```

结果为 `{ primitiveId, ownerId?, partId?, layerId, screen, world }`. world 是查询指针的平面位置, 容差命中时不代表最近的线段顶点. 默认按达到 alphaThreshold 的可见像素命中; 孔洞, PNG 透明区, 文字空白和 dash gap 不命中. `hit.mode: "bounds"` 仅适用于 sprite/text. tolerancePx 是每图元的 CSS px 搜索半径, 可命中附近的实际可见片段, 不把整条虚线的空隙直接视作实体.

同一查询中优先较高业务 hit.priority, 同优先级比较距指针距离, 再按 2D 绘制顺序决胜. priority 不改变画面显示顺序. query.layers 只保留指定图层参与拾取, 其他层允许穿透; visible=false/pickable=false 的对象也不挡住可选对象.

默认交互按 ownerId 合并设备选择, 无 owner 时按 primitiveId. 同设备切换部件不重复 select/deselect, 但 `onSelectionChange` 返回新的部件并将 selectionChanged 设为 false. 图元事件包括 pointerenter, pointerleave, select, deselect, dblclick; `on` 返回退订函数. 点击空白清选择, 拖动平移不触发点击选择. 程序化选择也可用 `{ primitiveId }`, focus 支持可选 scale.

hover 异步读回最多一个进行中, 合并最新指针请求; 指针, 查询, 相机或结构身份变化时丢弃过期结果, 连续位置运动允许有限延迟的 hover. click 使用当次更新后的同步拾取. 删除, 隐藏或过滤当前目标会清理关联状态. `interaction.hovered`/`selected` 返回快照.

## 资源失败与 lease

图片/字体注册和 sprite/text 的 `ready()` 均可能 reject. `Viewer2DOptions.onError` 接收后台准备错误; 业务需要在依赖资源完成时显式 await/catch. ready 对应当前最新一次异步准备, 更新 image/font/text 后重新调用. 加载失败不会复活已销毁对象. register 失败可修复来源后重试; 已失败图元使用新资源 ID 再 update 触发准备, 或在注册成功后重建. 对同一选项的无变化 update 不会重新发起加载.

注册持有预加载引用, 图元另持资源引用. `resources.sprites.unregister(id)`/`fonts.unregister(id)` 阻止新的申请, 已经取得 lease 的图元仍可显示. 同 ID 换源须等旧引用释放, 或直接使用新 ID. 资源释放不重新排列仍在使用的 atlas UV; atlas 空间主要在 Viewer 销毁时整体回收, 长期大量换图应关注 `view.snapshot()` 页数.

独立扩展模块可使用公开 `ResourceStore`:

```ts
import { ResourceStore } from "@core/public";
const store = new ResourceStore();
const cancellation = new AbortController();
const lease = await store.acquire("binary:local-config", async signal => {
  const response = await fetch("/config.bin", { signal });
  if (!response.ok) throw new Error("配置加载失败");
  return response.arrayBuffer();
}, () => {}, { signal: cancellation.signal });
const bytes = lease.value;
lease.release(); // 幂等, 最后引用释放时执行 disposer.
store.dispose();
```

同 key 共享一次加载; AbortSignal 只取消当前申请, 其他消费者仍可完成. 同 key 必须使用一致的 loader/disposer 语义. lease.release 或 Store.dispose 后不能再读取 lease.value. Viewer 默认分别拥有资源与字体内部 family, 两个 Viewer 的 ID, 选择, 运动和销毁互不影响.

## 插帧

```ts
const movement = view.motion.bind(body, { mode: "latest", durationMs: 160 });
movement.push({ position: [12, 24], rotation: 0 }); // 首个样本直接建立姿态.
movement.push({ position: [15, 24], rotation: Math.PI / 2 });
movement.pause();
body.setPosition([14, 25]);
movement.resume();
movement.snap({ position: [15, 24], rotation: Math.PI / 2 });
```

latest 默认从当前显示姿态向最新样本插值, 新样本可以打断旧目标, rotation 走最短角路径. 默认 durationMs=160, staleAfterMs=5000. 可配置 snapDistance 和 maxGapMs, 超过距离/间隔直接建立新姿态. 无新数据时停止并保持, 不无界外推. pause 时继续接受样本但不写目标; resume 对有 transform 的图元/实体从手动编辑姿态继续.

```ts
// 示例服务时间为 Date.now 毫秒, 映射到 scheduler.now() 的时钟域.
const clockOffset = view.scheduler.now() - Date.now();
const timedMovement = view.motion.bind(label, {
  mode: "timestamped", delayMs: 100,
  normalizeTime: timestampMs => timestampMs + clockOffset,
  maxSamples: 120, maxBufferedMs: 60_000,
});
timedMovement.push({ position: [12, 24], rotation: 0, timestampMs: Date.now() });
```

timestamped 必须传 normalizeTime, 每个样本必须有有限 timestampMs. 实际系统应校准网络/服务时钟偏移, 不混用 epoch 时间与 performance.now. 按当前时钟减 delayMs 回放, 可插入尚未播放的乱序样本并替换重复时间样本; 已播放的旧样本丢弃, 缓冲受数量与跨度限制. movement.state 为 idle/moving/stale/disposed. 每目标只允许一个 binding, `view.motion.getBinding(target)` 可查询; binding.dispose 取消运动, 图元/实体销毁自动取消. motion 仅处理位置/角度, 路线 points 和拓扑由业务 update.

## 组合设备

```ts
const entity = view.entities.create({ id: "vehicle-2", transform: { position: [20, 10] } });
const part = view.primitives.addSprite({ layer: "devices", image: "body", size: [2, 4] });
const caption = view.primitives.addText({ layer: "labels", font: "demo", text: "设备 002",
  fontSize: 14, sizeMode: "screen", transform: { position: [0, -3] } });
entity.addPart("body", part).addPart("label", caption);
entity.setPosition([22, 11]).setRotation(Math.PI / 4);
const entityMotion = view.motion.bind(entity, { durationMs: 180 });
entityMotion.push({ position: [23, 11], rotation: Math.PI / 4 });
```

部件的 transform 是局部值, attach 自动设置 ownerId/partId. Entity 父矩阵和 visible 与部件状态组合, 保留非均匀缩放造成的剪切, 不反复改写原始几何. 同部件不能同时归属多个实体, part 名不可重复. 父级显示恢复不会恢复原本隐藏的部件.

`entity.removePart(name)` 默认 detach 并保留世界姿态, 清 owner/part 归属. 无法用 Transform2D 表示的剪切或零轴缩放会在 detach 前拒绝, 原归属保持. `removePart(name, { dispose: true })` 直接销毁. `entity.dispose()` 销毁其随动部件并释放运动/GUI/索引. entity 支持 setTransform, setScale, setHeight, setVisible, getPart 和只读 transform.

历史路线通常保留世界坐标, 单独创建带相同 ownerId 的 line, 不加入 entity 父变换. 应用设备类负责一起更新/销毁路线与 entity. 通用框架不硬编码设备业务字段; [SimulatedDevice](../core/examples/SimulatedDevice.ts) 演示资源 ID, 随动部件, 世界路线与低频姿态数据的组合.

## 生命周期, 调试与扩展

`handle.dispose()`, entity.dispose 和 view.dispose 均幂等. 单独移除图元用 handle.dispose, 不操作 GPU 槽位. 每个 on/onChange/onDispose 返回的退订函数应在应用自己的生命周期中调用. 页面/HMR 销毁时调用 view.dispose, 它会取消 RAF/DOM/observer/异步请求/运动/GUI, 释放资源和 GPU 对象并移除 canvas. 已销毁 handle 的 setter 会抛错, 即使随后同 ID 被重建也不能操作新对象.

浏览器后台和 WebGL context loss 会暂停调度; 恢复后更新当前时钟的运动姿态, 重传必要资源并重绘, 不补跑后台积累的所有帧. `view.stats` 与 `view.snapshot()` 可查看帧数, 批次, 上传, 资源和拾取情况, 它们用于观察实际场景, 不保证固定帧率.

每实例 GUI 通过 `new Viewer2D({ container, debug: { gui: true } })` 开启. 只有 `__WEBGUI_DEBUG__` 为 true 才动态加载本地 lil-gui/装饰器代理; Vite dev 与 `build:debug` 启用, `build:core` 默认关闭并移除该依赖. GUI 展示选中图元, 支持按实例/owner 搜索和设备面板; 编辑经正式 update/setter, 手动改姿态会暂停已有 motion, 可用面板动作恢复. 扩展字段在 `core/dev/gui` 使用显式 DebugField, 不修改 Three 原型或只读快照.

`Viewer2DOptions.cameraAdapter` 接受 `CameraAdapter`: camera 为 THREE.Camera, update(state, cssSize) 更新相机, screenToWorld/worldToScreen 共用该相机投影. 默认 OrthographicCameraAdapter 保持上述 2D 导航. height, CameraAdapter 和公开 PrimitiveRenderBackend/RenderContext 接口为后续适配预留边界; 当前 Viewer 内部装配四个后端, 自定义后端需要扩展装配层. 当前 bounds, 屏幕尺寸和排序仍遵循 2D 平面规则, 不宣称完整透视3D导航, 深度遮挡, 模型拾取或 HTML 图元支持.

## 旧入口迁移

`source` 与 `templates` 保留原实现. `core/index.ts` 同时提供新公共入口和旧兼容导出, 新代码应明确导入 `core/public.ts`, 旧代码可明确导入 `core/legacy.ts`. 新 EntityId 为字符串; 旧 ECS 数字类型在总入口另名为 LegacyEntityId.

| 旧调用/概念 | 新调用 |
| --- | --- |
| MeshPolygon/MeshLine/Sprite2D/SDFText2D | primitives.addPolygon/addLine/addSprite/addText 返回逻辑 handle |
| 手工更新 BufferAttribute/实例索引 | handle.update 和专用 setter |
| 每设备 RAF/手工 renderer.render | motion.bind + push, Viewer 统一调度 |
| OpenLayers Feature/Style 或 Mesh 身份 | primitiveId + ownerId + partId |
| 直接平移所有相关对象 | EntityView 组合随动部件, 世界路线单独维护 |
| 旧 GPU picker 数字 ID | view.picking 返回稳定业务 ID |

旧 ECS/actor, 事件和图元构造方式没有自动等价映射. 按模块迁移坐标, 资源, 图层, 图元, 设备组合与释放代码, 不只替换 import 名称. 多边形明确 outer/holes, 线宽和字体尺寸明确 world/screen, 点击业务从 event.hit.ownerId/partId 取设备身份.
