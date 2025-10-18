import * as THREE from "three";

// 监听鼠标移动
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export const getXZPosition = (e: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer) => {
  // 将鼠标屏幕坐标转换为标准化设备坐标 (-1 到 +1)
  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  // 从相机出发发射射线
  raycaster.setFromCamera(mouse, camera);

  // 定义地面平面（Y=0）
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // 求射线与平面的交点
  const pos = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, pos);

  // 返回 XZ 坐标
  return pos; // pos.x, pos.z 即为鼠标对应地面坐标
};
