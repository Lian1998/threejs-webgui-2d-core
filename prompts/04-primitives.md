# 04. 逻辑图元与生命周期

前置: [03](./03-render-scheduler.md). 后续: 05, 07, 16, 17, 18. 完整公开类型见 [00](./00-contracts.md).

## 目标与接口

建议文件: `core/primitives/PrimitiveHandle.ts`, `core/primitives/PrimitiveRegistry.ts`, `core/primitives/UpdateContext.ts`. 调试页: `multi-pages/debug/refactor/primitives.html`.

```ts
interface UpdateContext {
  markDirty(id: PrimitiveId, kind: DirtyKind): void;
  invalidate(reason?: string): void;
}
interface PrimitiveChange {
  id: PrimitiveId;
  version: number;
  dirty: ReadonlySet<DirtyKind>;
}
interface PrimitiveRegistry {
  get(id: PrimitiveId): PrimitiveHandle<CommonOptions> | undefined;
  list(kind?: PrimitiveKind): readonly PrimitiveHandle<CommonOptions>[];
  findByOwner(ownerId: EntityId): readonly PrimitiveHandle<CommonOptions>[];
  onAdded(listener: (handle: PrimitiveHandle<CommonOptions>) => void): () => void;
  onChanged(listener: (change: PrimitiveChange) => void): () => void;
  onRemoved(listener: (id: PrimitiveId) => void): () => void;
  dispose(): void;
}
```

## 实现步骤

1. 将逻辑状态, 注册, 事件, 渲染适配器, 调试注册与资源持有分别封装为对象. 图元组合这些对象, 单一简单基类可共享常用 setter, 不使用多个继承 Mixin 叠加能力.
2. 每个 Viewer 独立注册表, 自动 ID 单调生成. 用户 ID 重复时抛出可理解的错误. ID 创建后不可更新, 删除/槽位复用不改变其他图元 ID.
3. 构造时补齐默认值并校验 finite 坐标, opacity, scale, 尺寸等. 子类字段初始化完成且资源条件满足后再发布 onAdded, 不在父构造过程中自动登记 GUI.
4. `update` 校验 patch 并拷贝外部数组/对象, 不修改传入坐标和路径. transform/hit 做已提供子字段合并, 其余字段替换. 比较变更类别, 只有实际变化才 markDirty.
5. 高频 setter 复用 update 的内部校验/脏更新入口, 不因便捷 API 绕过同步链. 变换, 颜色/透明度, 几何, 资源, 顺序和显隐分别标记. 状态提交后递增 version, 帧末合并 onChanged 通知, GUI 仅订阅当前实例; 通知期间新写操作进入下一轮, 不递归派发.
6. `getOptions` 提供只读快照, 嵌套坐标/样式不暴露可改写的内部存储. 可按状态版本缓存快照, dev 冻结, 避免 GUI 读取反复重建几何.
7. 事件订阅返回 unsubscribe. 存储轻量监听器, 不依赖 DOM/Three.js Mesh 存在. 15 将命中结果映射回 handle 再派发.
8. dispose 幂等: 先标记失效 -> 发出移除通知 -> 取消动画和调试注册 -> 清理选择/悬浮 -> 移除 batch binding/pick ID -> 释放持有资源和监听器.
9. dispose 后 getter 可以返回最后快照, setter 明确报错或统一返回失效状态, 不允许悄悄写入已被复用的 GPU 槽位. dev 报错优先, 正式策略保持统一.

## 联动

- 07 负责 handle 到 GPU binding 的映射, 注册表不存 Three.js 内部 instanceId 作为业务 ID.
- layer, ownerId, partId 等关联信息都位于逻辑状态. 维护 owner 索引供 15 在 17 尚未实现时查询设备关联图元. 修改关联需要更新对应索引; 已属于 17 组合对象的部件通过组合 API 改归属.
- 18 用独立注册服务组合调试能力. 单独图元和组合设备都能注册, 生产图元不必继承 GUI 基类.
- 既有 `core/ECS/World.ts` 和 `core/Mixins/ClassInstanceMap` 可参考, 但公共 API 不要求业务掌握完整 ECS 或全局静态实例表.

## 轻量验收

- 用 stub adapter 创建两个图元, 验证 ID 查找, 重复 ID, 变更合并和 remove 通知.
- update 传入路径后修改原数组, 不改变内部状态; 部分 transform 更新保留未传字段.
- 事件取消和重复 dispose 有效, 删除旧 handle 后创建新图元不会收到旧事件或旧写操作.
- 同帧改位置, 颜色和显隐只触发一次刷新, 后端收到完整 DirtyKind 集合.
