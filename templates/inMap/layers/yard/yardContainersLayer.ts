import { yardContainersLayer } from "@2dmapv2/inMap/";
import { getColorFill } from "@2dmapv2/classes/colorConfig";

import Polygon from "ol/geom/Polygon";
import Feature from "ol/Feature";
import Style from "ol/style/Style";

import { BlockMap } from "@2dmapv2/data";

import { socketioSubModule_map as socketioHelper } from "@2dmapv2/data/";

const BAY_GAP = 400;
const LANE_GAP = 400;
const BAY20LENGTH = 6096;
const BAY40LENGTH = 12192;
const BAY450LENGTH = 13716;

const containerFeatureMap = new Map<string, Feature<Polygon>>();

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

    return feature;
  };

  socketioHelper.registerListener<
    {
      tierCount: 5;
      bayNo: "105";
      rowNo: "04";
      blockId: "YARD-62B";
      ctnSize: "20";
    }[]
  >(`CD.BLOCK.ALL.OverviewYardUnit`, (itemValue) => {
    // console.log(`CD.BLOCK.ALL.OverviewYardUnit`, itemValue);

    if (!Array.isArray(itemValue)) return;
    for (let i = 0; i < itemValue.length; i++) {
      const element = itemValue[i];
      if (!element.blockId) continue;
      const blockAlia = element.blockId.split("-")[1];
      const blockItem = BlockMap.get(blockAlia);
      if (!blockItem) continue;
      if (!element.bayNo) continue;
      if (!element.ctnSize) continue;
      const bayItem = blockItem.bayMap.get(`${blockAlia}_${element.bayNo}_${element.ctnSize}`);
      if (!bayItem) continue;
      if (!element.rowNo) continue;
      const laneItem = blockItem.laneMap.get(`${blockAlia}_${element.rowNo}`);
      if (!laneItem) continue;

      const CENTER_X = bayItem.positions[0];
      const CENTER_Y = laneItem.positions[1];
      let X1: number, Y1: number, X2: number, Y2: number;
      if (element.ctnSize === "20") {
        X1 = CENTER_X + BAY20LENGTH / 1000.0 / 2;
        Y1 = CENTER_Y + 1.2;
        X2 = CENTER_X - BAY20LENGTH / 1000.0 / 2;
        Y2 = CENTER_Y - 1.2;
      } else if (element.ctnSize === "40" || element.ctnSize === "45") {
        X1 = CENTER_X + BAY40LENGTH / 1000.0 / 2;
        Y1 = CENTER_Y + 1.2;
        X2 = CENTER_X - BAY40LENGTH / 1000.0 / 2;
        Y2 = CENTER_Y - 1.2;
      }

      // 看看是不是层更新还是需要新增
      const feature_id = `${blockItem.deviceAlias}_${bayItem.deviceAlias}_${laneItem.deviceAlias}`;
      const featureFound = containerFeatureMap.get(feature_id);
      if (featureFound) {
        const style = featureFound.getStyle() as Style;
        style.setFill(getColorFill(`VARS.YARD_TIER.TIER${element.tierCount}`));
        featureFound.changed();
      } else {
        const feature = createYardContainerFeature(X1, Y1, X2, Y2, element.tierCount, feature_id);
        containerFeatureMap.set(feature_id, feature);
      }

      // 判断前后贝位是否清空
      try {
        const keyFront = `${blockItem.deviceAlias}_${Number.parseInt(bayItem.deviceAlias) - 1}_${laneItem.deviceAlias}`;
        const featureFront = containerFeatureMap.get(keyFront);
        if (featureFront) {
          yardContainersLayer_source.removeFeature(featureFront);
          containerFeatureMap.set(keyFront, undefined);
        }

        const keyBack = `${blockItem.deviceAlias}_${Number.parseInt(bayItem.deviceAlias) + 1}_${laneItem.deviceAlias}`;
        const featureBack = containerFeatureMap.get(keyBack);
        if (featureBack) {
          yardContainersLayer_source.removeFeature(featureBack);
          containerFeatureMap.set(keyBack, undefined);
        }
      } catch (err) {}
    }
  });

  socketioHelper.subReal(undefined, `CD.BLOCK.ALL.OverviewYardUnit`);
};
