import "normalize.css";
import * as THREE from "three";

//  准备atlas贴图, 并将atlas贴图展示到网页上
import { tinySDFAtlas } from "@core/SDFText2D/font-atlas/TinySdfAtlas";
tinySDFAtlas.prepareGlyph("你好世界!");
const canvasEls = tinySDFAtlas.getAllPages();
for (let i = 0; i < canvasEls.length; i++) {
  const canvasEl = canvasEls[i];
  document.body.appendChild(canvasEl);
}

// 将atlas贴图转换为threejs贴图对象
const pages = tinySDFAtlas.getAllPages();
const texture = new THREE.CanvasTexture(pages[0]);
texture.flipY = false;
texture.needsUpdate = true;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;

import { SDF_FONT_SIZE } from "@core/SDFText2D/font-atlas/tinySdfWrapper";
import { SDF_BUFFER } from "@core/SDFText2D/font-atlas/tinySdfWrapper";
import { SDF_SIZE } from "@core/SDFText2D/font-atlas/tinySdfWrapper";

/**
 * 创建材质
 * @param texture
 * @returns
 */
const createSDFMaterial = (texture: THREE.Texture) => {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    uniforms: {
      uMap: { value: texture },
      uColor: { value: new THREE.Color(0xffffff) },
      uThreshold: { value: 0.5 },
      uSmoothing: { value: 0.1 },
    },
    vertexShader: /*glsl*/ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl*/ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uThreshold;
      uniform float uSmoothing;

      varying vec2 vUv;

      void main() {
        float dist = texture2D(uMap, vUv).r;
        float alpha = smoothstep(uThreshold - uSmoothing, uThreshold + uSmoothing, dist);
        gl_FragColor = vec4(vec3(dist), 1.);
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
  const material = createSDFMaterial(texture);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

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
    }

    const glyphAtlas = tinySDFAtlas.getGlyphAtlas(ch);
    console.warn(ch, glyphAtlas);

    const { glyph, u0, v0, u1, v1 } = glyphAtlas;
    const { data, width, height, glyphWidth, glyphHeight, glyphLeft, glyphTop, glyphAdvance } = glyph;
    let offset = 0.0;
    const w = width * scale;
    const h = height * scale;
    const x = cursorX + offset;
    const y = cursorZ - glyphTop * scale;

    positions.push(x, 0, y, x + w, 0, y, x + w, 0, y + h, x, 0, y + h); // vertex
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1); // uv
    indices.push(indexOffset, indexOffset + 2, indexOffset + 1, indexOffset, indexOffset + 3, indexOffset + 2); // indices
    indexOffset += 4;

    cursorColumn += 1;
    cursorX += glyphAdvance * scale;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
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

const mesh = createTextMesh("Hello World\n你好世界!哇哇");
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
