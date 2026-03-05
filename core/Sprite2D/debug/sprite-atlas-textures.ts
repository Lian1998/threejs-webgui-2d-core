import "normalize.css";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";

window.addEventListener("load", async () => {
  await spriteAtlas.prepareSprite([
    "/resource/sprites/AGV_Base.png",
    "/resource/sprites/AGV_Header.png",
    "/resource/sprites/AGV_Pin.png",
    "/resource/sprites/AGV_Recharge.png",
    "/resource/sprites/ASC_Gantry.png",
    "/resource/sprites/STS_Gantry.png",
    "/resource/sprites/STS_Trolley.png",
    "/resource/sprites/TRUCK.png",
  ]); // prettier-ignore

  const canvasEls = spriteAtlas.getAllPages();

  for (let i = 0; i < canvasEls.length; i++) {
    const canvasEl = canvasEls[i];
    canvasEl.style.border = "1px solid black";
    document.body.appendChild(canvasEl);
  }

  console.warn(spriteAtlas.spriteMap);
});
