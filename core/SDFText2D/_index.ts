import * as THREE from "three";

import vs from "./shaders/sdfText2d.vs?raw";
import fs from "./shaders/sdfText2d.fs?raw";
import TinySDF from "tiny-sdf";

import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";

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
    texture.flipY = false;
    texture.needsUpdate = true;

    const geometry = new THREE.BufferGeometry();
    const width_half = width / 2;
    const height_half = height / 2;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([-width_half, 0, -height_half, -width_half, 0, +height_half, +width_half, 0, +height_half, +width_half, 0, -height_half], 3));
    geometry.setAttribute("aTextCoord", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]), 2));
    geometry.setIndex([1, 2, 0, 2, 3, 0]);

    const material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uTexture: { value: texture },
        uTextureSize: { value: new THREE.Vector2(width, height) },
        uWeight: { value: 0.1 },
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    // @ts-ignore
    this.geometry = geometry;

    // @ts-ignore
    this.material = material;

    this.scale.multiplyScalar(10.0 / 256.0); // 米 per fontSize
  }
}
