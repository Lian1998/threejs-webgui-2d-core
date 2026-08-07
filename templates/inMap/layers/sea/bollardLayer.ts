import { bollardLayer, bollardEvenLayer } from "@2dmapv2/inMap/";
import { resizeFactor } from "@2dmapv2/inMap/";
import { BollardMap } from "@2dmapv2/data/";

import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Stroke from "ol/style/Stroke";

import { getColorFill, getColorString } from "@2dmapv2/classes/colorConfig";

export const initLayer = () => {
  const bollardIdLayer_source = bollardLayer.getSource();
  const bollardIdEvenLayer_source = bollardEvenLayer.getSource();

  let visiable = false;
  let visiableEven = false;
  bollardLayer.set("resizeable", true);
  bollardLayer.set("resize", () => {
    visiable = false;
    visiableEven = false;
    if (resizeFactor.value >= 1.0) {
      visiable = false;
      visiableEven = true;
    }
    if (resizeFactor.value >= 2.0) {
      visiable = true;
      visiableEven = false;
    }
    bollardLayer.setVisible(visiable);
    bollardEvenLayer.setVisible(visiableEven);

    if (visiable) {
      const featureList = bollardIdLayer_source.getFeatures();
      for (let i = 0; i < featureList.length; i++) {
        const feature = featureList[i] as Feature<Point>;
        const text = (feature.getStyle() as Style).getText();
        text.setScale(0.6 * resizeFactor.value);
        text.setOffsetY(8 * resizeFactor.value);
        feature.changed();
      }
    }
    if (visiableEven) {
      const featureList = bollardIdEvenLayer_source.getFeatures();
      for (let i = 0; i < featureList.length; i++) {
        const feature = featureList[i] as Feature<Point>;
        const text = (feature.getStyle() as Style).getText();
        text.setScale(0.6 * resizeFactor.value);
        text.setOffsetY(8 * resizeFactor.value);
        feature.changed();
      }
    }

    return true;
  });
  bollardLayer.get("resize")();

  const baiscX = 484871.47432564414;
  BollardMap.forEach((value: MapTypeV<typeof BollardMap>, key) => {
    const item = value.information as {
      id: number; // 1;
      berth: string; // "6#泊位";
      site_no: string; // "00";
      system_no: string; // "LZ01";
      meter: number; // 6;
      remark: string; // "双小车岸桥";
    };
    const id = item.system_no.slice(2);
    const x = baiscX + item.meter;
    const y = 2493686.504256872;

    let isEven = false;
    const parsed = Number.parseInt(id);
    isEven = !Boolean(parsed % 2);

    const point_origin = [x, y]; // 实际位置
    const point_tail = [x, y - 1.0]; // 线段点
    const line = new LineString([point_origin, point_tail]);
    const feature = new Feature();
    feature.setGeometry(line);
    const style = new Style();
    const text = new Text({
      text: id,
      scale: 0.6,
      font: "12px sans-serif", // 字体大小
      textAlign: "center",
      offsetY: 8,
      fill: getColorFill("ANNOTATION"),
    });
    style.setText(text);
    style.setStroke(new Stroke({ color: getColorString("ANNOTATION") }));
    feature.setStyle(style);
    feature.setId(id);

    bollardIdLayer_source.addFeature(feature);
    if (isEven) bollardIdEvenLayer_source.addFeature(feature);
  });
};
