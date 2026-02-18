import "normalize.css";

import * as THREE from "three";
import { OrbitControls } from "three_addons/controls/OrbitControls.js";

///////////////////////////////////////////

const position = new THREE.Vector3();
const rotation = new THREE.Euler();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
function randomizeMatrix(matrix) {
  position.x = Math.random() * 40 - 20;
  position.y = Math.random() * 40 - 20;
  position.z = Math.random() * 40 - 20;

  rotation.x = Math.random() * 2 * Math.PI;
  rotation.y = Math.random() * 2 * Math.PI;
  rotation.z = Math.random() * 2 * Math.PI;

  quaternion.setFromEuler(rotation);

  scale.x = scale.y = scale.z = 0.5 + Math.random() * 0.5;

  return matrix.compose(position, quaternion, scale);
}

function randomizeRotationSpeed(rotation) {
  rotation.x = Math.random() * 0.01;
  rotation.y = Math.random() * 0.01;
  rotation.z = Math.random() * 0.01;
  return rotation;
}

function animateMeshes() {
  const loopNum = Math.min(count, dynamic);

  for (let i = 0; i < loopNum; i++) {
    const represent = represents[i];
    const rotationMatrix = represent.userData.rotationSpeeds;
    const id = represent.userData.id;

    mesh.getMatrixAt(id, matrix);
    matrix.multiply(rotationMatrix);
    mesh.setMatrixAt(id, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

///////////////////////////////////////////

const field = 10;
const count = 1024;
const dynamic = 16;

const viewport = document.querySelector("#viewport");
const { width, height } = viewport.getBoundingClientRect();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
viewport.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
camera.position.set(field * 0.9, field * 0.9, field * 0.9);
camera.lookAt(0, 0, 0);
const controls = new OrbitControls(camera, renderer.domElement);

const scene = new THREE.Scene();
const loader = new THREE.BufferGeometryLoader();
const material = new THREE.MeshNormalMaterial();
const geometry = await loader.loadAsync("/threejs-examples/models/json/suzanne_buffergeometry.json");
geometry.computeVertexNormals();
const mesh = new THREE.InstancedMesh(geometry, material, count);

const euler = new THREE.Euler();
const matrix = new THREE.Matrix4();
const represents = [];
for (let i = 0; i < count; i++) {
  const represent = new THREE.Object3D();
  randomizeMatrix(matrix);
  represent.matrix.copy(matrix);
  represents.push(represent);

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationFromEuler(randomizeRotationSpeed(euler));
  represent.userData.id = i;
  represent.userData.rotationSpeeds = rotationMatrix;
  mesh.setMatrixAt(i, matrix);
}

scene.add(mesh);

// const randomizeMatrix = (matrix) => {
//   const position = new THREE.Vector3();
//   const quaternion = new THREE.Quaternion();
//   const scale = new THREE.Vector3();

//   return (matrix) => {
//     position.x = Math.random() * 40 - 20;
//     position.y = Math.random() * 40 - 20;
//     position.z = Math.random() * 40 - 20;

//     quaternion.random();

//     scale.x = scale.y = scale.z = Math.random() * 1;

//     matrix.compose(position, quaternion, scale);
//   };
// })();

const animate = () => {
  animateMeshes();

  controls.update();

  renderer.render(scene, camera);

  window.requestAnimationFrame(animate);
};

animate();
