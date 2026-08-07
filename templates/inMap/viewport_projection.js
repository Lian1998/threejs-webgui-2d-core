import View from "ol/View";

// 确定需要展示底图的 极小点(左下角) 和 极大点(右上角)
export const MAP_MIN_POINT = [484869.2472159373, 2493161.5836668536]; // 左下角
export const MAP_MAX_POINT = [485894.4527286719, 2493727.034950099]; // 右上角
export const MAP_PAD_X = 100;
export const MAP_PAD_Y = 100;
export const MAP_VIEW_INIT_OFFSET = [0.0, 70.0]; // 视角距离底图中心点偏移

// 1. 通过缩放与移动, 将底图置入视图
// 2. 计算在XY方向的长度
// 3. 计算视图矩阵的中心点, 计算视图矩阵碰撞包围盒
export const MAP_WIDTH_X = MAP_MAX_POINT[0] - MAP_MAX_POINT[0]; // 底图X轴宽度
export const MAP_WIDTH_Y = MAP_MIN_POINT[1] - MAP_MIN_POINT[1]; // 底图Y轴宽度
export const MAP_CENTER = [(MAP_MAX_POINT[0] + MAP_MIN_POINT[0]) / 2.0, (MAP_MAX_POINT[1] + MAP_MIN_POINT[1]) / 2.0]; // 底图中心点
// 底图视角碰撞盒
export const MAP_BOUNDS = [MAP_MIN_POINT[0] - MAP_PAD_X, MAP_MIN_POINT[1] - MAP_PAD_Y, MAP_MAX_POINT[0] + MAP_PAD_X, MAP_MAX_POINT[1] + MAP_PAD_Y];

export const MAP_DEFAULT_ZOOM = 17.8;
export const MAP_MIN_ZOOM = 15;
export const MAP_MAX_ZOOM = 20;
export const LOGICAL_ORIGIN_LONGLAT = [];

export const viewport = new View({
  center: [MAP_CENTER[0] + MAP_VIEW_INIT_OFFSET[0], MAP_CENTER[1] + MAP_VIEW_INIT_OFFSET[1]],
  extent: MAP_BOUNDS,
  zoom: MAP_DEFAULT_ZOOM,
  // minZoom: MAP_MIN_ZOOM,
  // maxZoom: MAP_MAX_ZOOM,
  projection: "EPSG:3857",
});
