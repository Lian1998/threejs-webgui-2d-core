import "normalize.css";
import * as THREE from "three";

//  准备atlas贴图, 并将atlas贴图展示到网页上
import { tinySDFAtlas } from "@core/SDFText2D/font-atlas/TinySdfAtlas";
import { ATLAS_TEXTURE_SIZE } from "@core/SDFText2D/font-atlas/TinySdfAtlas";

tinySDFAtlas.prepareGlyph("你好世界!岸桥场桥:装船卸船移箱集装箱主小车门架小车任务指令状态数值％角度°速度故障模式~，。（）-繁华声遁入空门折煞了世人");
const canvasEls = tinySDFAtlas.getAllPages();
for (let i = 0; i < canvasEls.length; i++) {
  const canvasEl = canvasEls[i];
  document.body.appendChild(canvasEl);
}

// 将atlas贴图转换为threejs贴图对象
const pages = tinySDFAtlas.getAllPages();
const size = ATLAS_TEXTURE_SIZE;
const layerSize = size * size;
const data = new Uint8Array(layerSize * pages.length);
for (let i = 0; i < pages.length; i++) {
  const canvas = pages[i];
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, size, size);
  const rgba = imageData.data;
  const pageOffset = i * layerSize;
  for (let i = 0; i < layerSize; i++) {
    data[pageOffset + i] = rgba[i * 4];
  }
}
const textureArray = new THREE.DataArrayTexture(data, size, size, pages.length);
textureArray.flipY = false;
textureArray.format = THREE.RedFormat;
textureArray.type = THREE.UnsignedByteType;
textureArray.minFilter = THREE.LinearFilter;
textureArray.magFilter = THREE.LinearFilter;
textureArray.generateMipmaps = false;
textureArray.needsUpdate = true;

import { SDF_FONT_SIZE } from "@core/SDFText2D/font-atlas/tinySdfWrapper";
import { SDF_BUFFER } from "@core/SDFText2D/font-atlas/tinySdfWrapper";
import { SDF_SIZE } from "@core/SDFText2D/font-atlas/tinySdfWrapper";

/**
 * 创建材质
 * @param texture
 * @returns
 */
const createSDFMaterial = (textureArray: THREE.DataArrayTexture) => {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    uniforms: {
      uAtlas: { value: textureArray },
      uColor: { value: new THREE.Color(0xffffff) },
      uThreshold: { value: 0.5 },
      uSmoothing: { value: 0.1 },
    },
    vertexShader: /*glsl*/ `
      in vec3 position;
      in vec2 uv;
      in float page;

      out vec2 vUv;
      flat out int vPage;

      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;

      void main() {
        vUv = uv;
        vPage = int(page);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl*/ `
      precision highp float;
      precision highp sampler2DArray;
      
      uniform sampler2DArray uAtlas;

      in vec2 vUv;
      flat in int vPage;

      uniform vec3 uColor;
      uniform float uThreshold;
      uniform float uSmoothing;

      out vec4 outColor;

      void main() {
        float dist = texture(uAtlas, vec3(vUv, float(vPage))).r;
        float alpha = smoothstep(uThreshold - uSmoothing, uThreshold + uSmoothing, dist);
        outColor = vec4(vec3(dist), 1.);
      }
    `,
  });
};

/**
 * 根据输入字符串和设置创建网格
 * @param text
 * @param fontSize
 * @param lineHeight
 * @returns
 */
const createTextMesh = (text: string, fontSize: number = 4, lineHeight: number = 5) => {
  const material = createSDFMaterial(textureArray);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const pages: number[] = [];

  let cursorColumn = 0; // 当前光标在的column
  let cursorX = 0;
  let cursorZ = 0;
  let indexOffset = 0;

  const scale = fontSize / SDF_FONT_SIZE; // tinySdfInstance["size"];

  for (const ch of text) {
    if (ch === "\n") {
      cursorColumn = 0;
      cursorX = 0;
      cursorZ += lineHeight;
      continue;
    } else if (ch === "\t") {
      const glyphAtlas = tinySDFAtlas.getGlyphAtlas(" ");
      cursorX += glyphAtlas.glyph.width * scale * 4.0;
      continue;
    }

    const glyphAtlas = tinySDFAtlas.getGlyphAtlas(ch);
    console.warn(ch, glyphAtlas);

    const { page, glyph, u0, v0, u1, v1 } = glyphAtlas;
    const { data, width, height, glyphWidth, glyphHeight, glyphLeft, glyphTop, glyphAdvance } = glyph;
    let offset = 0.0;
    const w = width * scale;
    const h = height * scale;
    const x = cursorX + offset;
    const y = cursorZ - glyphTop * scale;

    positions.push(x, 0, y, x + w, 0, y, x + w, 0, y + h, x, 0, y + h); // vertex
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1); // uv
    indices.push(indexOffset, indexOffset + 2, indexOffset + 1, indexOffset, indexOffset + 3, indexOffset + 2); // indices
    pages.push(page, page, page, page);
    indexOffset += 4;

    cursorColumn += 1;
    cursorX += glyphAdvance * scale;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("page", new THREE.Float32BufferAttribute(pages, 1));
  geometry.setIndex(indices);

  geometry.computeBoundingBox();
  geometry.center(); // 居中一下几何体

  return new THREE.Mesh(geometry, material);
};

import { OrbitControls } from "three_addons/controls/OrbitControls.js";

const vWidth = 512;
const vHeight = 512;
const pixelRatio = window.devicePixelRatio;
const el = document.getElementById("viewport");

const scene = new THREE.Scene();
const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera(75.0, vWidth / vHeight, 0.1, 1000.0);
camera.position.set(0.0, 25.0, 0.0);

const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(vWidth, vHeight);
renderer.setPixelRatio(pixelRatio);

const orbitcontrols = new OrbitControls(camera, renderer.domElement);

////////////////////////////////

const mesh = createTextMesh("Hello World\n你好世界!哇哇\n\t繁华声遁入空门\n\t\t折煞了世人"); // Hello World\n你好世界!哇哇\n繁华声遁入空门折煞了世人
scene.add(mesh);

///////////////////////////////

const animate = () => {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.01;

  renderer.render(scene, camera);

  orbitcontrols.update();
};

animate();
