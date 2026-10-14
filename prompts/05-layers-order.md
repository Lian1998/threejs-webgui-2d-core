# 05. 图层与显示顺序

前置: [04](./04-primitives.md), 02 为传递依赖. 后续: 07, 14, 15, 17. 类型见 [00](./00-contracts.md).

## 目标与接口

实现文件: `core/layers/LayerManager.ts`, `core/batches/BatchManager.ts`. 有序渲染计划在 BatchManager 内生成, 不增加只有一次转发的 RenderPlan 类. 调试页: `multi-pages/debug/refactor/layers.html`.

```ts
interface LayerHandle {
  readonly id: LayerId;
  update(patch: Partial<Omit<LayerOptions, "id">>): this;
  setVisible(visible: boolean): this;
}
interface LayerManager {
  add(options: LayerOptions): LayerHandle;
  get(id: LayerId): LayerHandle | undefined;
  remove(id: LayerId, options?: { disposePrimitives?: boolean }): void;
}
interface PaintKey {
  layerOrder: number;
  primitiveOrder: number;
  insertionSequence: number;
}
```

## 实现步骤

1. 采用逻辑图层管理显隐, 可拾取性, opacity, order 和 scale 区间. 不使用 Three.js 的 32 位 Layers 掩码当业务图层容器, 也不把业务分组强制放进一个 Three.Group.
2. 图元创建前要求图层存在. layer ID 重复或不存在时明确报错. 删除非空图层默认拒绝, 显式 `disposePrimitives` 才批量销毁, 不留下失去归属的图元.
3. 2D 颜色通道按 `(layer.order, primitive.order, insertionSequence)` 排序. order 相同也必须得到稳定结果, 顺序规则与 00 一致. 同一设备的部件可以位于不同层.
4. 形成统一 RenderPlan. 默认 2D 使用显式画家顺序和关闭 depthTest/depthWrite 的材质策略, 所有图元统一进入受控队列, 防止 opaque/transparent 自动分桶打乱跨类型叠加.
5. 后端只能合并连续且兼容的绘制项. 批内实例或几何顺序必须符合 PaintKey, 不因纹理或 shader 相同跨过中间图元. 排序变化时只重建必要的 render plan/批次索引.
6. effectiveVisible = 图元可见 && 图层可见 && scale 区间内. effectiveOpacity = 图元 opacity * 图层 opacity. minScale 包含, maxScale 不包含, 缺省无边界.
7. scale 变化只更新相机/uniform 和发生阈值切换的图层状态. 屏幕尺寸不在此模块逐个改写图元. 贝号疏密层等 LOD 可通过两个区间图层实现.
8. 图层变化同时使颜色/拾取计划失效. 隐藏或禁选当前对象时通知 15 处理 hover/selection, 不继续对已不可选对象派发悬浮事件.

## 拾取与三维边界

- 14 先过滤 effectiveVisible, pickable 和 PickQuery.layers, 被过滤图层不阻挡本次选择.
- 默认 priority=0 时拾取与颜色 PaintKey 一致. 显式 hit.priority 只改变选择决胜顺序, 不偷偷改变颜色显示顺序.
- height 是物理属性, 不作为防止 2D 重叠冲突的伪 z 值. 将来 3D 后端重新定义深度/透明排序, 不直接沿用关闭深度的 2D 策略.

## 轻量验收

- debug 用 stub 或不同颜色矩形跨层重叠, 修改 order 后显示顺序可预测且稳定.
- 相同 order 的图元不在反复刷新时抖动; opacity 和图层显隐影响所有类型.
- 临界 scale 切换疏密层, 不发生两层意外同时显示或全部消失.
- 图层无上限 32 的限制, 多画布图层互不干扰, 非空层删除行为明确.
