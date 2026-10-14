# 15. 悬浮, 点击与选择状态

前置: [02 视口](./02-viewport-coordinates.md), [05 图层](./05-layers-order.md), [14 拾取](./14-gpu-picking.md). 事件名和 PickResult 以 [00 契约](./00-contracts.md) 为准.

## 目标与路径

建立 Viewer 作用域的交互控制器, 支持 pointerenter/pointerleave, select/deselect, dblclick, 程序化选择与聚焦. 拾取原语仍为 primitiveId, 选择可按 ownerId 汇总设备, 状态不能放在设备类静态字段或 window 全局.

- `core/interaction/InteractionController.ts`: DOM 输入, 拾取请求和事件派发.
- `core/interaction/SelectionStore.ts`: 当前 hover/selection 与生命周期跟踪.
- `core/interaction/interactionTypes.ts`: 控制选项与程序化调用.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/interaction.html`: 事件日志与选择控件.

现有 `GpuPickCommonListener.ts` 与旧模板 `selectPipeLine.js` 只供参考. 不继承旧代码依赖上次 hover 才能点击, 用 undefined ID 比较所有对象的行为.

## 类型草案

```ts
interface InteractionOptions {
  hover?: boolean;
  selectionMode?: "primitive" | "owner"; // 默认 owner, 缺 ownerId 回退 primitive.
  clickMoveTolerancePx?: number;
  doubleClickDelayMs?: number;
  query?: PickQuery;
}

type SelectionTarget =
  | { primitiveId: PrimitiveId }
  | { ownerId: EntityId; preferredPartId?: string };

interface SelectionOptions {
  focus?: boolean;
  scale?: number; // CSS 像素/米, 不复用 OpenLayers zoom 数字.
  durationMs?: number;
}
interface SelectionChange {
  previous?: PickResult;
  current?: PickResult;
  selectionChanged: boolean; // 同 owner 内换部件为 false, GUI 仍需要更新目标.
}

