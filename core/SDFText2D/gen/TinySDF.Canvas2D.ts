import TinySDF from "tiny-sdf";
import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";

export const glyphs = new Map<string, ReturnType<TinySDF["draw"]>>();

export const gen = (tinySdf: TinySDF, text: string) => {
  const start = performance.now();

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
  canvasWidth = Math.ceil(canvasWidth);
  canvasHeight = Math.ceil(canvasHeight);

  // 将字形出来的单通道纹理转化为4通道的, 并且输出到canvas上
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const offscreen = document.createElement("canvas");
  const offctx = offscreen.getContext("2d");

  let x = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const glyph = glyphs.get(char);
    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    if (char !== " ") {
      offscreen.width = width;
      offscreen.height = height;
      // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
      const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);

      ctx.globalCompositeOperation = "lighten";
      offctx.putImageData(imageData, 0, 0);
      const dx = x;
      const dy = canvasHeight - height + (glyphHeight - glyphTop);
      ctx.drawImage(offscreen, dx, dy);
    }
    x += glyphAdvance;
  }

  const end = performance.now();
  console.warn(`TinySDF.Canvas2D.gen in ${end - start}ms`);

  return canvas;
};
