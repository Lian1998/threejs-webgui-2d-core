import Map from "ol/Map";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

/**
 * 创建一个带有VectorSource作为数据源的VectorLayer
 * @returns
 */
export const createVectorLayer = (layername: string) => {
  const vectorSource = new VectorSource();
  const vectorLayer = new VectorLayer();
  vectorLayer.setSource(vectorSource);

  vectorLayer.setProperties({
    layername,
    selectable: false, // 层是否会进入选择管线监听事件
    resizeable: false, // 层是否会进入缩放重绘监听事件
  });

  return vectorLayer;
};

const baseScale = 0.1199;
const ratio1 = 15 / 184; // meter per pixel
const ratio2 = 184 / 15; // pixel per meter

/**
 * 用igv的比例来计算 其他地图物件的`初始化缩放比率`
 * @param targetImgPixelLength 这个物件的图片特征(* 长度/宽度或其他?)占据图片多少个像素
 * @param targetRealLength 这个物件的这个特征实际的长度占据多少m
 * @returns {number} targetBaseScale 这个物件的理论标准长度
 */
export const calculateTargetBaseScale = (targetImgPixelLength: number, targetRealLength: number): number => {
  //                                  tragetRealLength
  //                             -------------------------
  //  targetBaseScale               targetImgPixelLength
  // ------------------- = ---------------------------------------
  //   igvBaseScale                    igvRealLength
  //                             ------------------------- = ratio1
  //                                  igvImgPixelLength
  return (baseScale * targetRealLength) / (ratio1 * targetImgPixelLength);
};

/**
 * 按 x, y 坐标轴的值设置 Openlayers.Point 的坐标系
 * @param point
 * @param x
 * @param y
 */
export const setPointCoordByAxis = (point: Point, x: number = undefined, y: number = undefined) => {
  const coordinates = point.getCoordinates();
  if (x !== undefined) coordinates[0] = x;
  if (y !== undefined) coordinates[1] = y;
  point.setCoordinates(coordinates);
};

/**
 * 尝试使用pixelAround的方式来更新要素的位置
 * 原理为: 光栅化去抖
 *
 * @param map map实例, 包含了用于映射坐标点的函数
 * @param point 需要设置坐标的点要素
 * @param coordinates 更新的位置
 * @returns
 */
export const tryPixelRoundCoordinates = (map: Map, point: Point, coordinates: [number, number]) => {
  if (map) {
    const pixelCoord = map.getPixelFromCoordinate(coordinates);
    if (pixelCoord && pixelCoord.length === 2) {
      const integerPixelCoord = pixelCoord && [Math.round(pixelCoord[0]), Math.round(pixelCoord[1])];
      const geographicCoord = map.getCoordinateFromPixel(integerPixelCoord);
      return geographicCoord;
    }
  }
  return false;
};
