import * as THREE from "three";

import vs from "./shaders/sdfText2d.vs?raw";
import fs from "./shaders/sdfText2d.fs?raw";
import TinySDF from "tiny-sdf";

import { makeRGBAImageData } from "@source/utils/canvas2d_buffers";

export interface SDFText2DParameters {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
}

// https://mapbox.github.io/tiny-sdf/
const tinySdf = new TinySDF({
  fontSize: 64, // Font size in pixels
  fontFamily: "sans-serif", // CSS font-family
  fontWeight: "normal", // CSS font-weight
  fontStyle: "normal", // CSS font-style
  buffer: 0, // Whitespace buffer around a glyph in pixels
  radius: 4, // How many pixels around the glyph shape to use for encoding distance
  cutoff: 0.25, // How much of the radius (relative) is used for the inside part of the glyph
});

export class SDFText2D extends THREE.Object3D {
  mesh: THREE.Mesh = undefined;
  static glyphCache: Record<string, ReturnType<TinySDF["draw"]>> = {};

  constructor(text = "", params: SDFText2DParameters = {}) {
    super();

    // @ts-ignore
    this.isMesh = true;

    // @ts-ignore
    this.type = "Mesh";

    const glyphs = [];
    let canvasWidth = 0;
    let canvasHeight = 0;
    for (const char of text) {
      const glyph = SDFText2D.glyphCache[char] || tinySdf.draw(char);
      SDFText2D.glyphCache[char] = glyph;

      const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
      canvasWidth += glyphWidth;
      canvasHeight = Math.max(canvasHeight, glyphHeight);
      glyphs.push(glyph);
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(canvasWidth);
    canvas.height = Math.ceil(canvasHeight);
    const ctx = canvas.getContext("2d");

    let x = 0;
    for (const glyph of glyphs) {
      console.log(glyph);
      const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
      if (glyphWidth > 0) {
        const imageData = new ImageData(makeRGBAImageData(data, glyphWidth, glyphHeight), glyphWidth, glyphHeight);
        ctx.putImageData(imageData, x + glyphLeft, 0.6 * 64 - glyphTop);
      }
      x += glyphAdvance;
    }

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.flipY = false;

    const geometry = new THREE.BufferGeometry();
    const width_half = canvasWidth / 2;
    const height_half = canvasHeight / 2;

    // prettier-ignore
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      -width_half, 0, -height_half,
      -width_half, 0, +height_half,
      +width_half, 0, +height_half,
      +width_half, 0, -height_half,
    ], 3));

    // prettier-ignore
    geometry.setAttribute("aTextCoord", new THREE.BufferAttribute(new Float32Array([
      0, 0,
      0, 1,
      1, 1,
      1, 0,
    ]), 2));

    geometry.setIndex([1, 2, 0, 2, 3, 0]);

    const material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
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

    this.scale.multiplyScalar(10.0 / 64.0); // 米 per fontSize
  }
}
