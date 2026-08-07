import { map } from "@2dmapv2/inMap";
import { reactive } from "vue";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

export const btnController1 = reactive({ classList: [], disabled: false }); // IGV标签
export const btnController2 = reactive({ classList: ["active"], disabled: false }); // IGV路径
export const btnController3 = reactive({ classList: [], disabled: false }); // 基站信号
export const btnController4 = reactive({ classList: [], disabled: false }); // 突出禁行区
export const btnController5 = reactive({ classList: ["active"], disabled: false }); // 岸桥循环方向
export const btnController6 = reactive({ classList: [], disabled: false }); // 预设禁行区
// prettier-ignore
export const btnControllers = [btnController1, btnController2, btnController3, btnController4, btnController5, btnController6];

/** igv标签 */
export const click1 = async (currentStatus: boolean): Promise<any> => {
  const targetLayer = map.getAllLayers().find((layer) => layer.get("layername") === "igvLayer");
  if (targetLayer) {
    if (currentStatus) targetLayer.set("uiVisible_igvLabels", false);
    else targetLayer.set("uiVisible_igvLabels", true);
  }
  return Promise.resolve();
};

/** IGV路径 */
export const click2 = async (currentStatus: boolean): Promise<any> => {
  const igvLayer = map.getAllLayers().find((layer) => layer.get("layername") === "igvLayer");
  if (igvLayer) {
    if (currentStatus) igvLayer.set("uiVisible_igvTracks", false);
    else igvLayer.set("uiVisible_igvTracks", true);
  }
  return Promise.resolve();
};

/** 基站信号范围 */
export const click3 = async (currentStatus: boolean): Promise<any> => {
  const targetLayer = map.getAllLayers().find((layer) => layer.get("layername") === "signalRangeLayer");
  if (targetLayer) {
    if (currentStatus) targetLayer.setVisible(false);
    else targetLayer.setVisible(true);
  }
  return Promise.resolve();
};

/** 禁行区 */
export const click4 = async (currentStatus: boolean): Promise<any> => {
  const igvBlockLayer = map.getAllLayers().find((layer) => layer.get("layername") === "igvBlockLayer");
  if (igvBlockLayer) {
    if (currentStatus) igvBlockLayer.setVisible(false);
    else igvBlockLayer.setVisible(true);
  }
  Promise.resolve();
};

/** 岸桥循环方向 */
export const click5 = async (currentStatus: boolean): Promise<any> => {
  const targetLayer = map.getAllLayers().find((layer) => layer.get("layername") === "qcCycleInfoLayer");
  if (targetLayer) {
    if (currentStatus) targetLayer.setVisible(false);
    else targetLayer.setVisible(true);
  }
  return Promise.resolve();
};

// prettier-ignore
const statusEvents = [click1, click2, click3, click4, click5] as any as (currentStatus: boolean) => Promise<boolean> | Promise<undefined>[];

/**
 * 使用代码触发事件
 * @param btnController 当前按钮对应的类表
 * @param statusEvent 当前按钮对应的触发事件
 * @param targetStatus 目标状态
 */
const setStatus = async (btnController: typeof btnController1, statusEvent: (currentStatus: boolean) => Promise<boolean> | Promise<undefined>, targetStatus: boolean) => {
  const isBlocked = await statusEvent(targetStatus); // undefined || false
  if (isBlocked) return;
  if (targetStatus && !btnController.classList.includes("active")) btnController.classList.push("active");
  else if (!targetStatus && btnController.classList.includes("active")) {
    const activeIndex = btnController.classList.findIndex((item) => item === "active");
    btnController.classList.splice(activeIndex, 1);
  }
};

/**
 * 点击按钮触发事件, 事件运行完毕后更新按钮状态
 * @param e
 * @param index 当前点击按钮的索引
 */
export const subbuttonClicked = (e: MouseEvent, index: number) => {
  const btnController = btnControllers[index];
  if (btnController.disabled) return;
  const statusEvent = statusEvents[index]; // 按钮事件
  let currentStatus = false; // 按钮当前的状态
  if (btnController.classList.includes("active")) currentStatus = true;
  setStatus(btnController, statusEvent, !currentStatus);
};
