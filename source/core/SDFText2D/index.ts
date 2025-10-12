import * as THREE from "three";

import vs from "./shaders/sdfText2d.vs?raw";
import fs from "./shaders/sdfText2d.fs?raw";
import TinySDF from "tiny-sdf";

/**
 * 将仅包含 alpha 通道的 Uint8ClampedArray 转为 RGBA 四通道
 * @param {Uint8ClampedArray} alphaBuffer - 仅包含 alpha 通道的像素数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {Array|Uint8ClampedArray} [rgb=[0,0,0]] - 可选的底色 (RGB)
 * @returns {Uint8ClampedArray} RGBA 格式像素数据
 */
const makeRGBAImageData = (alphaBuffer: Uint8ClampedArray, width: number, height: number, rgb = [0, 0, 0]) => {
  if (alphaBuffer.length !== width * height) {
    throw new Error("alphaBuffer length does not match width * height");
  }

  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0, j = 0; i < alphaBuffer.length; i++, j += 4) {
    rgba[j + 0] = rgb[0]; // R
    rgba[j + 1] = rgb[1]; // G
    rgba[j + 2] = rgb[2]; // B
    rgba[j + 3] = alphaBuffer[i]; // A
  }

  return rgba;
};

export class SDFText2D extends THREE.Object3D {
  mesh: THREE.Mesh = undefined;

  static glyphs = {};

  constructor() {
    super();

    // @ts-ignore
    this.isMesh = true;

    // @ts-ignore
    this.type = "Mesh";

    // https://mapbox.github.io/tiny-sdf/
    const tinySdf = new TinySDF({
      fontSize: 256, // Font size in pixels
      fontFamily: "sans-serif", // CSS font-family
      fontWeight: "normal", // CSS font-weight
      fontStyle: "normal", // CSS font-style
      buffer: 0, // Whitespace buffer around a glyph in pixels
      radius: 4, // How many pixels around the glyph shape to use for encoding distance
      cutoff: 0.25, // How much of the radius (relative) is used for the inside part of the glyph
    });

    // textInfo: { ctx, canvas, sdfs }
    const glyph = tinySdf.draw("你"); // draw a single character
    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    // console.log(width, height);
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);
    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, height, 0, 0, 0, width, 0, 0, width, 0, height], 3));
    geometry.setAttribute("a_texcoord", new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]), 2));
    geometry.setIndex([1, 2, 0, 2, 3, 0]);

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        u_color: { value: new THREE.Color(0x000000) },
        u_texsize: { value: new THREE.Vector2(width, height) },
        u_texture: { value: texture },
        u_weigth: { value: 0.1 },
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    // @ts-ignore
    this.geometry = geometry;

    // @ts-ignore
    this.material = material;

    this.scale.multiplyScalar(12.0 / 256.0); // 米/fontSize
  }
}
