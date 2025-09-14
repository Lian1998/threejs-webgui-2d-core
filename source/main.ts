import "normalize.css";

import * as THREE from "three";
import WebGL from "three_addons/capabilities/WebGL";

import { MapControls } from "three_addons/controls/MapControls.js";

export enum Layers {
  QC_Gantry,
  QC_Trolley,
}

if (!WebGL.isWebGL2Available()) throw new Error();
const viewport = document.querySelector("#viewport");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0xffffff);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const { width, height } = viewport.getBoundingClientRect();
const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.01, 1000);

const scene = new THREE.Scene();
scene.add(camera);

const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = false;

const resizeEventDispatcher = new ViewportResizeDispatcher(viewport as HTMLElement);
resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => renderer.setSize(width, height));

// {
//   const geometry = new THREE.BoxGeometry(1, 1, 1);
//   const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
//   const cube = new THREE.Mesh(geometry, material);
//   scene.add(cube);
//   const axesHelper = new THREE.AxesHelper(100);
//   scene.add(axesHelper);
// }

{
  camera.position.y = 2.0;
  // @ts-ignore
  controls._dollyIn(1 / 5.0);
  controls.update();
}

import { Sprite2D } from "@source/core";
import { calculateMPP } from "@source/core";

const qcGantry = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Gantry.png"),
  mpp: calculateMPP(35, 2230),
  depth: Layers.QC_Gantry,
  color: new THREE.Color(0x498cff),
});
qcGantry.name = "qcGantry";

const qcTrolley = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png"),
  mpp: calculateMPP(6, 87),
  depth: Layers.QC_Trolley,
  color: new THREE.Color(0x498cff),
});
qcTrolley.name = "qcTrolley";
qcTrolley.position.y = 1;
qcGantry.add(qcTrolley);

scene.add(qcGantry);

import { GpuPickManager } from "@source/core/GpuPickManager";
{
  const picker = new GpuPickManager(renderer);
  resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => picker._onResize());
  picker.register(qcGantry); // assigns a unique object id
  picker.register(qcTrolley); // assigns a unique object id
  // picker.register(instancedMeshB, { instances: instancedMeshB.count });
  renderer.domElement.addEventListener("pointerdown", (e) => {
    const hit = picker.pick(scene, camera, e.clientX, e.clientY);
    if (hit) {
      console.log("hit:", hit.object, hit.instanceId, hit.id);
    }
  });
}

import { ViewportResizeDispatcher } from "@source/core/";
// {
//   window.addEventListener("keydown", () => {
//     (viewport as HTMLDivElement).style.width = `800px`;
//     (viewport as HTMLDivElement).style.height = `600px`;
//   });
//   console.log(ViewportResizeDispatcher.classInstanceMap.get("default"));
// }

function animate() {
  requestAnimationFrame(animate);

  // qcGantry.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();
