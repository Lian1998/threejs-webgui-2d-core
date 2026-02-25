import TinySDF from "tiny-sdf";

export const SDF_FONT_SIZE = 64; // 渲染字体的实际大小
export const SDF_BUFFER = Math.ceil(SDF_FONT_SIZE / 4); // 字符周围空白区域, 留一定的距离可以保证渲染完整
export const SDF_SIZE = SDF_FONT_SIZE + SDF_BUFFER * 2.0; // 生成Buffer的实际大小
export const SDF_RADIUS = Math.max(Math.ceil(SDF_FONT_SIZE / 3), 8); // 边缘到外部的发散
export const SDF_CUTOFF = 0.25; // 中心到边缘的发散

// 通过 tiny-sdf 获取字形相关信息
// repo: https://github.com/mapbox/tiny-sdf
// demo: https://github.com/mapbox/tiny-sdf/blob/main/index.html
// demo-page: https://mapbox.github.io/tiny-sdf/
// sdf in webgl: https://cs.brown.edu/people/pfelzens/papers/dt-final.pdf
export const tinySdfInstance = new TinySDF({
  fontFamily: "sans-serif", // CSS font-family
  fontWeight: "normal", // CSS font-weight
  fontStyle: "normal", // CSS font-style
  fontSize: SDF_FONT_SIZE,
  buffer: SDF_BUFFER,
  radius: SDF_RADIUS,
  cutoff: SDF_CUTOFF,
});
