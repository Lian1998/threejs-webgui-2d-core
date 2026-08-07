import { yardIdLayer } from "@2dmapv2/inMap/";

import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Point from "ol/geom/Point";
import Text from "ol/style/Text";
import { BlockMap } from "@2dmapv2/data";
import { getColorFill } from "@2dmapv2/classes/colorConfig";

export const initLayer = () => {
  // @ts-ignore
  yardIdLayer.renderBuffer_ = 2000;

  const yardIdLayer_source = yardIdLayer.getSource();

  // 堆场号

  const createYardIdFeature = (x, y, yardId) => {
    // 文字1
    const feature = new Feature({ geometry: new Point([x, y]) });
    feature.setStyle(
      new Style({
        text: new Text({
          text: yardId,
          font: "22px bold sans-serif",
          fill: getColorFill("ANNOTATION"),
        }),
      }),
    );
    yardIdLayer_source.addFeature(feature);
  };

  BlockMap.forEach((item, key) => {
    try {
      const Xmax = item.positions[0];
      const Ymax = item.positions[1];
      const Xmin = item.positions[2];
      const Ymin = item.positions[3];
      const blockName = item.deviceAlias;

      // 中间
      const CENTER = [(Xmin + Xmax) / 2, (Ymax + Ymin) / 2];
      createYardIdFeature(CENTER[0], CENTER[1], blockName);

      // 右边
      // const CENTER = [Xmax, (Ymax + Ymin) / 2];
      // createYardIdFeature(CENTER[0], CENTER[1], blockName);

      // 2+3
      // if (Number.parseInt(blockName.slice(0, 2)) % 2 == 0) {
      //   const CENTER1 = [Xmax - ((Xmax - Xmin) / 4) * 1, (Ymax + Ymin) / 2];
      //   const CENTER2 = [Xmax - ((Xmax - Xmin) / 4) * 2, (Ymax + Ymin) / 2];
      //   const CENTER3 = [Xmax - ((Xmax - Xmin) / 4) * 3, (Ymax + Ymin) / 2];
      //   createYardIdFeature(CENTER1[0], CENTER1[1], blockName);
      //   createYardIdFeature(CENTER2[0], CENTER2[1], blockName);
      //   createYardIdFeature(CENTER3[0], CENTER3[1], blockName);
      // } else {
      //   const CENTER1 = [Xmax - ((Xmax - Xmin) / 3) * 1, (Ymax + Ymin) / 2];
      //   const CENTER2 = [Xmax - ((Xmax - Xmin) / 3) * 2, (Ymax + Ymin) / 2];
      //   createYardIdFeature(CENTER1[0], CENTER1[1], blockName);
      //   createYardIdFeature(CENTER2[0], CENTER2[1], blockName);
      // }
    } catch (error) {
      console.error(error);
    }
  });

  // 冷藏箱和危险箱

  const createYardTextFeature = (position, textContent) => {
    const feature = new Feature({ geometry: new Point(position) });
    feature.setStyle(
      new Style({
        text: new Text({
          text: textContent,
          font: "22px bold sans-serif",
          fill: getColorFill("#cccccc", false),
        }),
      }),
    );
    yardIdLayer_source.addFeature(feature);

    return feature;
  };

  createYardTextFeature([485428.0023479692, 2493407.068473278], "冷藏箱");
  createYardTextFeature([485422.37440667296, 2493351.0047140736], "冷藏箱");
  createYardTextFeature([485746.38268000947, 2493463.5340985684], "危险箱");
};
