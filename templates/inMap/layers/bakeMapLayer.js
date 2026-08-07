import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";

import Layer from "ol/layer/Layer";
import WebGLVectorLayerRenderer from "ol/renderer/webgl/VectorLayer.js";

const defaultOptions = {
  properties: { name: "baseLayer" },
  disableHitDetection: true,
  style: {
    "stroke-color": [185, 185, 185],
    "stroke-width": 1,
  },
};

class WebGLLayer extends Layer {
  constructor(layername, options, cOptions, initialization) {
    super(options);

    this.layername = layername;
    this.cOptions = cOptions;

    this.set("layername", layername);
    if (initialization) initialization(this);
  }

  createRenderer() {
    return new WebGLVectorLayerRenderer(this, Object.assign(defaultOptions, this.cOptions));
  }
}

import tinycolor from "tinycolor2";
import { resizeFactor } from "@2dmapv2/inMap/";
import { getColorString } from "@2dmapv2/classes/colorConfig/index";

export const getMapVLayers = () => {
  const quayTinyColorObject = tinycolor(getColorString("QUAY"));
  const isDark = quayTinyColorObject.isDark(); // 是否是深色系

  /** 层初始化函数 */
  const initialization = (scope) => {
    const layername = scope.layername; // 当前层名

    if (layername === "07_marks") {
      scope.set("resizeable", true);
      scope.set("resize", () => {
        if (resizeFactor.value < 1.75) scope.setVisible(false);
        else scope.setVisible(true);
        return true;
      });
    }

    // 是否是深色系
    if (isDark) {
      try {
        const quayRgbObject = quayTinyColorObject.toRgb();
        const stroke_color = scope.cOptions.style["stroke-color"];
        // 白底黑线 转化成 黑底白线
        scope.cOptions.style["stroke-color"] = [((255 - stroke_color[0]) * (255 - quayRgbObject.r)) / 255 + quayRgbObject.r, ((255 - stroke_color[1]) * (255 - quayRgbObject.g)) / 255 + quayRgbObject.g, ((255 - stroke_color[2]) * (255 - quayRgbObject.b)) / 255 + quayRgbObject.b];
      } catch (err) {}
    }

    // 将 GeoJSON 转化成 Openlayers Feature 并添加到 WebGLVectorLayerRenderer 中渲染
    fetch(`/bake/v3/${layername}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        return response.json();
      })
      .then((geojson) => {
        const features = new GeoJSON().readFeatures(geojson);
        scope.getSource().addFeatures(features);
        scope.changed();

        const resize = scope.get("resize");
        if (resize) resize();
      });
  };

  return [
    new WebGLLayer(
      "01_岸边和建筑",
      { source: new VectorSource() },
      {
        style: { "stroke-color": [195, 195, 195], "stroke-width": 1.0 },
      },
      initialization,
    ),
    new WebGLLayer(
      "02_轨道",
      { source: new VectorSource() },
      {
        style: { "stroke-color": [195, 195, 195], "stroke-width": 0.5 },
      },
      initialization,
    ),
    new WebGLLayer(
      "05_道路边线",
      { source: new VectorSource() },
      {
        style: { "stroke-color": [125, 125, 125], "stroke-width": 2.0 },
      },
      initialization,
    ),
    new WebGLLayer("05_道路虚线", { source: new VectorSource() }, { style: { "stroke-color": [0, 0, 0], "stroke-width": 0.5, "stroke-line-dash": [15, 10] } }, initialization),
    new WebGLLayer(
      "05_道路实线",
      { source: new VectorSource() },
      {
        style: { "stroke-color": [0, 0, 0], "stroke-width": 1.5 },
      },
      initialization,
    ),
    new WebGLLayer("07_地面标志", { source: new VectorSource() }, { style: { "stroke-color": [200, 200, 200], "stroke-width": 0.5 } }, initialization),
  ];
};
