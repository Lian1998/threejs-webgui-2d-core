import "normalize.css";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";

window.addEventListener("load", async () => {
  // prettier-ignore
  await spriteAtlas.prepareSprite([
    "/resource/device/AGV_Base.png",
    "/resource/device/AGV_Header.png",
    "/resource/device/AGV_Pin.png",
    "/resource/device/AGV_Recharge.png",
    "/resource/device/ASC_Gantry.png",
    "/resource/device/STS_Gantry.png",
    "/resource/device/STS_Trolley.png",
    "/resource/device/TRUCK.png",
  ]);

  const canvasEls = spriteAtlas.getAllPages();

  for (let i = 0; i < canvasEls.length; i++) {
    const canvasEl = canvasEls[i];
    canvasEl.style.border = "1px solid black";
    document.body.appendChild(canvasEl);
  }

  console.warn(spriteAtlas.spriteMap);
});
