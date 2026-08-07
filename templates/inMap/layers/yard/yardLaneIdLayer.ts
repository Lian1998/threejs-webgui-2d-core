import { yardLaneIdLayer } from "@2dmapv2/inMap/";
import { yardLaneIdPartLayer } from "@2dmapv2/inMap/";
import { resizeFactor } from "@2dmapv2/inMap/";

import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Point from "ol/geom/Point";
import Text from "ol/style/Text";

import { LaneMap } from "@2dmapv2/data/";
import { BlockMap } from "@2dmapv2/data/";
import { getColorFill } from "@2dmapv2/classes/colorConfig";

export const initLayer = () => {
  // @ts-ignore
  yardLaneIdLayer.renderBuffer_ = 2000;
  // @ts-ignore
  yardLaneIdPartLayer.renderBuffer_ = 2000;

  const yardLaneIdLayer_source = yardLaneIdLayer.getSource();
  const yardLaneIdPartLayer_source = yardLaneIdPartLayer.getSource();

  yardLaneIdLayer.set("selectable", true);
  yardLaneIdPartLayer.set("selectable", true);

  yardLaneIdLayer.setVisible(false);
  yardLaneIdLayer.set("resizeable", true);
  yardLaneIdLayer.set("resize", () => {
    let visiableDetail = false;
    if (resizeFactor.value >= 3.5) visiableDetail = true;
    yardLaneIdLayer.setVisible(visiableDetail);
    yardLaneIdLayer.set("selectable", visiableDetail);
    yardLaneIdPartLayer.setVisible(!visiableDetail);
    yardLaneIdPartLayer.set("selectable", !visiableDetail);
    return true;
  });

  const createLaneIdFeature = (x: number, y: number, laneId: string) => {
    const feature = new Feature({ geometry: new Point([x, y]) });
    // 设置线的样式
    const style = new Style();
    const text = new Text({
      text: laneId,
      font: "12px sans-serif",
      fill: getColorFill("ANNOTATION"),
    });
    style.setText(text);
    feature.setStyle(style);

    yardLaneIdLayer_source.addFeature(feature);

    try {
      if (Number.parseInt(laneId) % 3 === 0) {
        yardLaneIdPartLayer_source.addFeature(feature);
      }
    } catch (err) {}
  };

  BlockMap.forEach((blockItem) => {
    const laneMap = blockItem.laneMap;
    laneMap.forEach((item: MapTypeV<typeof LaneMap>, key) => {
      try {
        const offsetX = 0.0;
        const offsetY = 0.0;
        const X = item.positions[0];
        const Y = item.positions[1];
        const laneId = item.deviceAlias;

        if (laneId.length > 2) return;
        createLaneIdFeature(X + offsetX, Y + offsetY, laneId);
      } catch (error) {
        console.error(error);
      }
    });
  });
};
