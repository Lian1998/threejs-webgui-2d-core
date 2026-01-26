import * as THREE from "three";

const MAP_CENTER = [565816.5, -2397680.7]; // 地图中心点
const MAP_VIEW_SIZE = 300; // 正交相机初始化显示范围

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const { width, height } = viewport.getBoundingClientRect();
const aspect = width / height;
import { ViewportResizeDispatcher } from "@core/index";
const viewportResizeDispatcher = new ViewportResizeDispatcher(viewport);

const viewSize = MAP_VIEW_SIZE;
export const orthoCamera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 5000);
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => {
  const aspect = width / height;
  orthoCamera.left = -viewSize * aspect;
  orthoCamera.right = viewSize * aspect;
  orthoCamera.top = viewSize;
  orthoCamera.bottom = -viewSize;
  orthoCamera.updateProjectionMatrix();
});

import { MapControls } from "three_addons/controls/MapControls.js";
const center = new THREE.Vector3(MAP_CENTER[0], 0, MAP_CENTER[1]);
export const mapControls = new MapControls(orthoCamera, viewport);

{
  mapControls.enableDamping = true;
  mapControls.dampingFactor = 0.25;
}

{
  mapControls.enableZoom = true;
  orthoCamera.zoom = 1;
  mapControls.minZoom = 0.5;
  mapControls.maxZoom = 20;
  mapControls.zoomSpeed = 1.2;
}

{
  mapControls.enableRotate = true;
  mapControls.maxPolarAngle = Math.PI / 2;
}

mapControls.target.copy(center);
mapControls.update();
mapControls.saveState();
orthoCamera.position.set(center.x, 1000, center.z);
orthoCamera.up.set(0, 1, 0);
orthoCamera.updateProjectionMatrix();
