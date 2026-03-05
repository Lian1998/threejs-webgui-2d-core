import "normalize.css";
import { tinySDFAtlas } from "@core/SDFText2D/TinySdfAtlas";

window.addEventListener("load", () => {
  tinySDFAtlas.prepareGlyph();

  const canvasEls = tinySDFAtlas.getAllPages();

  for (let i = 0; i < canvasEls.length; i++) {
    const canvasEl = canvasEls[i];
    canvasEl.style.border = "1px solid black";
    document.body.appendChild(canvasEl);
  }

  console.warn(tinySDFAtlas.glyphMap);
});
