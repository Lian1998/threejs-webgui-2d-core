import { igvLayer } from "@2dmapv2/inMap";
import { qcLayer } from "@2dmapv2/inMap";
import { ycLayer } from "@2dmapv2/inMap";

import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";

/**
 * 根据设备id, 找到该设备id所在的VectorLayer
 * @param id 设备ID
 * @returns layer: 对应的VectorLayer; foundFeature: 对应的Feature对象; recommendZoomLevel: 推荐的聚焦缩放比例
 */
export const getLayerAndFeatureByDeviceID = (id: string): { layer: InstanceType<typeof VectorLayer>; foundFeature: Feature; recommendZoomLevel: number } => {
  const deviceID = id;

  let layer = undefined;
  let foundFeature = undefined;
  let recommendZoomLevel = 19;
  if (deviceID.startsWith("T2")) {
    layer = igvLayer;
    foundFeature = layer.getSource().getFeatureById(deviceID);
    recommendZoomLevel = 20;
  }
  //
  else if (deviceID.startsWith("T")) {
    layer = igvLayer;
    foundFeature = layer.getSource().getFeatureById(deviceID);
    recommendZoomLevel = 20;
  }
  //
  else if (deviceID.startsWith("DC")) {
    layer = qcLayer;
    foundFeature = layer.getSource().getFeatureById(deviceID);
  }
  //
  else if (deviceID.startsWith("R")) {
    layer = ycLayer;
    foundFeature = layer.getSource().getFeatureById(deviceID);
  }

  return { layer, foundFeature, recommendZoomLevel };
};

import { getColorString } from "@2dmapv2/classes/colorConfig";
import { getColorFill } from "@2dmapv2/classes/colorConfig";
import { getColorStroke } from "@2dmapv2/classes/colorConfig";
import Style from "ol/style/Style";
import { DEFAULT_COLOR } from "@2dmapv2/classes/colorConfig/inMapColorConfig";
import tinycolor from "tinycolor2";

const colorStringDarkenCache = {};

/**
 * 根据集装箱的moveKind设置集装箱Feature.Style的颜色
 * @param container_style
 * @param moveKind
 */
export const setStyleByMoveKind = (moveKind: string, style?: Style): { colorString: string; colorStringDarken: string } => {
  let colorString = DEFAULT_COLOR;

  switch (moveKind) {
    case "装船":
    case "LOAD": {
      colorString = getColorString("VARS.CONTAINER_STATUS.LOAD");
      break;
    }
    case "卸船":
    case "DSCH": {
      colorString = getColorString("VARS.CONTAINER_STATUS.DSCH");
      break;
    }
    case "移箱":
    case "YARD": {
      colorString = getColorString("VARS.CONTAINER_STATUS.YARD");
      break;
    }
    case "未知":
    case "UNKNOWN": {
      colorString = getColorString("VARS.CONTAINER_STATUS.UNKNOWN");
      break;
    }
    case "提箱":
    case "DLVR": {
      colorString = getColorString("VARS.CONTAINER_STATUS.DLVR");
      break;
    }
    case "收箱":
    case "RECV": {
      colorString = getColorString("VARS.CONTAINER_STATUS.RECV");
      break;
    }
    default: {
      colorString = getColorString("VARS.CONTAINER_STATUS.UNKNOWN"); // 未知
      break;
    }
  }
  if (!colorStringDarkenCache[colorString]) {
    const colorObject = tinycolor(colorString);
    let colorStringDarken = "#000000FF"; // 默认黑色
    // 如果背景太黑直接给白色 否则比背景加深
    if (colorObject.isDark()) colorStringDarken = "#FFFFFFFF";
    else colorStringDarken = colorObject.darken(30).toString();
    colorStringDarkenCache[colorString] = colorStringDarken;
  }

  const colorStringDarken = colorStringDarkenCache[colorString];
  if (style) {
    style.setFill(getColorFill(colorString, false));
    style.setStroke(getColorStroke(colorStringDarken, false));
  }

  return { colorString, colorStringDarken };
};

/** 判断是否为IGV */
export const isIGVId = (deviceAlias: string) => {
  return deviceAlias.startsWith("T0") || deviceAlias === "T100";
};
