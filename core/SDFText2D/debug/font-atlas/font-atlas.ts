import "normalize.css";
import * as THREE from "three";

//  准备atlas贴图, 并将atlas贴图展示到网页上
import { tinySDFAtlas } from "@core/SDFText2D/TinySdfAtlas";
import { ATLAS_TEXTURE_SIZE } from "@core/SDFText2D/TinySdfAtlas";

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
for (let p = 0; p < pages.length; p++) {
  const canvas = pages[p];
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, size, size);
  const rgba = imageData.data;
  const pageOffset = p * layerSize;

  for (let j = 0; j < layerSize; j++) {
    data[pageOffset + j] = rgba[j * 4 + 0]; // R 通道
  }
}
const textureArray = new THREE.DataArrayTexture(data, size, size, pages.length); // 准备threejs DataArrayTexture (字形数据存储在红色通道)
textureArray.flipY = false;
textureArray.format = THREE.RedFormat;
textureArray.type = THREE.UnsignedByteType;
textureArray.minFilter = THREE.LinearFilter;
textureArray.magFilter = THREE.LinearFilter;
textureArray.generateMipmaps = false;
textureArray.needsUpdate = true;

import { SDF_FONT_SIZE } from "@core/SDFText2D/TinySdfAtlas";
import { SDF_BUFFER } from "@core/SDFText2D/TinySdfAtlas";
import { SDF_SIZE } from "@core/SDFText2D/TinySdfAtlas";

/**
 * 创建材质 (确保 #version 300 es + glslVersion: THREE.GLSL3)
 *  NOTE: 使用 RawShaderMaterial + GLSL3 (Texture2DArray 需要 WebGL2)
 */
