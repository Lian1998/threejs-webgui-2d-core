import "normalize.css";
import * as THREE from "three";

import WebGL from "three_addons/capabilities/WebGL";
if (!WebGL.isWebGL2Available()) throw new Error("浏览器不支持WebGL");

const viewport = document.querySelector("#viewport");
const { width, height } = viewport.getBoundingClientRect();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0xffffff);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.01, 1000);

const scene = new THREE.Scene();
scene.add(camera);

import { MapControls } from "three_addons/controls/MapControls.js";
const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = false;

//////////////////////////////////////// 业务代码逻辑 ////////////////////////////////////////

// {
//   const geometry = new THREE.BoxGeometry(1, 1, 1);
//   const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
//   const cube = new THREE.Mesh(geometry, material);
//   scene.add(cube);
// }

// {
//   const axesHelper = new THREE.AxesHelper(100);
//   scene.add(axesHelper);
// }

{
  camera.position.y = 2.0; // 让相机从y轴看向地面
  controls["_dollyIn"](1 / 5.0); // 略微调整视角以使得视口方便调试
  controls.update();
}

import { LayerSequence } from "./LayerSequence";
import { ViewportResizeDispatcher } from "@source/core/";
import { GpuPickManager } from "@source/core/GpuPickManager/GpuPickManager";

import { Sprite2D } from "@source/core";
import { calculateMPP } from "@source/core";

const qcGantry = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Gantry.png"),
  mpp: calculateMPP(35, 2230),
  depth: LayerSequence.QC_Gantry,
  color: new THREE.Color(0x498cff),
});
qcGantry.name = "qcGantry";

const qcMT = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png"),
  mpp: calculateMPP(6, 87),
  depth: LayerSequence.QC_Trolley,
  color: new THREE.Color(0x498cff),
  offset: [0, 18],
});
qcMT.name = "qcMT";

const qcPT = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png"),
  mpp: calculateMPP(6, 87),
  depth: LayerSequence.QC_Trolley,
  color: new THREE.Color(0x498cff),
  offset: [0, 20],
});
qcPT.name = "qcPT";

qcGantry.add(qcPT);
qcGantry.add(qcMT);
scene.add(qcGantry);

const picker = new GpuPickManager(renderer);
picker.register(qcGantry);
picker.register(qcMT);
picker.register(qcPT);
renderer.domElement.addEventListener("pointerdown", (e) => {
  const { pickid, object3d } = picker.pick(scene, camera, e.clientX, e.clientY);
  console.log(pickid, object3d?.name);
});

// console.log(ViewportResizeDispatcher.classInstanceMap.get("default"));
{
  let size = 0;
  window.addEventListener("keydown", () => {
    if (size % 2 == 1) {
      (viewport as HTMLDivElement).style.width = `800px`;
      (viewport as HTMLDivElement).style.height = `600px`;
    } else {
      (viewport as HTMLDivElement).style.width = `1024px`;
      (viewport as HTMLDivElement).style.height = `768px`;
    }
    size += 1;
  });
}

const resizeEventDispatcher = new ViewportResizeDispatcher(viewport as HTMLElement);
resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => renderer.setSize(width, height));
resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => picker.syncRendererStatus(width, height));

function animate() {
  requestAnimationFrame(animate);

  // qcGantry.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();
