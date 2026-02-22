import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager";

import { ThreejsGroups } from "@source/inMap/variables";
import { ThreejsLayers } from "@source/inMap/variables";
import { ThreejsRenderOrder } from "@source/inMap/variables";

import { isWebGL2Available } from "@source/inMap/utils/common";
import { mapControls } from "@source/inMap/viewport";
import { orthoCamera } from "@source/inMap/viewport";
import { registerOrthoCameraOnResize } from "@source/inMap/viewport";

import { ViewportResizeDispatcher } from "@core/index";
import { GpuPickCommonListener } from "@core/index";

isWebGL2Available();

const viewport = document.querySelector("#viewport") ?? document.querySelector("#gui-viewport");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
renderer.setClearColor(0xffffff, 0.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

// 挂载resize事件通知
new ViewportResizeDispatcher(renderer);

// 挂载resize视角改变函数
registerOrthoCameraOnResize();

// 挂载基于GPUBuffer的图元拾取核心
const gpuPickCommonListener = new GpuPickCommonListener(renderer, ThreejsGroups.Meshes, orthoCamera);
mapControls.addEventListener("start", () => (gpuPickCommonListener.enabled = false));
mapControls.addEventListener("end", () => (gpuPickCommonListener.enabled = true));

import { initialization_BaseMap } from "@source/inMap/baseMap";
// 初始化底图
initialization_BaseMap();

import { initRestfulData } from "@source/data/initRestfulData";
initRestfulData().then((response) => {});

//////////////////////////////////////// 渲染循环 ////////////////////////////////////////

const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);

  // 渲染底图
  renderer.render(ThreejsGroups.BaseMap, orthoCamera);
  renderer.autoClearColor = false;
  renderer.autoClearDepth = true;
  renderer.autoClearStencil = true;

  // 渲染单个设备
  renderer.render(ThreejsGroups.Meshes, orthoCamera);
};

animate();
