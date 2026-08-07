import { yardBayIdLayer } from "@2dmapv2/inMap/";
import { yardBayIdPartLayer } from "@2dmapv2/inMap/";
import { resizeFactor } from "@2dmapv2/inMap/";

import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Point from "ol/geom/Point";
import Text from "ol/style/Text";
import Fill from "ol/style/Fill";

import { blockBayInfoCardRef } from "@2dmapv2/onMap/index";

import { BayMap } from "@2dmapv2/data/";
import { BlockMap } from "@2dmapv2/data/";
import { getColorFill } from "@2dmapv2/classes/colorConfig";

/** 在此范围内的贝号永远显示 */
const FORCE_VISIABLE = {
  "62D": [117, 135],
  "62E": [117, 139],
};

export const initLayer = () => {
  // @ts-ignore
  yardBayIdLayer.renderBuffer_ = 2000;
  // @ts-ignore
  yardBayIdPartLayer.renderBuffer_ = 2000;

  const yardBayIdLayer_source = yardBayIdLayer.getSource();
  const yardBayIdPartLayer_source = yardBayIdPartLayer.getSource();

  yardBayIdLayer.set("selectable", true);
  yardBayIdPartLayer.set("selectable", true);

  yardBayIdLayer.setVisible(false);
  yardBayIdLayer.set("resizeable", true);
  yardBayIdLayer.set("resize", () => {
    let visiableDetail = false;
    if (resizeFactor.value >= 3.5) visiableDetail = true;
    yardBayIdLayer.setVisible(visiableDetail);
    yardBayIdLayer.set("selectable", visiableDetail);
    yardBayIdPartLayer.setVisible(!visiableDetail);
    yardBayIdPartLayer.set("selectable", !visiableDetail);
    return true;
  });

  const createBayIdFeature = (bayItem: MapTypeV<typeof BayMap>, index: number, total: number) => {
    const offset = [0.0, 2.0];

    if (index === total) offset[0] -= 1.0;
    const position = [bayItem.positions[0] + offset[0], bayItem.positions[1] + offset[1]];

    const bayId = bayItem.deviceAlias;
    const feature = new Feature({ geometry: new Point(position) });
    const style = new Style();
    const text = new Text({
      text: bayId,
      font: "12px sans-serif",
      fill: getColorFill("ANNOTATION"),
      scale: 1.0,
    });
    style.setText(text);
    feature.setStyle(style);

    let isMoveIn = false;

    feature.set("movein", () => {
      isMoveIn = true;
      text.setScale(1.3);
      feature.changed();
    });

    feature.set("moveout", () => {
      isMoveIn = false;
      text.setScale(1.0);
      feature.changed();
    });

    feature.set("selected", () => {
      if (blockBayInfoCardRef.value) blockBayInfoCardRef.value.openInfoCard(bayItem);
    });

    const block_deviceAlias = bayItem.block_deviceAlias;

    // 拉近显示
    let needAdd0 = false;
    if (Number.parseInt(bayId) % 2 === 1) needAdd0 = true; // 只显示单数贝
    if (index === 1) needAdd0 = true; // 如果是堆场第一个贝
    if (index === total) needAdd0 = true; // 如果是堆场最后一个贝
    if (FORCE_VISIABLE[block_deviceAlias]) {
      if (Number.parseInt(bayId) > FORCE_VISIABLE[block_deviceAlias][0]) {
        if (Number.parseInt(bayId) < FORCE_VISIABLE[block_deviceAlias][1]) {
          needAdd0 = true;
        }
      }
    }
    if (needAdd0) {
      const point = (feature as Feature<Point>).getGeometry();
      const coordinate = point.getCoordinates();
      point.setCoordinates(coordinate);
      feature.changed();
      yardBayIdLayer_source.addFeature(feature);
    }

    // 拉远显示
    let needAdd1 = false;
    if (Number.parseInt(bayId) % 12 === 2 || Number.parseInt(bayId) === 2) needAdd1 = true; // 粗放规则
    if (FORCE_VISIABLE[block_deviceAlias]) {
      if (Number.parseInt(bayId) > FORCE_VISIABLE[block_deviceAlias][0]) {
        if (Number.parseInt(bayId) < FORCE_VISIABLE[block_deviceAlias][1]) {
          if (Number.parseInt(bayId) % 6 === 2) {
            needAdd1 = true;
          }
        }
      }
    }
    if (needAdd1) {
      yardBayIdPartLayer_source.addFeature(feature);
    }
  };

  BlockMap.forEach((blockItem: MapTypeV<typeof BlockMap>) => {
    let index = 0;
    let total = blockItem.bayMap.size;
    blockItem.bayMap.forEach((bayItem: MapTypeV<typeof BayMap>) => {
      index++;
      const duplicated = bayItem.duplicated;

      if (index >= total - 1) index = total; // 做一点放大匹配
      if (duplicated) return;
      createBayIdFeature(bayItem, index, total);
    });
  });
};
