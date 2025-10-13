// https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API

import TinySDF from "tiny-sdf";

import { makeRGBAImageData } from "@source/utils/canvas2d_buffers";

export const initialization = () => {
  // vitejs 引入 worker

  // import TestWorker from "./testWorker?worker";
  const testWorker = new Worker(new URL("./TestWorker.ts", import.meta.url), { type: "module" });
  testWorker.postMessage(10);

  // 通过 tiny-sdf 获取字形相关信息
  // https://github.com/mapbox/tiny-sdf
  // https://mapbox.github.io/tiny-sdf/
  const tinySdf = new TinySDF({
    fontSize: 24, // Font size in pixels
    fontFamily: "sans-serif", // CSS font-family
    fontWeight: "normal", // CSS font-weight
    fontStyle: "normal", // CSS font-style
    buffer: 3, // Whitespace buffer around a glyph in pixels
    radius: 8, // How many pixels around the glyph shape to use for encoding distance
    cutoff: 0.25, // How much of the radius (relative) is used for the inside part of the glyph
  });

  const glyph = tinySdf.draw("你"); // draw a single character
  const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;

  // 将字形出来的单通道纹理转化为4通道的, 并且输出到canvas上
  const canvas = document.querySelector("#viewport") as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
  const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);
  ctx.putImageData(imageData, 0, 0);
};
