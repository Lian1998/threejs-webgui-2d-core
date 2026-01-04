import TinySDF from "tiny-sdf";

import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";
import { gen as genTinySDFCanvas2D, glyphsCache } from "../gen/TinySDF.Canvas2D";
import { gen as genTinySDFWebGL2 } from "../gen/TinySDF.WebGL2";

const fontSize = 64; // 字号

// 通过 tiny-sdf 获取字形相关信息
// repo: https://github.com/mapbox/tiny-sdf
// demo: https://github.com/mapbox/tiny-sdf/blob/main/index.html
// demo-page: https://mapbox.github.io/tiny-sdf/
// sdf in webgl: https://cs.brown.edu/people/pfelzens/papers/dt-final.pdf
const tinySdf = new TinySDF({
  fontFamily: "sans-serif",
  fontWeight: "normal",
  fontStyle: "normal",
  fontSize: fontSize,
  buffer: Math.ceil(fontSize / 8), // 字符周围空白区域, 值过小可能导致渲染不全
  radius: Math.max(Math.ceil(fontSize / 3), 8), // 影响距离计算的像素范围, 值过大会导致边缘模糊
  cutoff: 0.25, // 内部区域占比, 值过大会削弱边缘对比度
});

export const initialization = () => {
  const TinySDFCanvas2DCanvas = genTinySDFCanvas2D(tinySdf, "Hello World!");
  const e1 = document.createElement("div");
  e1.appendChild(TinySDFCanvas2DCanvas);
  document.body.appendChild(e1);

  const TinySDFWebGL2Canvas = genTinySDFWebGL2(tinySdf, "Hello World!");
  const e2 = document.createElement("div");
  e2.appendChild(TinySDFWebGL2Canvas);
  document.body.appendChild(e2);

  const divEl = document.createElement("div");
  document.body.appendChild(divEl);
  for (const [key, glyph] of glyphsCache) {
    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    const canvasEl = document.createElement("canvas");
    const ctx = canvasEl.getContext("2d");
    canvasEl.width = width;
    canvasEl.height = height;
    const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);
    ctx.putImageData(imageData, 0, 0);
    divEl.appendChild(canvasEl);
  }
};
