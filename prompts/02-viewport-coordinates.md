# 02. 坐标, 视口与相机

前置: [01](./01-offline-debug.md). 后续: 03, 05, 15. 公共约定见 [00](./00-contracts.md).

## 目标与接口

建议文件: `core/coordinates/CoordinateAdapter.ts`, `core/viewport/Viewport2D.ts`, `core/viewport/OrthographicCameraAdapter.ts`. 调试页: `multi-pages/debug/refactor/viewport.html`.

```ts
interface CoordinateAdapter {
  toLocal(input: Vec2): Vec2;
  fromLocal(local: Vec2): Vec2;
}
interface ViewState {
  center: Vec2;
  scale: number; // CSS px / 米, 正数.
}
interface CameraAdapter {
  readonly camera: THREE.Camera;
  update(state: ViewState, cssSize: Vec2): void;
  screenToWorld(screen: Vec2): Vec2;
  worldToScreen(world: Vec2): Vec2;
}
class Viewport2D {
  setView(patch: Partial<ViewState>): void;
  fitBounds(bounds: readonly [Vec2, Vec2], paddingPx?: number): void;
  screenToWorld(screen: Vec2): Vec2;
  worldToScreen(world: Vec2): Vec2;
  onChange(listener: () => void): () => void;
  dispose(): void;
}
```

## 实现步骤

1. 图元只接收局部米制坐标. 外部输入在 CPU double 精度下先做投影/单位换算并减去固定局部原点, 再写入 GPU float32. 不把 EPSG:3857 大坐标直接传入图元属性.
2. 平面映射采用 `(x,height,-y)`. 正交相机从 +Y 看向平面, up 为 `(0,0,-1)`, 与逻辑 y 向上和正向旋转保持一致. 相机高度/near/far 在视口内设置, 不通过图层 order 修改物理高度.
3. 相机平面范围按 `cssWidth / scale`, `cssHeight / scale` 计算. 缩放改变相机与少量视口 uniform, 不遍历设备修改每个实例的 scale.
4. 鼠标位置统一换成画布内容区域的 CSS 坐标. `screenToWorld` 与 `worldToScreen` 使用同一相机矩阵, 不各写一套近似公式. 保持 canvas 无边框, 若 CSS 做缩放则按 rect 与逻辑 CSS 尺寸比例换算.
5. 平移使用 pointer capture; 处理 pointerup/cancel 和失去捕获. 滚轮使用非 passive 监听, 光标下的世界点在缩放前后保持不变. 提供最小/最大 scale.
6. ResizeObserver 监听容器. 相机使用 CSS 尺寸, renderer 使用实际 drawing buffer 尺寸. DPR 可配置上限, 浏览器缩放或屏幕变化后更新. 零尺寸时暂停渲染, 恢复后重新计算.
7. `fitBounds` 校验有限数, 上下界和退化点/线范围, 为零宽/高留最小可见范围, 不照搬旧模板零长宽计算.
8. 提供视口 revision/change 事件供调度, 图层 LOD, 文字/线屏幕尺寸和拾取使用. dispose 释放全部 DOM/observer 监听.

## 联动与扩展

- 世界尺寸随相机缩放; 屏幕尺寸由后端根据 scale/DPR 换算. 属性单位是 CSS px, 不在业务中乘 DPR.
- 14 的 pick 相机必须使用当前相机状态和真实 drawing buffer 尺寸, 15 复用本模块的指针换算.
- CoordinateAdapter 不绑定港口原点, 毫米或 heading. 对照 `templates/inMap/coordinateTrans.ts` 可以在 debug 编写外部适配示例.
- CameraAdapter 给未来透视相机保留边界. 未来 3D 的屏幕反投影需明确参考平面, 本任务不提供完整 3D 导航.

## 轻量验收

- debug 画出坐标轴, 四角点和一个米制矩形, 验证方向, 旋转与世界/屏幕往返误差.
- 平移, 光标缩放, 容器 resize, DPR=1/2 和非整数比例下, 指针与图元位置一致.
- 模拟大投影原点, 先转局部坐标后, 厘米级移动仍可区分.
- 相同数据缩放时不批量调用图元 setter, 页面销毁后没有残留监听.
