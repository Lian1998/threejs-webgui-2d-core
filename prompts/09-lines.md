# 09. 粗线, 虚线与动态路径

前置: [07 批渲染](./07-batching.md). 公共接口以 [00 契约](./00-contracts.md) 为准.

## 目标与范围

实现具有可变颜色, 宽度, 透明度和顶点数量的折线, 支持屏幕/世界线宽和虚线. 自动合批多个独立逻辑路径, 路径之间不能出现连接线. 首期不实现曲线编辑器, 箭头系统或三维管道.

建议路径:

- `core/primitives/lines/LineHandle.ts`: 公开属性与 setter.
- `core/render/lines/buildLineGeometry.ts`: 扩宽顶点, 连接, 端帽和累计距离.
- `core/render/lines/LineBatchBackend.ts` 与 `core/render/shared/material.ts`: 07 的批后端适配与共享 coverage.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/lines.html`: 更新, 缩放与虚线预览.

可复用现有 `MeshLineGeometry.ts` 的 prev/next 思路. 现有 shader 在 pick 分支中提前输出 ID, 会跳过虚线 mask, 必须重写共享 coverage 流程.

## 类型草案

```ts
interface LineDash {
  length: number;
  gap: number;
  offset?: number;
  sizeMode?: SizeMode; // 默认 screen, length/gap/offset 使用同一单位.
}

interface LineOptions extends CommonOptions {
  points: readonly Vec2[];
  color: ColorInput;
  width: number;
  widthMode?: SizeMode; // 默认 screen, CSS 像素; world 使用米.
  closed?: boolean;
  cap?: "butt" | "round";
  join?: "miter" | "bevel";
  miterLimit?: number;
  dash?: LineDash | null;
}

interface LineHandle extends PrimitiveHandle<LineOptions> {
  setPoints(points: readonly Vec2[]): this;
  setColor(color: ColorInput): this;
  setWidth(width: number): this;
}

const route = view.primitives.addLine({
  layer: "routes", ownerId: "igv-1", partId: "currentRoute",
  points, color: "#66ccff", width: 1.5, widthMode: "screen",
  dash: { length: 4, gap: 6, sizeMode: "screen" },
});
route.update({ width: 5, color: "#ffcc00" }).setPoints(nextPoints);
```

多个不连通路径使用多个 line handle, 可共享 ownerId. 首期无需将 MultiLineString 作为公开前置能力, 内部合批仍必须保持路径分段. 默认 closed=false, cap=butt, join=miter. 所有 setter 自动合并脏更新.

## 实现步骤

1. 复制输入, 检查有限坐标, 移除连续重复点. 0/1 个有效点或 width=0 表示空绘制, 负宽度与非法参数报错; 不用 NaN 假装隐藏路径.
2. 生成可批渲染的三角形带, 为必要顶点记录 prev/next, side, 所属逻辑图元与累计距离. 用明确索引段表达路径断点, 不生成跨图元三角形.
3. 支持 butt/round 端帽与 miter/bevel 连接. miter 超过默认 limit=4 时退化为 bevel; 处理直线, 急角, 反向和闭合首尾连接, 不能对零向量 normalize.
4. world 宽度按变换后世界平面垂直方向扩宽, width 的单位为米. screen 宽度在投影后以 CSS 像素扩宽, 使用完整 drawing buffer 尺寸与实际 CSS 比例, 避免长宽比拉伸.
5. transform.scale 改变路径位置和长度; width 仍按 widthMode 的目标单位解释. 不将 world 宽度隐式再乘一次模型 scale, 不把 screen 宽度绑定到窗口大小.
6. 累计长度采用变换后世界路径长度. translation/rotation 不重算长度, 非均匀 scale 变化需更新距离; screen 虚线长度由世界距离乘视口 scale 得到.
7. shader 用累计距离, length/gap/offset 得到 dash coverage. gap=0 按实线处理, length=0 且 gap>0 按空线处理, 负参数报错. offset 可任意正负, 使用稳定取模.
8. color pass 的边缘抗锯齿, 端帽, 虚线和有效 opacity 共用 coverage 函数. pick pass 在 coverage 计算后进行 alphaThreshold 判断, 不填满虚线间隙.
9. 改位置, 角度, 宽度, 颜色, dash 样式只更新对应逐图元参数. 点坐标改变重算该路径的顶点与距离; 点数/连接拓扑改变时由 07 管理容量和重建范围.
10. 维护含线宽, 端帽和 miter 的保守屏幕 bounds. screen 宽度及 dash 随缩放更新 uniform/bounds, 不让滚轮缩放重建所有路径顶点.
11. 实现 07 的 PrimitiveRenderBackend 和 RenderFeature 接入, 为合并几何保留逐图元 pickId. 合批或容量搬迁后, 三角形的顶点不能混用不同图元 ID.

## 联动点

- 使用 [02](./02-viewport-coordinates.md) 的局部米坐标, XZ 映射与 scale. 在完整投影/像素空间计算 screen 扩宽, 最后应用 pick crop 映射; 不用已裁切投影配完整视口 uniform 直接扩宽.
- 与 [05](./05-layers-order.md) 使用统一 paintKey, 与 07 使用相同脏分类和可搬迁映射. 不导入 picker 或交互模块.
- 默认 `hit.mode="visible"`, `tolerancePx=0`. [14](./14-gpu-picking.md) 可在可见线段附近配置 CSS 容差, 正容差可能命中附近虚线段, 不改变渲染效果.
- `hit.mode="bounds"` 对 line 无效. 端帽/虚线空隙的 alpha 必须与 color pass 一致, opacity 乘图层 opacity 后再参与拾取阈值.
- [16 插帧](./16-motion.md) 只通过 TransformTarget 更新位置/角度; 路径拓扑点数组由业务 setPoints/update 更新. [17 组合](./17-composition.md) 把路径关联到设备, 线模块不接 WebSocket 数据.
- dispose 后释放该路径槽位与监听, 共享材质/缓冲由资源和批后端释放.

## 轻量验收

只增加一个独立 debug 页面与必要纯函数检查:

- 同页比较 world/screen 宽度及两种 dash 单位, 连续滚轮缩放, 窗口改变, DPR=1/2 时 screen 宽度保持 CSS 尺寸.
- 直线, 折线, 急角, 往返, 闭环和重复点均无 NaN, 无限尖刺或意外连线.
- 每帧更换位置/颜色与偶尔更换点数, 其他路径保持稳定, 输出几何重建和上传字节.
- 数十条路径自动合批, 删除其中一条和扩容后, 逻辑 handle 不变且无遗留连接片段.
- pick coverage 预览中虚线间隙, 透明线和隐藏线保持背景 ID=0; 具体选中行为在 14 验收.
- 最小检查只覆盖累计距离, 重复点清理与 miter 退化, 不建立场景截图回归体系.
