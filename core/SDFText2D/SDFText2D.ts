import * as THREE from "three";

import vs from "./shaders/sdfText2d.vs?raw";
import fs from "./shaders/sdfText2d.fs?raw";
import TinySDF from "tiny-sdf";

import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";
import { Sprite2DGeometry } from "@core/Sprite2D/index";

import { gen as genTinySDFCanvas2D, glyphs } from "./gen/TinySDF.Canvas2D";

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
  /** 文字 */
  text: string;

  /** 写入深度图的值 */
  depth: number;
}

export class SDFText2D extends THREE.Mesh implements SDFText2DParameters {
  text: string;
  texture: THREE.Texture;
  depth: number;

  constructor({ text = "?", depth = 1 }: SDFText2DParameters) {
    super();

    const canvas = genTinySDFCanvas2D(tinySdf, text);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;

    this.texture = texture;
    this.depth = depth;

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

        uThreshold: { value: 0.7 }, // 描边内边
        uOutlineThreshold: { value: 0.65 }, // 描边外边
        uSmoothing: { value: 0.02 }, // 描边过渡
        opacity: { value: 0.8 }, // 透明度
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    this.geometry = geometry;
    this.material = material;
    this.renderOrder = depth; // 给 threejs 的 opaque render list 排序
  }
}
