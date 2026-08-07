import { mousePosition } from "@2dmapv2/inMap/listeners/mousePositionListener";
import { _coordinateTrans_mm } from "@2dmapv2/inMap/coordinateTrans";

import { ref } from "vue";

export const manualPosX = ref("");
export const manualPosY = ref("");

export const syncMousePositionEvent = (e) => {
  if (e.code === "KeyA") {
    const _traned = _coordinateTrans_mm(mousePosition.positionX, mousePosition.positionY);
    const posX = _traned[0].toFixed(2);
    const posY = _traned[1].toFixed(2);

    manualPosX.value = posX;
    manualPosY.value = posY;
  }
};
