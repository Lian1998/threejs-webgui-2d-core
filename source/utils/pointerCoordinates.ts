import * as THREE from "three";

// 监听鼠标移动
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // 定义地面平面（Y=0）
const pos = new THREE.Vector3();

/**
 * (此函数假设viewport占满容器)计算鼠标指针发出射线计算在XZ平面的交点坐标
 * @param e 光标在viewport中的坐标
 * @param camera 相机, 用于获取位置
 * @param renderer 渲染器大小, 用于计算NDC
 * @returns
 */
export const getXZPosition = (e: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => {
  // 将鼠标屏幕坐标转换为NDC标准化设备坐标 (-1 到 +1)
  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  // 从相机出发发射射线
  raycaster.setFromCamera(mouse, camera);

  // 求射线与平面的交点
  raycaster.ray.intersectPlane(plane, pos);

  // 返回 XZ 坐标
  return pos; // pos.x, pos.z 即为鼠标对应地面坐标
};
