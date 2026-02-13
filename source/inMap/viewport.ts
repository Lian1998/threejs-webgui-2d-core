import * as THREE from "three";

const MAP_CENTER = [565816.5, -2397680.7]; // 地图中心点
const MAP_VIEW_SIZE = 300; // 正交相机初始化显示范围

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const { width, height } = viewport.getBoundingClientRect();
const aspect = width / height;

const orthoCamera = new THREE.OrthographicCamera(-MAP_VIEW_SIZE * aspect, MAP_VIEW_SIZE * aspect, MAP_VIEW_SIZE, -MAP_VIEW_SIZE, 0.1, 5000);

import { MapControls } from "three_addons/controls/MapControls.js";
const center = new THREE.Vector3(MAP_CENTER[0], 0, MAP_CENTER[1]);
const mapControls = new MapControls(orthoCamera, viewport);

// 视口平滑运动
{
  mapControls.enableDamping = true;
  mapControls.dampingFactor = 0.25;
}

// 视口范围
{
  mapControls.enableZoom = true;
  orthoCamera.zoom = 1;
  mapControls.minZoom = 0.5;
  mapControls.maxZoom = 20;
  mapControls.zoomSpeed = 1.2;
}

// 视口旋转角度
{
  mapControls.enableRotate = true;
  mapControls.maxPolarAngle = Math.PI / 2;
}

mapControls.target.copy(center);
mapControls.update();
mapControls.saveState();
orthoCamera.position.set(center.x, 1000, center.z); // 视口初始化视角
orthoCamera.up.set(0, 1, 0);
orthoCamera.updateProjectionMatrix();

// 视口初始化视角缩放
{
  orthoCamera.position.y = 1000.0; // 让相机从y轴看向地面
  mapControls["_dollyIn"](1 / 5.0); // 略微调整视角以使得视口方便调试
  mapControls.update();
}

const MAP_DEFAULT_ZOOM = orthoCamera.zoom;

export { MAP_CENTER };
export { MAP_VIEW_SIZE };
export { MAP_DEFAULT_ZOOM };
export { orthoCamera };
export { mapControls };
