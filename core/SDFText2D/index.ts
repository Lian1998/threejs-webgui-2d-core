export * from "./SDFText2D";
export * from "./SDFText2DMaterial";

export const DEBUG_SDF_BUFFER_RENDER_PERFORMANCE = false;

import TinySDF from "tiny-sdf";

export const fontSize = 64; // 字号
const buffer = Math.ceil(fontSize / 4); // 字符周围空白区域, 值过小可能导致渲染不全
const radius = Math.max(Math.ceil(fontSize / 3), 8); // 影响距离计算的像素范围, 值过大会导致边缘模糊
const cutoff = 0.25; // 内部区域占比, 值过大会削弱边缘对比度

// 通过 tiny-sdf 获取字形相关信息
// repo: https://github.com/mapbox/tiny-sdf
// demo: https://github.com/mapbox/tiny-sdf/blob/main/index.html
// demo-page: https://mapbox.github.io/tiny-sdf/
// sdf in webgl: https://cs.brown.edu/people/pfelzens/papers/dt-final.pdf
export const tinySdfInstance = new TinySDF({
  fontFamily: "sans-serif", // CSS font-family
  fontWeight: "normal", // CSS font-weight
  fontStyle: "normal", // CSS font-style
  fontSize: fontSize,
  buffer: buffer,
  radius: radius,
  cutoff: cutoff,
});
