import { yardContainersLayer } from "@2dmapv2/inMap/";
import { getColorFill } from "@2dmapv2/classes/colorConfig";

import Polygon from "ol/geom/Polygon";
import Feature from "ol/Feature";
import Style from "ol/style/Style";

import { BlockMap } from "@2dmapv2/data";

const BAY_GAP = 400;
const LANE_GAP = 400;
const BAY20LENGTH = 6096;
const BAY40LENGTH = 12192;
const BAY450LENGTH = 13716;

export const initLayer = () => {
  // @ts-ignore
  yardContainersLayer.renderBuffer_ = 2000;

  const yardContainersLayer_source = yardContainersLayer.getSource();

  const createYardContainerFeature = (x1: number, y1: number, x2: number, y2: number, tier: number, feature_id: string) => {
    const coordinates = [
      [
        [x1, y2],
        [x2, y2],
        [x2, y1],
        [x1, y1],
        [x1, y2],
      ],
    ];
    const feature = new Feature({ geometry: new Polygon([]) });
    feature.getGeometry().setCoordinates(coordinates);
    feature.setId(feature_id);
    const style = new Style();
    style.setFill(getColorFill(`VARS.YARD_TIER.TIER${tier}`));
    feature.setStyle(style);
    yardContainersLayer_source.addFeature(feature);
  };

  BlockMap.forEach((blockItem, key) => {
    blockItem.bayMap.forEach((bayItem, key) => {
      if (bayItem.duplicated === true) return;

      blockItem.laneMap.forEach((laneItem, key) => {
        const blockId = blockItem.deviceAlias;
        const bayId = bayItem.deviceAlias;
        const laneId = laneItem.deviceAlias;

        // lane为工作位不进行计算
        if (laneId.length > 2) return;

        const CENTER_X = bayItem.positions[0];
        const CENTER_Y = laneItem.positions[1];
        const feature_id = `${blockId}_${bayId}_${laneId}`;

        const size = bayItem.size;

        // 45尺
        if (bayId === "002" && size === 45) {
          if (bayItem.duplicated === true) return;
          const X1 = CENTER_X + BAY40LENGTH / 1000.0 / 2;
          const Y1 = CENTER_Y + 1.2;
          const X2 = CENTER_X - BAY40LENGTH / 1000.0 / 2;
          const Y2 = CENTER_Y - 1.2;
          createYardContainerFeature(X1, Y1, X2, Y2, Math.floor(Math.random() * 6), feature_id);
        }
        // 20尺 显示单数贝
        else if (size === 20) {
          if (Number(bayItem.deviceAlias) % 2 === 0) return;
          const X1 = CENTER_X + BAY20LENGTH / 1000.0 / 2;
          const Y1 = CENTER_Y + 1.2;
          const X2 = CENTER_X - BAY20LENGTH / 1000.0 / 2;
          const Y2 = CENTER_Y - 1.2;
          createYardContainerFeature(X1, Y1, X2, Y2, Math.floor(Math.random() * 6), feature_id);
        }
        // 40尺 显示双数贝
        else {
          if (Number(bayItem.deviceAlias) % 2 === 1) return;
          if (bayItem.duplicated === true) return;
          const X1 = CENTER_X + BAY40LENGTH / 1000.0 / 2;
          const Y1 = CENTER_Y + 1.2;
          const X2 = CENTER_X - BAY40LENGTH / 1000.0 / 2;
          const Y2 = CENTER_Y - 1.2;
          createYardContainerFeature(X1, Y1, X2, Y2, Math.floor(Math.random() * 6), feature_id);
        }

        // // 45尺
        // else if (size === 45) {
        //   if (Number(bayItem.deviceAlias) % 2 === 1) return;
        //   if (bayItem.duplicated === true) return;
        //   const X1 = CENTER_X + BAY450LENGTH / 1000.0 / 2;
        //   const Y1 = CENTER_Y + 1.2;
        //   const X2 = CENTER_X - BAY450LENGTH / 1000.0 / 2;
        //   const Y2 = CENTER_Y - 1.2;
        //   createYardContainerFeature(X1, Y1, X2, Y2, Math.floor(Math.random() * 6), feature_id);
        // }
      });
    });
  });
};
