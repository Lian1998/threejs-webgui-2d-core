import "normalize.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

///////////////////////////////////////////

const position = new THREE.Vector3();
const rotation = new THREE.Euler();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const randomizeMatrix = (matrix: THREE.Matrix4) => {
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

const randomizeRotationSpeed = (target: THREE.Euler) => {
  target.x = Math.random() * 0.01;
  target.y = Math.random() * 0.01;
  target.z = Math.random() * 0.01;
  return target;
};

const animateMeshes = () => {
  const loopNum = Math.min(count, dynamic);
  for (let i = 0; i < loopNum; i++) {
    const represent = represents[i];
    const rotationMatrix = represent.userData.rotationSpeeds;
    represent.matrix.multiply(rotationMatrix);
  }

  for (let i = 0; i < represents.length; i++) {
    const represent = represents[i];
    (represent as THREE.Object3D).lookAt(camera.position);
    const id = represent.userData.id;
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
import { SpriteXZRectGeometry } from "@core/Sprite2D/SpriteXZRectGeometry";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";
import { calculateMpp } from "@source/inMap/utils/ratio";
const sprites = {
  "/resource/sprites/AGV_Base.png": { mpp: calculateMpp(15, 2330) * 0.1 },
  "/resource/sprites/ASC_Gantry.png": { mpp: calculateMpp(54, 6594) * 0.1 },
  "/resource/sprites/STS_Gantry.png": { mpp: calculateMpp(35, 610) * 0.1 },
};
const spritesUrls = Object.keys(sprites);
await spriteAtlas.prepareSprite(spritesUrls);
const pages = spriteAtlas.getAllPages();
import { ATLAS_TEXTURE_SIZE } from "@core/Sprite2D/Sprite2DAtlas";
const size = ATLAS_TEXTURE_SIZE;
const layerSize = size * size;
const data = new Uint8Array(layerSize * pages.length * 4); // RGBA 四通道贴图数据
for (let p = 0; p < pages.length; p++) {
  const canvas = pages[p];
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, size, size);
  const imageDataRGBA = imageData.data;

  const pageOffset = p * layerSize * 4;
  for (let j = 0; j < layerSize; j++) {
    data[pageOffset + j * 4 + 0] = imageDataRGBA[j * 4 + 0]; // R 通道
    data[pageOffset + j * 4 + 1] = imageDataRGBA[j * 4 + 1]; // G 通道
    data[pageOffset + j * 4 + 2] = imageDataRGBA[j * 4 + 2]; // B 通道
    data[pageOffset + j * 4 + 3] = imageDataRGBA[j * 4 + 3]; // A 通道
  }
}

const textureArray = new THREE.DataArrayTexture(data, size, size, pages.length); // 准备 threejs 的 DataArrayTexture，纹理数据按页存储
textureArray.flipY = false;
textureArray.format = THREE.RGBAFormat;
textureArray.type = THREE.UnsignedByteType;
textureArray.minFilter = THREE.LinearFilter;
textureArray.magFilter = THREE.LinearFilter;
textureArray.generateMipmaps = true;
textureArray.needsUpdate = true;

const geometry = new SpriteXZRectGeometry({ x: 1, z: 1 });
const aPageAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
const aUvRectAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
const aSizeAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
const aMultiplyColorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);

const represents: THREE.Object3D[] = [];
for (let i = 0; i < count; i++) {
  const represent = new THREE.Object3D();
  const spriteIndex = Math.floor(spritesUrls.length * Math.random());
  const spriteUrl = spritesUrls[spriteIndex];
  const spriteItem = spriteAtlas.getSpriteAtlas(spriteUrl);
  const { page, u0, v0, u1, v1, imageProps } = spriteItem;
  const { width: spriteWidth, height: spriteHeight } = imageProps;
  const mpp = sprites[spriteUrl].mpp;

  represent.userData.id = i;
  represent.userData.spriteUrl = spriteUrl;
  represent.userData.spriteIndex = spriteIndex;
  randomizeMatrix(represent.matrix);
  represent.matrixAutoUpdate = false;
  represents.push(represent);

  aPageAttribute.setX(i, page);
  aUvRectAttribute.setXYZW(i, u0, v0, u1, v1);
  aSizeAttribute.setXY(i, mpp * spriteWidth, mpp * spriteHeight);
  aMultiplyColorAttribute.setXYZ(i, Math.random(), Math.random(), Math.random());
}

geometry.setAttribute("aPage", aPageAttribute.setUsage(THREE.StaticDrawUsage));
geometry.setAttribute("aUvRect", aUvRectAttribute.setUsage(THREE.StaticDrawUsage));
geometry.setAttribute("aSize", aSizeAttribute.setUsage(THREE.StaticDrawUsage));
geometry.setAttribute("aMultiplyColor", aMultiplyColorAttribute.setUsage(THREE.StaticDrawUsage));

const customShaderMaterial = new THREE.RawShaderMaterial({
  name: "Sprite2DMaterial",
  glslVersion: THREE.GLSL3,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  side: THREE.DoubleSide,
  defines: { USE_INSTANCING: 1 },
  uniforms: {
    uAtlas: { value: textureArray },
  },
  vertexShader: `
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    in vec3 position;
    in vec2 uv;
    in float aPage;
    in vec4 aUvRect;
    in vec2 aSize;
    in vec3 aMultiplyColor;
    #if defined(USE_INSTANCING)
    in mat4 instanceMatrix;
    #endif

    out vec2 vUv;
    flat out int vPage;
    out vec3 vMultiplyColor;

    void main() {
      vUv = mix(aUvRect.xy, aUvRect.zw, uv);
      vPage = int(aPage + 0.5);
      vMultiplyColor = aMultiplyColor;

      vec4 localPosition = vec4(position.x * aSize.x, position.y, position.z * aSize.y, 1.0);
      #if defined(USE_INSTANCING)
      localPosition = instanceMatrix * localPosition;
      #endif

      gl_Position = projectionMatrix * modelViewMatrix * localPosition;
    }
  `,
  fragmentShader: `
    precision highp float;
    precision highp sampler2DArray;

    uniform sampler2DArray uAtlas;

    in vec2 vUv;
    flat in int vPage;
    in vec3 vMultiplyColor;

    vec4 sRGBTransferOETF(in vec4 value) {
      return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
    }

    out vec4 outColor;

    void main() {
      vec4 tColor = texture(uAtlas, vec3(vUv, float(vPage)));
      tColor.rgb = tColor.rgb * vMultiplyColor;
      outColor = vec4(sRGBTransferOETF(tColor).rgb, tColor.a);
      if (outColor.a <= 0.0) {
        discard;
      }
    }
  `,
});
const instancedMesh = new THREE.InstancedMesh(geometry, customShaderMaterial, count);
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
instancedMesh.frustumCulled = false;

const euler = new THREE.Euler();
const matrix = new THREE.Matrix4();
for (let i = 0; i < count; i++) {
  const represent = represents[i];
  instancedMesh.setMatrixAt(i, matrix.copy(represent.matrix));
}

for (let i = 0; i < represents.length; i++) {
  const represent = represents[i];
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationFromEuler(randomizeRotationSpeed(euler));
  represent.userData.rotationSpeeds = rotationMatrix;
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
