// https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API

import TinySDF from "tiny-sdf";

export const initialization = () => {
  // vitejs 引入 worker

  // import TestWorker from "./testWorker?worker";
  const testWorker = new Worker(new URL("./TestWorker.ts", import.meta.url), { type: "module" });
  testWorker.postMessage(10);

  // sdf

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

  const canvas = document.querySelector("#viewport") as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
  const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);
  ctx.putImageData(imageData, 0, 0);
};

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
