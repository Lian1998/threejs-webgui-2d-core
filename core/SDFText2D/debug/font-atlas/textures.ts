import "normalize.css";
import { tinySdfInstance } from "@core/SDFText2D/font-atlas/tinySdfWrapper";

// 生成 TinySDF 实例
console.warn("tinySdfInstance", tinySdfInstance);

import { tinySDFAtlas } from "@core/SDFText2D/font-atlas/TinySdfAtlas";

window.addEventListener("load", () => {
  tinySDFAtlas.prepareGlyph();

  const canvasEls = tinySDFAtlas.getAllPages();

  for (let i = 0; i < canvasEls.length; i++) {
    const canvasEl = canvasEls[i];
    document.body.appendChild(canvasEl);
  }

  console.log(tinySDFAtlas.glyphMap);
});
