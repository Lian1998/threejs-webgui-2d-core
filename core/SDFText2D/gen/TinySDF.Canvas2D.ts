import TinySDF from "tiny-sdf";
import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";

/** 缓存通过TinySDF生成过的字形 */
export const glyphsCache = new Map<string, ReturnType<TinySDF["draw"]>>();

export const gen = (tinySdf: TinySDF, text: string): HTMLCanvasElement => {
  console.time(`TinySDF.Canvas2D.gen`);

  // 生成字形, 并计算text的整体长度和高度
  const chars = Array.from(text);
  let canvasWidth = 0;
  let canvasHeight = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    let glyph = glyphsCache.get(char);
    if (!glyph) {
      glyph = tinySdf.draw(char);
      glyphsCache.set(char, glyph);
    }

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

  // 先将字形的ImageData贴到glyphCanvas, 再最终贴到text输出的Canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glyphCanvas = document.createElement("canvas");
  const glyphCanvasctx = glyphCanvas.getContext("2d");
  let x = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const glyph = glyphsCache.get(char);
    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    if (char !== " ") {
      glyphCanvas.width = width;
      glyphCanvas.height = height;
      // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
      const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);

      ctx.globalCompositeOperation = "lighten";
      glyphCanvasctx.putImageData(imageData, 0, 0);
      const dx = x;
      const dy = canvasHeight - height + (glyphHeight - glyphTop);
      ctx.drawImage(glyphCanvas, dx, dy);
    }
    x += glyphAdvance;
  }

  console.timeEnd(`TinySDF.Canvas2D.gen`);

  return canvas;
};
