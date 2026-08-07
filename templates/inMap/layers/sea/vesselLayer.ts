import { vesselLayer } from "@2dmapv2/inMap/";
import { resizeFactor } from "@2dmapv2/inMap/";
import { getColorFill } from "@2dmapv2/classes/colorConfig";
import { calculateTargetBaseScale } from "@2dmapv2/inMap/openlayerUtils";
import { vesselInfoCardHoverRef } from "@2dmapv2/onMap/index";

import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import Point from "ol/geom/Point";
import Icon from "ol/style/Icon";

import { BollardMap, socketioSubModule_map as socketioHelper } from "@2dmapv2/data/";

const VESSEL_TEXT_INIT_SCALE = 1.0;
const defaultText = getColorFill("LABEL.VESSEL.DEFAULT.TEXT");
const defaultTextBackground = getColorFill("LABEL.VESSEL.DEFAULT.TEXT_BACKGROUND");
const selectedText = getColorFill("LABEL.VESSEL.SELECTED.TEXT");
const selectedTextBackground = getColorFill("LABEL.VESSEL.SELECTED.TEXT_BACKGROUND");

export const initLayer = () => {
  // @ts-ignore
  vesselLayer.renderBuffer_ = 2000;

  vesselLayer.set("selectable", true);
  vesselLayer.set("resizeable", true);

  const vesselLayer_source = vesselLayer.getSource();

  let selectedVessel = undefined;
  const createVesselFeature = (id: string, locationXY: Array2<number>, length: number, side: 1 | -1) => {
    const feature = new Feature({ geometry: new Point(locationXY) });
    feature.setId(id);
    const vesselScale = calculateTargetBaseScale(414, length) * side;
    const text = new Text({
      text: id,
      font: "16px sans-serif",
      padding: [10, 10, 10, 10],
      scale: VESSEL_TEXT_INIT_SCALE,
      fill: getColorFill("LABEL.VESSEL.DEFAULT.TEXT"),
      backgroundFill: getColorFill("LABEL.VESSEL.DEFAULT.TEXT_BACKGROUND"),
    });
    const icon = new Icon({
      anchor: [0.5, 0.5], //中心点向船头偏移
      scale: vesselScale,
      src: "/v2/inmap/Vessel.png",
    });
    const style = new Style();
    style.setImage(icon);
    style.setText(text);
    feature.setStyle(style);

    feature.set("resize", () => {
      icon.setScale(vesselScale * resizeFactor.value);
      text.setScale(VESSEL_TEXT_INIT_SCALE * resizeFactor.value);
      feature.changed();
    });

    feature.set("selected", () => {
      selectedVessel = id;
      text.setFill(selectedText);
      text.setBackgroundFill(selectedTextBackground);
      feature.changed();
    });

    feature.set("cancelSelected", () => {
      text.setFill(defaultText);
      text.setBackgroundFill(defaultTextBackground);
      selectedVessel = undefined;
      feature.changed();
    });

    feature.set("movein", () => {
      text.setFill(selectedText);
      text.setBackgroundFill(selectedTextBackground);
      feature.changed();

      const vesselInformation = vesselInformationMap.get(id);
      if (vesselInformation && vesselInfoCardHoverRef.value) {
        vesselInfoCardHoverRef.value.openInfoCard(vesselInformation);
      }
    });

    feature.set("moveout", () => {
      if (vesselInfoCardHoverRef.value) vesselInfoCardHoverRef.value.closeInfoCard();
      if (selectedVessel == id) return;
      text.setFill(defaultText);
      text.setBackgroundFill(defaultTextBackground);
      feature.changed();
    });
    vesselLayer_source.addFeature(feature);
  };

  // 这里要根据新点接船
  // createVesselFeature("船舶1", [485085.7620787343, 2493725.7014181647], 400, 1);
  // createVesselFeature("船舶2", [485585.5007032833, 2493725.7014181647], 400, 1);

  type VesselInformation = {
    vesselVisit: string; // "9AF618S";
    vesselCallSign: string; // "MAERSK STOCKHOLM";
    vesselCode: string; // "9AF";
    bowBollard: string; //  "LZ48";
    bowBollardOffsetCm: string; // "-200";
    sternBollard: string; // "LZ29";
    sternBollardOffsetCm: string; // "500";
    vesselClassification: string; // "CS";
    vesselVisitPhase: string; // "WORKING";
    berthingMode: string; // "R";
    discOperMode: string; // "BAYPLAN";
    loadOperMode: string; // "BAYPLAN";
    discWorkMode: string; // "POSITION";
    baySequenceMode: string; // "H";
    updated: string; // "2026-08-06T12:58:19.303532";
    berthingNo: string; // "07";
  };
  const vesselInformationMap = new Map<string, VesselInformation>();
  const baiscX = 484871.47432564414;

  // DF.OTHERS.ALL.VesselVisit
  socketioHelper.registerListener<
    {
      itemName: string; // "9AF618S";
      itemValue: MapTypeV<typeof vesselInformationMap>;
      operation: string; // "upsert";
    }[]
  >(`DF.OTHERS.ALL.VesselVisit`, (itemValue) => {
    for (let i = 0; i < itemValue.length; i++) {
      const element = itemValue[i];
      const itemName = element.itemName;
      if (element.operation === "delete") {
        const feature = vesselLayer_source.getFeatureById(itemName) as Feature<Point>;
        if (feature) vesselLayer_source.removeFeature(feature);
      } else {
        const feature = vesselLayer_source.getFeatureById(itemName) as Feature<Point>;
        if (!feature) {
          try {
            let side: 1 | -1 = 1;
            if (element.itemValue.berthingMode !== "R") side = -1;

            const startBollard = element.itemValue.bowBollard; // 船头
            const startOffset = Number.parseFloat(element.itemValue.bowBollardOffsetCm) / 100.0;
            const endBollard = element.itemValue.sternBollard; // 船尾
            const endOffset = Number.parseFloat(element.itemValue.sternBollardOffsetCm) / 100.0;

            const startBollardItem = BollardMap.get(startBollard);
            const endBoolardItem = BollardMap.get(endBollard);
            const m1 = startBollardItem.information.meter;
            const m2 = endBoolardItem.information.meter;
            const startPos = baiscX + startBollardItem.information.meter + startOffset;
            const endPos = baiscX + endBoolardItem.information.meter + endOffset;
            const length = Math.abs(startPos - endPos);
            const startPosLogic = Math.min(startPos, endPos);

            const locationXY = [startPosLogic + length / 2, 2493725.7014181647] as Array2<number>;
            createVesselFeature(itemName, locationXY, length, side);
          } catch (err) {}
        }

        vesselInformationMap.set(itemName, element.itemValue);
      }
    }
  });

  socketioHelper.subReal(undefined, `DF.OTHERS.ALL.VesselVisit`);
};