interface InteractionController {
  readonly hovered: PickResult | undefined;
  readonly selected: PickResult | undefined;
  select(target: SelectionTarget, options?: SelectionOptions): boolean;
  onSelectionChange(listener: (change: SelectionChange) => void): () => void;
  clearSelection(): void;
  setQuery(query: PickQuery): void;
  dispose(): void;
}
```

按 owner 选择时用 `owner:${ownerId}` 和 `primitive:${primitiveId}` 等明确命名空间生成内部 key, 不直接比较两个可选字符串. 默认单选, 不在本任务引入框选, 多选或拖拽编辑.

## 输入与派发步骤

1. DOM 监听挂在容器/canvas, 经 02 将 client 坐标转换为视口 CSS 坐标. 维护 pointerEpoch 与当前有效指针, pointerleave/pointercancel 立即清除 hover 并作废在途请求.
2. pointermove 合并到调度器, 每帧最多发起一个最新 hover 查询. 14 返回过期结果时不派发事件, 指针仍有效则调度最新请求; 不让旧响应覆盖新 hover.
3. hover 始终按 primitive 生命周期比较. 同一 owner 的 body 移到 label 仍发 body.pointerleave 与 label.pointerenter, 事件中保留真实 ownerId/partId.
4. 每次切换先派发旧 pointerleave 再派新 pointerenter, 同图元重复查询不重复触发. 事件 target 是真实 PrimitiveHandle, hit 是对应结果, nativeEvent 仅在有 DOM 输入时附带.
5. 记录 pointerdown 的指针, 起点与时刻, 对超过 CSS 移动阈值的 pan/drag 不触发选择. 与 02 的视口控制器共享手势判定, 不并行响应同一次拖动为点击.
6. 接受 click 时同步拾取该次事件坐标, 不读取 hover 缓存. 当次 pick 之前 flush 图元/视口更新, 结果不能指向已释放 handle.
7. 选中不同 selection key 时先派旧 deselect 再派新 select; 点击空白清除. 点击同一 selection key 不重复派 select, 只更新最近命中部件的 selected 快照.
8. owner 模式下跨同设备部件不取消设备选择. 保存首次 select 的事件目标与其生命周期, deselect 发给该目标; 若该目标已删除则通过失效处理清除状态.
   selection key 或命中 primitive 改变时提交 SelectionChange, 提供 previous/current. 设备级业务可只处理 selectionChanged=true, GUI 则跟随 current 的具体实例; 同部件重复命中不重复通知.
9. 使用可配置双击窗口, 默认 250ms. 第一次 click 即选择; 同一有效 selection key 的第二次点击触发 dblclick, 不先取消/重选. 合并 DOM dblclick 与内部计时, 禁止重复派发.
10. 双击也对第二次事件坐标重新 pick. 超过移动阈值, 跨对象, 超时或当前图元失效时重置双击记录; 视口双击缩放与图元双击采用明确消费规则.

## 程序化选择与失效

- `select({primitiveId})` 通过 04 注册表查找有效 handle. owner 查询由注册表的 owner 索引提供, 不要求 17 先实现.
- owner 有多个部件时优先 preferredPartId, 否则选择当前可见可选部件中 paintKey 最大者. 无匹配或被 query/图层状态过滤时返回 false, 不悄悄清除原选择.
- 程序化选择产生同名 select/deselect 事件, 不构造假的 DOM event. PickResult.screen/world 由该部件锚点投影获得, 不声称经过真实像素拾取.
- focus 对 owner 合并有效部件世界 bounds, 对 primitive 使用自身 bounds. scale 不传用 02.fitBounds, 传入则居中并使用该 scale; durationMs=0 立即定位, 否则用 03 调度平滑更新 02.setView, 不硬编码旧框架 zoom.
- 清空选择会派 deselect, 重复清空不派事件. owner 最后一个有效部件消失, 选中事件目标删除时清除选择; 不把状态转给同 ID 的新生命周期对象.
- 图层/图元隐藏, pickable 关闭, 缩放区间不满足或 query 改变时重新验证 hover/selection, 无效状态按顺序发 leave/deselect. 删除通知须在 handle 事件订阅被释放前完成.
- viewport/动画/对象变化时, 指针不动也需要合并一次 hover 重新查询, 不能只由 pointermove 驱动. 依赖 03 的 dirty/afterFrame 通知, 不另建永久 rAF.
- 回调可能调用 dispose, 隐藏对象或改变选择. 派发用稳定快照和受保护的状态提交, 检查生命周期并队列化重入操作, 避免发给已失效对象或递归循环.
- dispose 时取消事件订阅, DOM 监听, 计时器和待派发任务, 作废异步请求. 已在 GPU 中的读回由 14 安全收尾, controller 不等待它再释放 DOM.

## 联动与轻量验收

- [17 组合](./17-composition.md) 可根据事件 ownerId 更新整台设备样式. 15 不负责业务信息卡或默认改色, [18 GUI](./18-debug-gui.md) 通过 selected 实例打开面板.
- 一个 debug 页面展示 body/label/route 三个共享 ownerId 的部件与另一台设备, 同时输出原始 primitive 事件和当前设备选择.
- 跨部件 hover 可见正确 enter/leave, 同 owner 点击不重复设备 select, 跨设备和空白依次 deselect/select.
- 高频移动立即点击时点击结果准确; 拖动超过阈值不选择, 双击只触发一次 dblclick, 视口手势不冲突.
- 鼠标静止时移动设备/相机, 隐藏层, 删除目标或修改 query, hover/selection 能失效或刷新, 同 ID 重建不继承旧选择.
- 程序化按 primitive/owner 选择与 focus 可用; 回调内删除目标或 clearSelection 不产生递归事件风暴.
- 重复创建/销毁 Viewer 后无重复 DOM 事件或计时器. 只补选择 key, 状态转换和双击去重的必要纯函数检查.
