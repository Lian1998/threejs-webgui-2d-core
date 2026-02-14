import * as THREE from "three";

import vs from "./shaders/sdfText2d.vs?raw";
import fs from "./shaders/sdfText2d.fs?raw";
import TinySDF from "tiny-sdf";

import { Sprite2DGeometry } from "@core/Sprite2D/index";

import { gen as genTinySDFCanvas2D } from "./gen/TinySDF.Canvas2D";

const fontSize = 64; // 字号
const buffer = Math.ceil(fontSize / 4); // 字符周围空白区域, 值过小可能导致渲染不全
const radius = Math.max(Math.ceil(fontSize / 3), 8); // 影响距离计算的像素范围, 值过大会导致边缘模糊
const cutoff = 0.25; // 内部区域占比, 值过大会削弱边缘对比度

// 通过 tiny-sdf 获取字形相关信息
// repo: https://github.com/mapbox/tiny-sdf
// demo: https://github.com/mapbox/tiny-sdf/blob/main/index.html
// demo-page: https://mapbox.github.io/tiny-sdf/
// sdf in webgl: https://cs.brown.edu/people/pfelzens/papers/dt-final.pdf
const tinySdf = new TinySDF({
  fontFamily: "sans-serif", // CSS font-family
  fontWeight: "normal", // CSS font-weight
  fontStyle: "normal", // CSS font-style
  fontSize: fontSize,
  buffer: buffer,
  radius: radius,
  cutoff: cutoff,
});

export interface SDFText2DParameters {
  text: string;
  renderOrder: number;
}

/** 缓存文字字符串生成过的贴图 */
const canvasCache = new Map<string, HTMLCanvasElement>();

export class SDFText2D extends THREE.Mesh implements SDFText2DParameters {
  text: string;
  texture: THREE.Texture;

  constructor({ text = "?", renderOrder = 1 }: SDFText2DParameters) {
    super();

    let canvas = canvasCache.get(text);
    if (!canvas) {
      canvas = genTinySDFCanvas2D(tinySdf, text);
      canvasCache.set(text, canvas);
    }

    const texture = new THREE.Texture(canvas);
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter; // THREE.NearestFilter
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.format = THREE.RedFormat; // 注意兼容性
    texture.needsUpdate = true;

    this.texture = texture;
    this.renderOrder = renderOrder;

    // 生成几何
    const geometry = new Sprite2DGeometry(canvas.width, canvas.height);

    // 生成材质
    const material = new THREE.ShaderMaterial({
      name: "SDFText2DShaderMaterial",
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        uScale: { value: 4.0 / fontSize }, // threejs三维空间单位(米)/贴图字号像素
        uTexture: { value: texture },
        uTextColor: { value: new THREE.Color(0x000000) }, // 字体颜色
        uOutlineColor: { value: new THREE.Color(0x000000) }, // 描边颜色
        uBackgroundColor: { value: new THREE.Color(0xffffff) }, // 背景色
        uBackgroundAlpha: { value: 0.8 }, // 背景色透明度

        uThreshold: { value: 0.7 }, // 描边内边
        uOutlineThreshold: { value: 0.65 }, // 描边外边
        uSmoothing: { value: 0.02 }, // 描边过渡
        opacity: { value: 1.0 }, // 透明度
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    this.geometry = geometry;
    this.material = material;
  }
}
