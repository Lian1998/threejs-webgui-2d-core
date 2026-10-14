# 14. GPU 精准拾取, 容差与优先级

前置: [08 多边形](./08-polygons.md), [09 线](./09-lines.md), [11 精灵](./11-sprites.md), [13 文字](./13-text.md). 契约以 [00](./00-contracts.md) 为准, 不向图元模块反向引入 picker.

## 目标与路径

查询默认返回当次坐标覆盖到的可见图元, 支持透明 mask, CSS 容差, 业务优先级和图层穿透过滤. visible 指图元自身最终 coverage/opacity 达到阈值; 同优先级重叠按画面顺序, 显式高 priority 可以选择视觉下层对象.

- `core/picking/GpuPicker.ts`: pick pass, 读回与查询接口.
- `core/picking/PickIdRegistry.ts`: Viewer 内 ID, generation 和生命周期.
- `core/picking/pickShaders.ts`: 后端共享 shader 的 pick 输出与查询圆盘.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/picking.html`: ID buffer 和结果预览.

参考 [Three.js 官方 GPU picking](https://threejs.org/manual/pages/picking.html) 的离屏 ID 与 alpha mask 方法, 具体 API 以离线 r170 为准. 可借鉴已有 GpuPickManager, 移除其跨 Viewer 静态注册表和固定占用 layer 31 的设计.

## 类型草案

```ts
interface PickRequestToken {
  requestId: number;
  pointerEpoch: number;
  queryEpoch: number;
  hitRevision: number; // 结构/过滤/mask 变化, 不含每帧 motion.
  viewportRevision: number;
}
interface PickIdentity {
  pickId: number;
  generation: number;
  primitiveId: PrimitiveId;
}
interface GpuPicker {
  pickAt(screen: Vec2, query?: PickQuery): PickResult | undefined;
  pickAtAsync(screen: Vec2, query?: PickQuery): Promise<PickResult | undefined>;
  dispose(): void;
}
```

screen/world 使用 02 的坐标约定. PickResult.screen 是本次指针 CSS 坐标, world 是该坐标到平面的投影, 容差命中时也不伪造为几何交点. ownerId/partId 只做逻辑映射, 不以 GPU 槽位或 ownerId 代替 primitiveId.

## 逐图元 ID 与共享 mask

1. 在 Viewer 内分配 `1..0xffffff` 的 RGB24 ID, 0 为未命中. 分配耗尽时报可定位错误, 不能截断 ID; 编码用字节/255, 不经颜色空间转换.
2. 消费 07 的 PrimitiveRenderBackend/RenderFeature. 实例化 quad 和合并几何都必须能逐图元取到 ID 和 hit 参数. 多边形所有片, 文字全部字形及背景共用逻辑 ID.
3. 使用 flat varying 或等价逐 draw 数据避免 ID 插值. 三角形三个顶点归属须一致, 实例重排后一起同步 ID 与属性, 不用 mesh.uuid 代表整个批次.
4. color/pick 共用变换, 几何, UV, 裁剪, 虚线, SDF 阈值, 标签背景和纹理 alpha 的 coverage. 最终 alpha 乘图元 opacity 与图层 opacity.
5. visible 模式丢弃 `alpha <= 0` 或 `alpha < alphaThreshold` 的片元. threshold 默认 0.1, 范围 [0,1], 等于阈值的正 alpha 可命中.
6. bounds 仅支持 sprite/text, 使用其经过相同锚点/旋转/尺寸变换的完整矩形或标签布局框. 忽略该框内纹理/字形洞, 仍检查显隐, opacity 与阈值.
7. 无 blending, tone mapping, fog, dithering, 输出色空间转换或 MSAA. target 使用 RGBA8/UnsignedByte/NoColorSpace/NearestFilter, 清为 ID=0. ID 输出 alpha=1.
8. 首期 2D pick 禁用 depthTest/depthWrite, 顺序由下述 pick plan 决定. 不让 height 或 opaque/transparent 默认排序覆盖契约.

## 一次小块查询的具体算法

1. 查询前 flush 最新逻辑脏数据和本次相机状态. 先过滤 visible/pickable, 图层状态, 缩放区间与 query.layers, 被排除图元不写 ID 也不阻挡其他候选.
2. 由各图元含实际线宽/布局的保守屏幕 bounds, 按自身 tolerancePx 扩大后筛选候选. tolerance 默认 0, 必须有限且非负, 不静默限幅用户值.
3. 用候选最大容差 R 确定指针周围小块, 裁到视口范围. 图元按 `(hit.priority, layer.order, primitive.order, insertionSequence)` 递增绘制, 高 priority 后写入. 通过 07 生成独立 pick plan, 不修改 color queue.
4. 小块相机用 clone/setViewOffset 或等价正交投影裁切. shader 仍接收完整视口尺寸, 完整投影与 scale, 另传 crop 映射/原点; screen 线先在完整投影中扩宽再 crop, SDF 和屏幕 pattern 也不能随 crop 改变.
5. 每图元 pick shader 对片元到查询中心的 CSS 距离执行 `distance <= tolerancePx` 限制. 指针所在中心像素总允许写入, tolerance=0 时其余像素均 discard. 先计算原可见 coverage, 不用加粗矩形填满 mask.
6. render 一次并读回小块. 对每个非零 ID 记录其最近像素距离, 候选按 priority 较高, CSS 距离较小, paintKey 较大决胜. 中心像素距离记 0, 等优先级优先精确命中.
7. 所有图元都在各自容差圆盘外 discard, 因此大容差不会让另一条 tolerance=0 的细线误命中. 同一像素只保留最高 priority/paintKey, 与结果比较顺序一致.
8. 默认无容差可使用 1x1 target. 正容差只读回小块, 不默认扫描整屏或为每个优先级做一轮读回. 可加 bounds 索引, 不以粗 bounds 命中替代可见像素查询.

## 坐标, 状态与异步安全

- DOM client 坐标先经 02 转换为视口 CSS 坐标. drawing buffer 比例用实际 `W/cssWidth` 和 `H/cssHeight`, 支持 DPR 限制, 非整数 DPR 与 CSS 尺寸变化.
- `x=floor(cssX*W/cssWidth)`, `yTop=floor(cssY*H/cssHeight)`, 读回底部坐标为 `H-1-yTop`. 超出边界直接无命中, 不夹到最边缘制造误选.
- 小块内像素距离使用完整 framebuffer 坐标再除对应 CSS 比例, Y 方向正确翻转. 比较采样中心距离时中心像素固定记 0, 避免半像素偏移影响 tolerance=0.
- 保存并在 finally 中恢复 renderTarget, viewport, scissor/test, clearColor/alpha, autoClear 等实际改变的 renderer 状态. 优先克隆相机, 若改用共享相机必须保存完整 view/projection 状态.
- shader 开关, 材质替换和批次过滤也要 finally 恢复; 编译/渲染/读回错误不得损坏下一帧颜色渲染. 不改变业务 handle 的 visible 状态来过滤.
- r170 的 `readRenderTargetPixelsAsync` 用于 hover, 每 Viewer 至多 1 个在途读回. 合并 latest 指针请求, 缓冲与 target 租约独占, 未完成前不覆盖/销毁资源.
- 发起 GPU 渲染与异步读回命令后立即在 finally 恢复相机/renderer/材质, 再 await 读回 promise. dispose 丢弃结果并等已有读回结束后释放其资源.
- pointer/query/camera epoch 变化后丢弃结果. 结构/过滤/mask 使用独立 hitRevision, 删除/复用使用 ID lifetime generation; 请求保留渲染时 snapshot 映射, 不能解析成当前新对象.
- 普通连续 motion 不一律废弃 hover snapshot, 可以返回有限读回延迟的同指针结果并安排最新查询. 不因每帧调度增加 requestId 而使唯一在途结果永远过期; 指针静止时也随 motion 刷新.
- 注销 ID 立即失效, lifetime generation 与 07 的可搬迁 slot generation 分开. 可延迟回收 ID 或保存 generation 快照, 同名逻辑 ID 重建也按新生命周期处理.
- 点击走当次 pickAt, 不依赖 hover 缓存; hover 最多每帧一项且合并连续输入. GPU 错误提供诊断, 不静默返回某个粗 bounds 结果.
- 遵循 03 的 context 协议: 丢失时作废 epochs/在途业务等待, 禁止继续渲染和读回; 恢复后重建 target/读回资源, 保留逻辑 ID 映射并重新查询. 迟到回调不得作用于新 context 的资源.

## 联动与轻量验收

- 14 只返回 PickResult, [15](./15-interaction.md) 管理事件与选择, [17](./17-composition.md) 消费 ownerId/partId. 07 提供逐图元参数和可排序 pick plan, 图元不注册全局 picker.
- 同页构造透明 PNG 洞, SDF 字形/背景, 带孔多边形, 虚线与同批多实例. 默认洞和虚线间隙不命中, 透过过滤图层可选到下层.
- 比较 priority=0 的绘制顺序与显式 priority 覆盖, 0/5px 容差的不同线交叠, 确认一条线的容差不会扩大另一条线.
- DPR=1/2/1.25, 窗口缩放, 四个边角和移动相机均命中正确; crop 前后线宽与文字 mask 一致.
- 连续 hover 后点击, 快速删对象并复用 ID, 异步未完成时 dispose, 均无错选/残留事件. 模拟一次渲染错误后颜色视图仍正常.
- 只添加 ID 编解码, Y 翻转, 候选比较的少量纯函数检查, 页面记录 pick pass 与读回耗时, 不建立重型 GPU 测试体系.
