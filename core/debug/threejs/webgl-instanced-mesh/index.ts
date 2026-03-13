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
    const represent = represents[i];
    const rotationMatrix = represent.userData.rotationSpeeds;
    const id = represent.userData.id;

    represent.matrix.multiply(rotationMatrix);
    instancedMesh.setMatrixAt(id, represent.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
};

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
const baseGeometry = await loader.loadAsync("/threejs-examples/models/json/suzanne_buffergeometry.json");
baseGeometry.computeVertexNormals(); // 计算法线
const instancedGeometry = new THREE.InstancedBufferGeometry(); // 这里其实不管用baseGeometry还是InstancedGeometry都一样, 只要最后 new InstancedMesh( threejs会自动帮忙转换
instancedGeometry.index = baseGeometry.index;
instancedGeometry.setAttribute("position", baseGeometry.attributes.position);
instancedGeometry.setAttribute("normal", baseGeometry.attributes.normal);
const aColorAttributes = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3); // InstancedBuffer是每个实例一份
instancedGeometry.setAttribute("aColor", aColorAttributes);
// 方式一: 使用Normal材质
// const normalMaterial = new THREE.MeshNormalMaterial();
// const instancedMesh = new THREE.InstancedMesh(instancedGeometry, normalMaterial, count);

// 方式二: 自己编写材质
const customShaderMaterial = new THREE.RawShaderMaterial({
  glslVersion: THREE.GLSL3,
  side: THREE.FrontSide,
  defines: { USE_INSTANCING: 1 },
  uniforms: {},
  vertexShader: `
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    in vec3 position;
    in vec3 aColor; // InstancedBufferAttribute 每个实例只会有一个值
    #if defined(USE_INSTANCING)
    in mat4 instanceMatrix;
    #endif

    flat out vec3 vColor;

    void main() {
      vColor = aColor;

      vec4 localPosition = vec4(position, 1.0);
      #if defined(USE_INSTANCING)
      localPosition = instanceMatrix * localPosition;
      #endif

      gl_Position = projectionMatrix * modelViewMatrix * localPosition;
    }
  `,
  fragmentShader: `
  precision highp float;

  flat in vec3 vColor;

  out vec4 outColor;

  void main() {
    outColor = vec4(vColor, 1.0);
  }
  `,
});
const instancedMesh = new THREE.InstancedMesh(instancedGeometry, customShaderMaterial, count);

const euler = new THREE.Euler();
const matrix = new THREE.Matrix4();
const represents = [];
for (let i = 0; i < count; i++) {
  const represent = new THREE.Object3D();
  randomizeMatrix(matrix);
  represent.matrix.copy(matrix);
  represents.push(represent);
  instancedMesh.setMatrixAt(i, represent.matrix);

  aColorAttributes.set([Math.random(), Math.random(), Math.random()], 3 * i);
  aColorAttributes.setUsage(THREE.StaticDrawUsage);
}
aColorAttributes.needsUpdate = true;

for (let i = 0; i < represents.length; i++) {
  const represent = represents[i];
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationFromEuler(randomizeRotationSpeed(euler));
  represent.userData.id = i;
  represent.userData.rotationSpeeds = rotationMatrix; // 生成一个随机的旋转速度, 后续根据这个旋转速度更新矩阵
}

scene.add(instancedMesh);

const animate = () => {
  animateMeshes();

  controls.update();

  renderer.render(scene, camera);

  window.requestAnimationFrame(animate);
};

animate();

//////////////////////////////////////// drawcall监听 ////////////////////////////////////////
import "@libs/Spector.js/dist/spector.bundle.js";

// @ts-ignore
const spector = new SPECTOR.Spector();
spector.displayUI();
