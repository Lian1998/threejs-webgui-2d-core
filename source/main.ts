import "normalize.css";

import * as THREE from "three";
import WebGL from "three_addons/capabilities/WebGL";

import { MapControls } from "three_addons/controls/MapControls.js";

if (!WebGL.isWebGL2Available()) throw new Error();
const viewport = document.querySelector("#viewport");
if (!viewport) throw new Error();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0xffffff);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

// https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver
const resizeObserver = new window.ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  renderer.setSize(width, height);
});
resizeObserver.observe(viewport);

const { width, height } = viewport.getBoundingClientRect();
const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.01, 1000);

const scene = new THREE.Scene();
scene.add(camera);

const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = false;

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

import { calculatePP } from "@source/core";
import { Sprite2D } from "@source/core";
const qcGantry = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Gantry.png"),
  pp: calculatePP(35, 2230),
  uColor: new THREE.Color(0x498cff),
});

const qcTrolley = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png"),
  pp: calculatePP(6, 87),
  uColor: new THREE.Color(0x498cff),
});

qcTrolley.mesh.position.y = 1;
qcGantry.mesh.add(qcTrolley.mesh);

scene.add(qcGantry.mesh);

// import { GpuPickManager } from "@source/core";
// const picker = new GpuPickManager({ renderer: renderer, samples: 4 });
// picker.register(spr.mesh); // assigns a unique object id
// renderer.domElement.addEventListener("pointerdown", (e) => {
//   const pickInfomation = picker.pick(scene, camera, e.clientX, e.clientY, renderer.domElement);
//   if (pickInfomation) {
//     console.log("pickInfomation:", pickInfomation);
//   }
// });

function animate() {
  requestAnimationFrame(animate);

  // qcGantry.mesh.position.x += 0.01;
  renderer.render(scene, camera);
}

animate();