const createSDFMaterial = (textureArray: THREE.DataArrayTexture) => {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
    uniforms: {
      uAtlas: { value: textureArray },
      uColor: { value: new THREE.Color(0xffffff) },
      uBgColor: { value: new THREE.Color(0x1565c0) },
      uThreshold: { value: 0.5 },
      uSmoothing: { value: 0.1 },
      uRadius: { value: 0.15 },
    },
    vertexShader: /*glsl*/ `
      in vec3 position;
      in vec2 uv;
      in float aPage;
      in float aType;
      in vec2 aLocalPos;
      in float aLocalAspect;

      out vec2 vUv;
      flat out int vPage;
      flat out float vType;
      out vec2 vLocalPos;
      out float vLocalAspect;

      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;

      void main() {
        vUv = uv;
        vPage = int(aPage);
        vType = aType;
        vLocalPos = aLocalPos;
        vLocalAspect = aLocalAspect;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl*/ `
      precision highp float;
      precision highp sampler2DArray;

      uniform sampler2DArray uAtlas;
      uniform vec3 uColor;
      uniform vec3 uBgColor;
      uniform float uThreshold;
      uniform float uSmoothing;
      uniform float uRadius;

      in vec2 vUv;
      flat in int vPage;
      flat in float vType;
      in vec2 vLocalPos;
      in float vLocalAspect;

      out vec4 outColor;

      float roundedBoxSDF(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return length(max(q, 0.0)) - r;
      }

      // 计算方法: 先将空间在 y 方向缩放(p2, b2, r2)
      /// 在缩放空间计算 SDF, 再将距离除以 aspect 还原.
      float roundedBoxSDF_aspect(vec2 p, vec2 b, float r, float aspect) {
        // scale coordinates in y
        vec2 p2 = vec2(p.x, p.y * aspect);
        vec2 b2 = vec2(b.x, b.y * aspect);
        float r2 = r * aspect;

        vec2 q = abs(p2) - b2 + r2;
        float d = length(max(q, 0.0)) - r2;

        // 把距离映射回原始空间
        return d / aspect;
      }

      void main() { 
        if (vType < 0.5) {
          vec2 halfSize = vec2(0.5); 
          // float rbmask = roundedBoxSDF(vLocalPos, halfSize, uRadius);
          float rbmask = roundedBoxSDF_aspect(vLocalPos, halfSize, uRadius, vLocalAspect);
          float edge = 0.005; // 控制边缘软硬
          float rbmaskF = 1.0 - smoothstep(0.0, edge, rbmask);
          outColor = vec4(uBgColor, rbmaskF);
          return;
        }
        
        // sample SDF from texture array (R channel)
        float dist = texture(uAtlas, vec3(vUv, float(vPage))).r;

        // smoothstep around threshold; note uSmoothing should be small (e.g. 0.02..0.08)
        float alpha = smoothstep(uThreshold - uSmoothing, uThreshold + uSmoothing, dist);

        outColor = vec4(vec3(dist), alpha);
      }
    `,
  });
};

/**
 * 根据输入字符串和设置创建网格(单一合并 mesh)
 * 说明:
 *  - 每个 glyph 产生 4 顶点(一个 quad)
 *  - 我们为每个顶点写 position(3), uv(2), aPage(1)
 */
const createTextMesh = (text: string, fontSize: number = 4, lineHeight: number = 5) => {
  // 环境检查: 是否支持 WebGL2(必需: sampler2DArray)
  // 这里不能访问 renderer yet；如果需要，可外部检查 renderer.capabilities.isWebGL2
  // console.warn(renderer.capabilities.isWebGL2);

  const material = createSDFMaterial(textureArray);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const pages: number[] = [];
  const types: number[] = [];
  const localPos: number[] = [];
  const localAspect: number[] = [];

  const padding = [4.0, 4.0, 4.0, 4.0];

  let cursorColumn = 0; // 当前光标在的column
  let cursorX = 0;
  let cursorZ = 0;
  let cursorX_max = 0.0;
  let cursorZ_max = 0.0;
  let indexOffset = 4; // 0
  const scale = fontSize / SDF_FONT_SIZE; // tinySdfInstance["size"];
  const offset = Math.log2(SDF_FONT_SIZE) * scale;

  // 生成字形
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
    const w = width * scale;
    const h = height * scale;
    const x = cursorX;
    const y = cursorZ - glyphTop * scale;

    positions.push(x, 0, y, x + w, 0, y, x + w, 0, y + h, x, 0, y + h); // vertex
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1); // uv
    indices.push(indexOffset, indexOffset + 2, indexOffset + 1, indexOffset, indexOffset + 3, indexOffset + 2);
    pages.push(page, page, page, page);
    types.push(1, 1, 1, 1);
    localPos.push(0, 0, 0, 0, 0, 0, 0, 0);
    localAspect.push(0, 0, 0, 0);
    indexOffset += 4;

    cursorColumn += 1;
    cursorX += glyphAdvance * scale + offset;
    cursorX_max = Math.max(cursorX_max, cursorX);
    cursorZ_max = Math.max(cursorZ_max, cursorZ);
  }

  // 生成背景
  const halfSDF = (SDF_SIZE * scale) / 2.0;
  const halfFont = fontSize / 2.0;
  const paddingTop = padding[0];
  const paddingRight = padding[1];
  const paddingBottom = padding[2];
  const paddingLeft = padding[3];
  const a1 = [0.0 - paddingLeft, 0.0, 0.0 - paddingBottom - halfSDF]; // 左下
  const a2 = [cursorX_max + paddingRight + halfFont, 0.0, 0.0 - paddingBottom - halfSDF];
  const a3 = [cursorX_max + paddingRight + halfFont, 0.0, cursorZ_max + paddingTop + halfSDF]; // 右上
  const a4 = [0.0 - paddingLeft, 0.0, cursorZ_max + paddingTop + halfSDF];
  const aspect = (cursorZ_max + paddingTop + halfSDF - (-paddingBottom - halfSDF)) / (cursorX_max + paddingRight + halfFont - (0.0 - paddingLeft)); // z / x
  // console.log(aspect);
  positions.unshift(...a1, ...a2, ...a3, ...a4);
  // console.log(...a1, ...a2, ...a3, ...a4);
  uvs.unshift(0, 0, 0, 0, 0, 0, 0, 0);
  indices.unshift(0, 2, 1, 0, 3, 2);
  pages.unshift(0, 0, 0, 0);
  types.unshift(0, 0, 0, 0);
  localPos.unshift(-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5);
  localAspect.unshift(aspect, aspect, aspect, aspect);

  // 绑定buffer
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("aPage", new THREE.Float32BufferAttribute(pages, 1));
  geometry.setAttribute("aType", new THREE.Float32BufferAttribute(types, 1));
  geometry.setAttribute("aLocalPos", new THREE.Float32BufferAttribute(localPos, 2)); // 局部空间, 用于计算背景
  geometry.setAttribute("aLocalAspect", new THREE.Float32BufferAttribute(localAspect, 1)); // 局部空间, 用于计算背景
  geometry.setIndex(indices);

  geometry.computeBoundingBox();
  geometry.translate(
    // 居中 XZ 轴 (避免改变 Y)
    -(geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2,
    0,
    -(geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2,
  );

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

  renderer.render(scene, camera);

  orbitcontrols.update();
};

animate();
