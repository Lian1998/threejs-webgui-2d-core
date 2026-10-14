# 17. 组合设备对象

前置: [08](./08-polygons.md), [09](./09-lines.md), [11](./11-sprites.md), [13](./13-text.md). 16 可以后续注入, 拾取/交互只通过 ownerId 关联, 不作为本模块必须依赖.

## 目标与接口

建议文件: `core/composition/EntityView.ts`, `core/composition/EntityRegistry.ts`. 调试页: `multi-pages/debug/refactor/composition.html`.

```ts
interface EntityOptions {
  id: EntityId;
  transform?: Partial<Transform2D>;
}
class EntityView implements TransformTarget {
  readonly id: EntityId;
  addPart(name: string, handle: PrimitiveHandle<CommonOptions>): this;
  removePart(name: string, options?: { dispose?: boolean }): void;
  getPart(name: string): PrimitiveHandle<CommonOptions> | undefined;
  setPosition(position: Vec2): this;
  setRotation(radians: number): this;
  setVisible(visible: boolean): this;
  dispose(): void;
}
```

EntityRegistry 负责按 ID 查找与 Viewer 销毁时清理; 20 将创建入口接到 `view.entities.create(options)`. ownerId 固定为实体 ID, partId 对应 addPart 的 name, part 名不可重复.

## 实现步骤

1. 用对象组合实现设备视图, 一个 EntityView 持有多个逻辑图元. 部件保持各自图层, order, pickable 和局部样式, 不强制移动到一个 Three.Group.
2. 记录实体变换与部件局部变换. 通过父变换组合得到有效渲染变换, 不反复改写/累加部件原始坐标. 组合平移, 旋转, 非均匀缩放和高度时内部用矩阵, 避免错误拆分造成剪切丢失.
3. attach 时把部件当前 transform 作为局部变换. 后续部件 update.transform 修改局部值, Entity setter 修改父变换. getOptions 返回局部逻辑值, 有效矩阵仅在 adapter 中消费.
4. 17 之前未挂接实体的图元有 identity 父变换. 07 的 feature 变换入口保留父变换注入, 17 接通后只更新受影响部件的必要数据.
5. visible 同样分为实体级与部件级, 父级恢复显示不能强制恢复原本隐藏的部件. 图层显隐作为额外独立条件.
6. attach 更新 owner/part 索引; 同一部件不能同时归属于两个实体. detach 时清除索引并保留当前位置, 通过内部矩阵/局部变换重置明确语义. 若存在无法用 Transform2D 表示的剪切, 显式拒绝保姿态 detach 或先提供矩阵形式内部状态, 不静默改变形状.
7. Entity dispose 默认销毁归属部件, 取消实体运动/GUI/事件订阅并移除实体索引. removePart 默认只 detach, 显式 dispose 才删除该图元. 所有操作幂等, 异步资源完成时检查实体存活状态.
8. 提供应用侧设备类示例, 用组合持有 EntityView 和部件, 暴露 setPosition/setRotation/setRoutePoints/setContainers 等方法. 通用 core 不硬编码 IGV/YC/QC 字段.

## 业务复杂度示例

```ts
class DemoVehicle {
  // 构造时注册 body/head/label/route/container 等部件并设置各自图层.
  private entity: EntityView;
  setPosition(p: Vec2) { this.entity.setPosition(p); }
  setRotation(rad: number) { this.entity.setRotation(rad); }
  setRoutePoints(points: readonly Vec2[]) { this.route.update({ points }); }
  dispose() { this.route.dispose(); this.entity.dispose(); }
  private route: PrimitiveHandle<LineOptions>;
}
```

历史路径通常是世界坐标, 不应随车身整体旋转. 示例可将路径作为同 ownerId 的独立图元, 或使用显式的 world-anchored 部件选项; 首期优先独立图元并由设备示例统一销毁, 不把所有相关图元都盲目纳入父变换. addPart 仅用于随实体变换的部件.

## 联动与轻量验收

- 模拟设备由车身/车头精灵, 文字, 箱体多边形组成, 路径在独立图层且保持世界坐标. 业务一次 setPosition 即可更新随动部件.
- 14/15 通过 ownerId 返回设备身份并保留 partId. 设备级选择样式可以更新多个部件, 单独调试时仍可选中具体 handle.
- 16 只需要 TransformTarget, 可以直接绑定 EntityView; 不需要为每个部件分别启动插帧.
- 旋转不会累积误差, 隐藏父级再恢复不会改变部件自身显隐, 删除部件不会影响其他设备共享资源.
- 对照 `templates/classes/deviceInOpenlayers/IGVInstance.ts`, 设备移动, 换箱, 改路径无需操作 Mesh, 批次槽位或手动上传/重绘.
