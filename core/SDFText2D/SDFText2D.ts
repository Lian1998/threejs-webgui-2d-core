import * as THREE from "three";

import vs from "./shaders/sdfText2d.vs?raw";
import fs from "./shaders/sdfText2d.fs?raw";
import TinySDF from "tiny-sdf";

import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";
import { Sprite2DGeometry } from "@core/Sprite2D/index";

const fontSize = 64;
const buffer = Math.ceil(fontSize / 8);
const radius = Math.ceil(fontSize / 3);

const glyphs = new Map<string, ReturnType<TinySDF["draw"]>>();

// 通过 tiny-sdf 获取字形相关信息
// repo: https://github.com/mapbox/tiny-sdf
// demo: https://github.com/mapbox/tiny-sdf/blob/main/index.html
// demo-page: https://mapbox.github.io/tiny-sdf/
// sdf in webgl: https://cs.brown.edu/people/pfelzens/papers/dt-final.pdf
const tinySdf = new TinySDF({
  fontSize: fontSize, // Font size in pixels
  fontFamily: "sans-serif", // CSS font-family
  fontWeight: "normal", // CSS font-weight
  fontStyle: "normal", // CSS font-style
  buffer: buffer, // Whitespace buffer around a glyph in pixels
  radius: radius, // How many pixels around the glyph shape to use for encoding distance
  cutoff: 0.25, // How much of the radius (relative) is used for the inside part of the glyph
});

export interface SDFText2DParameters {
  /** 文字 */
  text: string;

  /** 写入深度图的值 */
  depth: number;
}

export class SDFText2D extends THREE.Object3D {
  mesh: THREE.Mesh = undefined;

  constructor({ text = "?", depth = 1 }: SDFText2DParameters) {
    super();

    // @ts-ignore
    this.isMesh = true;

    // @ts-ignore
    this.type = "Mesh";

    const chars = Array.from(text);

    let canvasWidth = 0;
    let canvasHeight = 0;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const glyph = glyphs.get(char) || tinySdf.draw(char);
      glyphs.set(char, glyph);

      const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
      if (i + 1 !== chars.length) {
        canvasWidth += glyphAdvance;
      } else {
        canvasWidth += width;
      }
      canvasHeight = Math.max(canvasHeight, height);
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(canvasWidth);
    canvas.height = Math.ceil(canvasHeight);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offscreen = document.createElement("canvas");
    const offctx = offscreen.getContext("2d");

    let x = 0;
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const glyph = glyphs.get(char);
      console.log(char, glyph);
      const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
      if (char !== " ") {
        offscreen.width = width;
        offscreen.height = height;
        // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
        const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);

        offctx.putImageData(imageData, 0, 0);
        ctx.globalCompositeOperation = "lighten";
        const dx = x;
        const dy = canvasHeight - height + (glyphHeight - glyphTop);
        ctx.drawImage(offscreen, dx, dy);
      }
      x += glyphAdvance;
    }

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;

    const geometry = new Sprite2DGeometry(canvasWidth, canvasHeight);

    const material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uTexture: { value: texture },
        uTextureSize: { value: new THREE.Vector2(canvasWidth, canvasHeight) },
        uWeight: { value: 0.1 },
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    // @ts-ignore
    this.geometry = geometry;

    // @ts-ignore
    this.material = material;

    this.renderOrder = depth; // 给 threejs 的 opaque render list 排序
    this.scale.multiplyScalar(1.0 / 64.0); // 米 per fontSize
  }
}
