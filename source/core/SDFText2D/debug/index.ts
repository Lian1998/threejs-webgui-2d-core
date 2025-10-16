// https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API

// vitejs 引入 worker
// import TestWorker from "./testWorker?worker";
const testWorker = new Worker(new URL("./TestWorker.ts", import.meta.url), { type: "module" });
testWorker.postMessage(10);

import TinySDF from "tiny-sdf";
import { makeRGBAImageData } from "@source/utils/canvas2d_buffers";

const fontSize = 128;
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

export const initialization = () => {
  // const text = "你好 世界!";
  const text = "Hello World!";

  let canvasWidth = 0;
  let canvasHeight = 0;

  for (const char of text) {
    const glyph = glyphs.get(char) || tinySdf.draw(char);
    glyphs.set(char, glyph);

    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    canvasWidth += glyphAdvance;
    canvasHeight = Math.max(canvasHeight, height);
  }

  // 将字形出来的单通道纹理转化为4通道的, 并且输出到canvas上
  const canvas = document.querySelector("#viewport") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = Math.ceil(canvasWidth);
  canvas.height = Math.ceil(canvasHeight);

  let x = 0;
  for (const char of text) {
    const glyph = glyphs.get(char);
    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    console.log(char, glyph);
    if (char !== " ") {
      // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
      const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);
      ctx.putImageData(imageData, x, canvasHeight - height + (glyphHeight - glyphTop));
    }
    x += glyphAdvance;
  }
};
