import "normalize.css";

import * as THREE from "three";
import { OrbitControls } from "three_addons/controls/OrbitControls.js";

///////////////////////////////////////////

const position = new THREE.Vector3();
const rotation = new THREE.Euler();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const randomizeMatrix = (matrix) => {
  position.x = Math.random() * 40 - 20;
  position.y = Math.random() * 40 - 20;
  position.z = Math.random() * 40 - 20;

  rotation.x = Math.random() * 2 * Math.PI;
  rotation.y = Math.random() * 2 * Math.PI;
  rotation.z = Math.random() * 2 * Math.PI;

  quaternion.setFromEuler(rotation);

  scale.x = scale.y = scale.z = 0.5 + Math.random() * 0.5;

  return matrix.compose(position, quaternion, scale);
};

const randomizeRotationSpeed = (rotation) => {
  rotation.x = Math.random() * 0.01;
  rotation.y = Math.random() * 0.01;
  rotation.z = Math.random() * 0.01;
  return rotation;
};

const animateMeshes = () => {
  const loopNum = Math.min(count, dynamic);

  for (let i = 0; i < loopNum; i++) {
    const rotationMatrix = mesh.userData.rotationSpeeds[i];
    const id = ids[i];

    mesh.getMatrixAt(id, matrix);
    matrix.multiply(rotationMatrix);
    mesh.setMatrixAt(id, matrix);
  }
};

//////////////////////////////////////////

const geometries = [new THREE.ConeGeometry(1.0, 2.0), new THREE.BoxGeometry(2.0, 2.0, 2.0), new THREE.SphereGeometry(1.0, 16, 8)];
const material = new THREE.MeshNormalMaterial();
const count = 1024;
const vertexCount = geometries.length * 512;
const indexCount = geometries.length * 1024;
const dynamic = 16;

const viewport = document.querySelector("#viewport");
const { width, height } = viewport.getBoundingClientRect();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
viewport.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, width / height, 1, 100);
camera.position.z = 30;
const controls = new OrbitControls(camera, renderer.domElement);

const scene = new THREE.Scene();
const mesh = new THREE.BatchedMesh(count, vertexCount, indexCount, material);
const geometryIds = [mesh.addGeometry(geometries[0]), mesh.addGeometry(geometries[1]), mesh.addGeometry(geometries[2])]; // geometry样例
const ids = []; // geometry示例

mesh.userData.rotationSpeeds = [];
mesh.frustumCulled = false; // disable full-object frustum culling since all of the objects can be dynamic.

const euler = new THREE.Euler();
const matrix = new THREE.Matrix4();
for (let i = 0; i < count; i++) {
  const id = mesh.addInstance(geometryIds[i % geometryIds.length]);
  mesh.setMatrixAt(id, randomizeMatrix(matrix));

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationFromEuler(randomizeRotationSpeed(euler));
  mesh.userData.rotationSpeeds.push(rotationMatrix);

  ids.push(id);
}

scene.add(mesh);

const animate = () => {
  animateMeshes();

  controls.update();

  mesh.sortObjects = true;
  mesh.perObjectFrustumCulled = true;
  // mesh.setCustomSort((list, camera) => {});

  renderer.render(scene, camera);

  window.requestAnimationFrame(animate);
};

animate();

//////////////////////////////////////// drawcall监听 ////////////////////////////////////////
import "@libs/Spector.js/dist/spector.bundle.js";

// @ts-ignore
const spector = new SPECTOR.Spector();
spector.displayUI();
