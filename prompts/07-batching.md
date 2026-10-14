# 07. 自动批渲染基础

前置: [04](./04-primitives.md), [05](./05-layers-order.md), [06](./06-resources.md). 后续: 所有图元, 拾取和性能模块.

## 目标与接口

建议文件: `core/batches/BatchManager.ts`, `core/render/shared/MergedBatchBackend.ts`, `core/render/shared/material.ts`. 新目录避免与旧 `core/Batching` 仅大小写不同, 便于跨平台检出. 调试页: `multi-pages/debug/refactor/batching.html`.

```ts
interface UploadStats {
  bytes: number;
  ranges: number;
  rebuiltBatches: number;
}
interface RenderFeature {
  handle: PrimitiveHandle;
  options: DeepReadonly<PrimitiveOptions>;
  matrix: THREE.Matrix4;
  opacity: number;
  visible: boolean;
  pickable: boolean;
  paintKey: PaintKey;
  pickId: number; // 0 保留给背景/未注册状态.
  hit: HitPolicy;
  version: number;
  dirty: ReadonlySet<DirtyKind>;
}
interface RenderItem {
  object: THREE.Object3D;
  primitiveIds: readonly PrimitiveId[];
  key: string;
}
```

正式接口见 `core/contracts/index.ts`, 后端生命周期沿用 00 的 `PrimitiveRenderBackend`. 业务始终持有 PrimitiveHandle. 实例槽位或合并顶点范围留在各后端, 一个图元跨页或分块时可对应多个 RenderItem. 注册表持有独立于槽位的 pick ID/generation, 读回先验证身份再返回逻辑 handle.

## 实现步骤

1. BatchManager 从注册表与图层生成 RenderFeature 列表. 根据后端, shader/material, 纹理页组和连续绘制区段自动分批. 几何相同不代表所有材质/混合/顺序都能合并.
2. 初期优先两种后端: 精灵/字形用实例化 quad, 多边形/线用可更新的合并几何. 可以复用 BatchedMesh 适合的部分, 但不能把所有图元强制装进同一种后端.
3. 属性分三类: 高频位置/角度/颜色/opacity/显隐写逐实例或逐图元参数; 点数/文字内容变化局部重建几何/布局; 纹理页组和不兼容 shader 改变时迁移批次. 不用共享 uniform 实现不同实例的独立值.
4. 建立逻辑 ID 到批内实例/顶点范围的映射, 注册表提供身份 generation. 单标签的背景/字形, 跨纹理页或容量分段仍共享一个逻辑 ID. 删除, 扩容, 排序重排, 换批次时更新范围, 不暴露不稳定 slot 到业务. 旧拾取结果不得指向复用 ID 后的新图元.
5. 容量按需要增长并设置上限, 空闲槽位可复用. 几何块有 vertex/index 范围和容量, 点数改变只重建受影响范围或该批次, 不每帧全量拼接全场景.
6. 变换优先保存成逐图元参数, 可由 feature 索引读取参数纹理, 精灵/字形直接用实例 attribute. 有效矩阵入口组合 parentMatrix * localMatrix, 未挂实体时 parentMatrix 为 identity; 为 17 预留父变换注入, 不将有效矩阵回写逻辑 transform. 若初版多边形/线按顶点范围更新变换, 必须限定为变更图元并统计上传量, 为参数纹理保留 adapter 边界.
7. 合并重叠/相邻 dirty ranges, 使用本地 r170 BufferAttribute updateRanges 或对应纹理更新能力. 先核对 r170 实际 API, 不照抄新版本用法. 高频写入只在帧末设置 needsUpdate.
8. renderOrder 与批内实例/几何顺序来自 PaintKey. 任意类型交错叠加时宁可拆成多个连续批次, 也不能为减少 draw calls 破坏显示结果. 颜色和 pick 使用不同计划, 共享底层图元状态.
9. 所有后端从第一版预留逐逻辑图元 pickId, hit 参数和 pass 类型. merged 顶点带相同 feature 索引, glyph 的多个字形共享标签的 pickId. 14 再接通 ID 分配和读回, 图元不反向依赖 picker.
10. shader 的 color/pick 分支共享变换, visibility, opacity 和 coverage/mask 计算. pick 输出不经过颜色混合, tone mapping 或色空间转换. 不用一次材质 clone 作为之后不再同步的拾取状态.
11. 明确 InstancedBufferGeometry 与 InstancedMesh 的 shader 输入区别. 自定义 shader 需实际消费实例数据, 不能因为类名为 InstancedMesh 就认为自动应用 instanceMatrix.
12. 释放 batch 仅清理自己拥有的 GPU buffer/material, 图集 lease 按 06 归还. 两个 Viewer 的 binding/pick 数据严格隔离.

## 约束与联动

- 本地 r170 的 BatchedMesh 在缺少 WEBGL_multi_draw 时可能循环 draw, 不承诺一批恒等于一次 GPU draw. 19 显示真实统计与扩展状态.
- 14 读取 RenderFeature 的 PaintKey/hit 与注册表的 generation, 并重新规划按 priority 排序的 pick 队列. 同优先级沿用视觉 PaintKey.
- colorSpace 针对显示颜色处理, pickId 采用无颜色管理的整数编码. 资源更新, 图层修改和 GUI 写属性都走同一 adapter.
- 03 通知 context restore 时, 用 CPU feature/buffer 数据重建自有 GPU 对象或使 Three.js 属性重新上传. 保留逻辑 ID 和 CPU 范围映射, 作废在途读回, 不让失效 GL 缓存继续用于查询.

## 轻量验收

- 用测试 quad/triangle adapter 验证创建, 更新, 删除, 扩容, 改层, 排序和换批次后 handle/映射稳定.
- 同帧多次改一个实例, 只上传最终数据的必要范围, 相邻脏区间合并.
- 同批实例分别修改颜色, opacity, 显隐, 不影响其他实例.
- 交错纹理/图元类型的重叠结果保持 PaintKey, pick pass 用相同几何/变换且能区分每个实例.
