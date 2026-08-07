////////////////////////////////////////////////////
//
//  通过openlayer的MousePosition类, 添加对指针在底图上移动的监控
//
///////////////////////////////////////////////////

import { MousePosition } from "ol/control";
import { map } from "../";
import { LOGIC_CENTER_X } from "@2dmapv2/inMap/coordinateTrans";
import { LOGIC_CENTER_Y } from "@2dmapv2/inMap/coordinateTrans";
import { _coordinateTrans_mm } from "@2dmapv2/inMap/coordinateTrans";
import { useI18n } from "@/hooks/web/useI18n";

export const mousePosition = {
  positionX: 0.0,
  positionY: 0.0,
};

let inited = false;
if (!inited && (import.meta.env.MODE === "development") === true) {
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyS") {
      console.log(`${mousePosition.positionX}, ${mousePosition.positionY}`);
    }
  });
  inited = true;
}

export const initMousePositionListener_EPSG3857 = (domElement) => {
  const mousePositionControl = new MousePosition({
    coordinateFormat: (e) => {
      mousePosition.positionX = e[0];
      mousePosition.positionY = e[1];
      const _position1X = mousePosition.positionX.toFixed(2);
      const _position1Y = mousePosition.positionY.toFixed(2);
      return `EPSG:3857坐标 &nbsp; X: ${_position1X}, Y: ${_position1Y}`;
    },
    projection: "EPSG:3857",
    target: domElement,
  });
  map.addControl(mousePositionControl);

  return mousePositionControl;
};

export const initMousePositionListener_Logic = (domElement) => {
  const mousePositionControl = new MousePosition({
    coordinateFormat: (e) => {
      mousePosition.positionX = e[0];
      mousePosition.positionY = e[1];
      const coordinates = _coordinateTrans_mm(e[0], e[1]);
      const _position2X = coordinates[0].toFixed(2);
      const _position2Y = coordinates[1].toFixed(2);
      return `逻辑坐标 X: ${_position2X}, Y: ${_position2Y}`;
    },
    projection: "EPSG:3857", // 和地图坐标系保持一致
    target: domElement, // 显示位置鼠标坐标位置DOM
  });
  map.addControl(mousePositionControl);

  return mousePositionControl;
};

export const initMousePositionListener_EPSG3857_Logic = (domElement) => {
  const { t } = useI18n();
  const epsg_template = t("2dmapv2.CommonUI.footer.epsg");
  const logic_template = t("2dmapv2.CommonUI.footer.logic");

  const mousePositionControl = new MousePosition({
    coordinateFormat: (e) => {
      mousePosition.positionX = e[0];
      mousePosition.positionY = e[1];
      const _position1X = mousePosition.positionX.toFixed(2);
      const _position1Y = mousePosition.positionY.toFixed(2);
      const _positionX = (LOGIC_CENTER_X - e[0]).toFixed(2);
      const _positionY = (LOGIC_CENTER_Y - e[1]).toFixed(2);

      return `${epsg_template} X: ${_position1X}, Y: ${_position1Y} &nbsp;&nbsp; ${logic_template} X: ${_positionX}, Y: ${_positionY}`;
    },
    projection: "EPSG:3857",
    target: domElement,
  });
  map.addControl(mousePositionControl);

  return mousePositionControl;
};
