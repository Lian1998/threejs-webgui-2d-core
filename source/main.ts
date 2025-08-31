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

const onResize = () => {
  const { width, height } = viewport.getBoundingClientRect();
  renderer.setSize(width, height);
};

window.addEventListener("resize", onResize);
onResize();

const scene = new THREE.Scene();
viewport.appendChild(renderer.domElement);
const { width, height } = viewport.getBoundingClientRect();
const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.01, 1000);
scene.add(camera);

const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = false;

// {
//   const geometry = new THREE.BoxGeometry(1, 1, 1);
//   const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
//   const cube = new THREE.Mesh(geometry, material);
//   scene.add(cube);
//   const axesHelper = new THREE.AxesHelper(15);
//   scene.add(axesHelper);
// }

{
  camera.position.y = 2.0;
  // @ts-ignore
  controls._dollyIn(1 / 5.0);
  controls.update();
}

import { calculatePP } from "./core/Sprite2D/";
import { Sprite2D } from "./core/Sprite2D/";
const spr = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Gantry.png"),
  pp: calculatePP(35, 2230),
  uColor: new THREE.Color(0x498cff),
});

scene.add(spr.mesh);

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();
