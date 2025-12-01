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
        uTexture: { value: texture },
        uColor: { value: new THREE.Color(0xff0000) },
        uScale: { value: 3.0 / fontSize }, // 米/像素
        smoothing: { value: 0.05 },
        threshold: { value: 0.7 }, // 描边内边
        outlineDistance: { value: 0.6 }, // 描边外边
        outlineColor: { value: new THREE.Color(0x000000) },
        opacity: { value: 1.0 },
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    this.geometry = geometry;
    this.material = material;
    this.renderOrder = depth; // 给 threejs 的 opaque render list 排序
  }
}
