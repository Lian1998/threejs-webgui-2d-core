# 08. 多边形与多个独立区域

前置: [07 批渲染](./07-batching.md). 公共接口以 [00 契约](./00-contracts.md) 为准.

## 目标与范围

实现有填充的凸/凹多边形, 孔洞和 MultiPolygon. 每个逻辑图元可含多个独立区域, 保持一个稳定 handle 和 pick ID. 首期不处理自相交轮廓的自动修复, 布尔运算或三维挤出.

建议路径:

- `core/primitives/polygons/PolygonHandle.ts`: 公开图元与属性更新.
- `core/primitives/polygons/triangulate.ts`: 输入标准化, 验证与三角剖分.
- `core/render/polygons/PolygonBatchBackend.ts`: 接入 07 的几何批次与共享 shader 参数.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/polygons.html`: 独立预览.

现有 `MeshPolygonGeometry.ts` 可参考, 不以其 MapShaper LineString 输入作为公开契约. 使用已有离线 `libs/earcut-3.0.2`, 不联网安装算法依赖.

## 类型草案

```ts
interface PolygonRings {
  outer: readonly Vec2[];
  holes?: readonly (readonly Vec2[])[];
}

type PolygonGeometry =
  | { type: "Polygon"; polygon: PolygonRings }
  | { type: "MultiPolygon"; polygons: readonly PolygonRings[] };

interface PolygonOptions extends CommonOptions {
  geometry: PolygonGeometry;
  fill: ColorInput;
}

interface PolygonHandle extends PrimitiveHandle<PolygonOptions> {
  setGeometry(geometry: PolygonGeometry): this;
  setFill(fill: ColorInput): this;
}

// handle 更新自动标记脏数据, 不要求业务手动重绘.
const area = view.primitives.addPolygon({
  layer: "lockAreas", ownerId: "igv-1", partId: "lockArea",
  geometry: {
    type: "MultiPolygon",
    polygons: [{ outer: rectA }, { outer: rectB }],
  },
  fill: "#3388cc",
  opacity: 0.25,
});
area.setFill("#ff6600").setPosition([2, 4]);
```

顶点使用图元局部 [x,y] 米坐标, 再应用 CommonOptions.transform. GPU 平面为 `(x,height,-y)`, 不在本模块转换 EPSG:3857, mm/cm 或旧设备 heading.

## 实现步骤

1. 明确区分外环, 孔洞, 独立区域. 一个 `holes` 元素只能表示该外环内的孔洞, 两个不相连的锁区应是 MultiPolygon.
2. 复制调用方数组. 接受首末重复的闭环和未重复的闭环, 内部移除重复终点, 连续重复点和无效零长边, 统一环方向.
3. 检查有限坐标与至少 3 个不同顶点. 空 outer 或空 polygons 表示暂时没有几何, 可见/拾取均为空; 单独存在的孔洞, 非法环与自相交输入给出可定位错误, 保留上一次有效状态.
4. 输入来自可信业务数据时采用轻量验证; 开发模式对自相交, 孔洞越界和环相交增加诊断. 不能将 Earcut 成功返回视为复杂非法输入已经修复.
5. 为每个 Polygon 分别展平 `outer + holes`, 计算 holes 起始索引并调用 Earcut. MultiPolygon 合并结果时补偿顶点索引偏移, 不把第二个外环当成孔洞.
6. 三角形只覆盖填充区, 孔洞不生成面. 检查 XZ 映射后的绕序和法线, 使正交相机下正反面策略一致.
7. 变换, 填色, opacity, hit 参数只更新逐图元数据. 顶点改变可能改变剖分结果, 重新剖分该图元后更新必要范围; 容量不足交给 07 扩容/搬迁.
8. 索引宽度和容量由批后端管理. 大多边形不能因 Uint16 溢出损坏相邻图元, 搬迁后 ID, handle 和事件监听保持稳定.
9. 更新局部/世界包围范围用于视口裁剪和拾取候选过滤. 裁剪范围须包含 transform.scale 与 rotation, 不以顶点原始 bounds 代替.
10. 实现 07 的 PrimitiveRenderBackend, 从 RenderFeature 获取 pickId. shader 先计算统一 coverage 与有效 opacity, 再分别输出颜色或逐图元 ID, 不导入 GpuPicker.

## 联动点

- 填充有效 alpha 为图元 opacity 与图层 opacity 的乘积. 若增加斜线纹理等效果, color/pick pass 必须共享同一 coverage 函数, 默认孔隙不可拾取.
- `hit.mode="bounds"` 对 polygon 无效, 更新时应报参数错误. `visible` 模式, alphaThreshold, 容差与优先级由 [14](./14-gpu-picking.md) 统一消费.
- 按 [05](./05-layers-order.md) 的 paintKey 绘制, 物理 height 不参与 2D 顺序编码. MultiPolygon 的各片连续绘制且属于同一个图元.
- 需要多边形边线时组合 [09 线](./09-lines.md) 并共享 ownerId, 不让 08 依赖 09 或把边框静默拆成不可查找的业务实例.
- `dispose` 经 04/07 注销几何与注册数据; 共享材质不得被单个实例释放.
- 旧模板 `IGVInstance.ts:setLockAreaPoints` 将多个矩形写作同一 Polygon 的 rings, 本任务必须改用显式 MultiPolygon 语义.

## 轻量验收

只建一个可手动操作的 debug 页面, 不增加重型测试框架:

- 同页显示凸形, 凹形, 带孔洞, 多块独立矩形, 旋转与非均匀缩放后仍正确.
- 添加/移除孔洞, 改变点数与切换空几何后, 只更新目标图元, 相邻图元无残影.
- 改颜色/opacity/位置时不重新 Earcut, 页面输出此次几何重建次数与上传范围.
- 顺时针, 逆时针和重复闭环输入结果相同; 非法输入显示开发诊断且不破坏旧图形.
- 用 07 的 pick pass 预览 ID coverage, 孔洞保持背景 ID=0, 多块区域的 ID 一致. 完整交互验证留给 14.
- 删除再新增, 触发容量扩展后, 旧 handle 已失效, 新图元仍可通过逻辑 ID 查询.
