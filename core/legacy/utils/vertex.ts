import * as THREE from "three";

/**
 * 将threejs泛二维(XZ平面)顶点数组 格式统一转化为 XZ平面顶点数组
 * @param {THREE.Vertex2DLike} points threejs 泛二维(XZ平面)顶点
 * @param hanldeWrapper 额外的处理步骤
 * @returns {number[]} 转换后的顶点数组, 如果没有额外的处理步骤, 那么输出的是 [x, 0.0, z]
 */
export const convert2Vertex2D = (points: THREE.Vertex2DLike, hanldeWrapper?: (p: [number, number, number]) => number[]): number[][] => {
  return points.map((p: any) => {
    const isArray = Array.isArray(p);
    // 先将各种原始数组的格式转化成 Array3<number>
    if (p instanceof THREE.Vector3) p = [p.x, p.y, p.z];
    else if (p instanceof THREE.Vector2) p = [p.x, 0.0, p.y];
    else if (isArray && p.length === 3) p = [p[0], p[1], p[2]];
    else if (isArray && p.length === 2) p = [p[0], 0.0, p[1]]; // 此函数现在默认只处理mapshaper导出的json文件
    // 这里是需要特殊处理的格式
    if (hanldeWrapper) return hanldeWrapper(p); // geojson的Z坐标和threejs的Z坐标是反的
    return p;
  });
};
