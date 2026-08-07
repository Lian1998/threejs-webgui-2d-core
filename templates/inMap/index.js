import Map from "ol/Map";
import { socketioMainModule } from "@2dmapv2/data/index";
import { initRestfulData } from "@2dmapv2/data/index";
import { initWebSocketData } from "@2dmapv2/data/index";
import { createVectorLayer } from "./openlayerUtils";
import { initSelectPipeLine } from "./listeners/selectPipeLine";
import { initResolutionListener } from "./listeners/resolutionListener";
import { viewport } from "./viewport_projection";
import { getMapVLayers } from "./layers/bakeMapLayer";

///////////////////////////////////////////////////////////////
//
// 注意: Openlayers图层影响选拾取API的拾取顺序
// 添加图层时注意其顺序
//
///////////////////////////////////////////////////////////////

export let map;
export const resizeFactor = { value: 1.0 };
export let view = viewport;
export let selectPipeLine;

export let vesselLayer = createVectorLayer("vesselLayer");
export let bollardLayer = createVectorLayer("bollardLayer");
export let bollardEvenLayer = createVectorLayer("bollardEvenLayer");

export let igvLockAreaLayer = createVectorLayer("igvLockAreaLayer"); // IGV锁闭区
export let igvRouteLayer = createVectorLayer("igvRouteLayer"); // IGV轨迹线
export let igvBlockLayer = createVectorLayer("igvBlockLayer"); // IGV禁行区
export let igvBlockLayer9 = createVectorLayer("igvBlockLayer9"); // IGV禁行区(由预定义禁行区生成 即 type为9的igv禁行区)
export let igvLayer = createVectorLayer("igvLayer"); // IGV
export let igvIdLayer = createVectorLayer("igvIdLayer"); // IGVId
export let igvInventoryLayer = createVectorLayer("igvInventoryLayer"); // IGV集装箱
export let igvInfoLayer = createVectorLayer("igvInfoLayer"); // IGV集装箱
export let igvPredefineBlockLayer = createVectorLayer("igvPredefineBlockLayer"); // IGV禁行区(由预览禁行区生成预览)

export let qcLayer = createVectorLayer("qcLayer");
export let qcTrolleyLayer = createVectorLayer("qcTrolleyLayer");
export let qcInventoryLayer = createVectorLayer("qcInventoryLayer");

export let ycLayer = createVectorLayer("ycLayer");
export let ycTrolleyLayer = createVectorLayer("ycTrolleyLayer");
export let ycInventoryLayer = createVectorLayer("ycInventoryLayer");

export let yardIdLayer = createVectorLayer("yardIdLayer");
export let yardBayIdLayer = createVectorLayer("yardBayIdLayer");
export let yardBayIdPartLayer = createVectorLayer("yardBayIdPartLayer");
export let yardLaneIdLayer = createVectorLayer("yardLaneIdLayer");
export let yardLaneIdPartLayer = createVectorLayer("yardLaneIdPartLayer");

export let yardContainersLayer = createVectorLayer("yardContainersLayer");

// 海 与 基础图层
export let quayLayer = createVectorLayer("quayLayer");

// prettier-ignore
const layerSequence = [
  quayLayer, 

  vesselLayer,
  bollardLayer,
  bollardEvenLayer,

  igvLockAreaLayer, 
  igvRouteLayer, 
  igvBlockLayer, 
  igvLayer, 
  igvInventoryLayer,
  igvInfoLayer,

  qcLayer,
  qcTrolleyLayer,
  qcInventoryLayer,

  yardContainersLayer,
  yardIdLayer,
  ycLayer,
  ycTrolleyLayer,
  ycInventoryLayer,

  yardBayIdLayer,
  yardBayIdPartLayer,
  yardLaneIdLayer,
  yardLaneIdPartLayer,

  igvIdLayer,
];

/**
 * 初始化Openlayers地图
 * @param {*} domElement 挂载到dom对象
 * @returns
 */
export const initializationOpenLayers = async (domElement) => {
  const mapvLayers = getMapVLayers();
  layerSequence.splice(1, 0, ...mapvLayers);

  map = new Map({
    layers: layerSequence, // 设置地图图层
    view: view,
    target: domElement,
  });

  // 添加通用性监听管线
  initResolutionListener(map); // 初始化分辨率变化监听管线
  selectPipeLine = initSelectPipeLine(map); // 初始化选择监听管线 (移入, 移出, 选择, 取消选择, 双击);

  await import("./layers/sea/quayLayer").then((module) => module.initLayer()); // 岸描边

  Promise.allSettled([
    // Restful初始化数据完成时触发此函数加载图层和功能
    initRestfulData().then(() => {
      import("./layers/sea/bollardLayer").then((module) => module.initLayer()); // 揽桩号
      import("./layers/sea/vesselLayer").then((module) => module.initLayer()); // 船
      import("./layers/yard/yardIdLayer").then((module) => module.initLayer()); // 堆场编号
      import("./layers/yard/yardBayIdLayer").then((module) => module.initLayer()); // 贝编号
      import("./layers/yard/yardLaneIdLayer").then((module) => module.initLayer()); // 列编号
      import("./layers/yard/yardContainersLayer").then((module) => module.initLayer()); // 集装箱

      import("./layers/igv/igvLayers").then((module) => module.initLayer());
      import("./layers/truck/truckLayers").then((module) => module.initLayer());
      import("./layers/qc/qcLayers").then((module) => module.initLayer());
      import("./layers/yc/ycLayers").then((module) => module.initLayer());
    }),

    // WebSocket初始化数据完成时触发此函数加载图层和功能
    initWebSocketData().then(async () => {}),
  ]).finally(() => {});

  return Promise.resolve({ map, selectPipeLine });
};

export const disposeOpenlayers = () => {
  // 清空所有的Feature
  try {
    const layers = map.getLayers();
    layers.forEach((item) => {
      try {
        const layer_source = item.getSource();
        layer_source.clear(true);
      } catch (err) {}
    });
  } catch (err) {}

  // 注销Map对象
  map.getLayers().clear(); // 清空图层
  map.getOverlays().clear(); // 清空 Overlays
  map.getControls().clear(); // 清空 Controls
  map.setTarget(null); // 解除 DOM 绑定
  map = undefined; // 清空指针
};
