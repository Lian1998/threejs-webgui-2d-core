import { ref } from "vue";

export const DOMElements: { [key: string]: HTMLElement } = {
  viewportEL: undefined,
  spyEl1: undefined,

  container: undefined,
  mask: undefined,
  header: undefined,
  siderLeft: undefined,
  siderRight: undefined,
  layerControls: undefined,
  functionalcontrols: undefined,
  statusTables: undefined,
  footer: undefined,
};

// 元素弹窗
export const igvInfoCardRef = ref<InfoCardReference>(null);
export const qcInfoCardRef = ref<InfoCardReference>(null);
export const ycInfoCardRef = ref<InfoCardReference>(null);
export const blockInfoCardRef = ref<InfoCardReference>(null);
export const blockInfoCardRef_yard = ref<InfoCardReference>(null);
export const blockDrawInfoCardRef = ref<InfoCardReference>(null);
export const blockDrawInfoCardRef_yard = ref<InfoCardReference>(null);
export const laneQCTPInfoCardRef = ref<InfoCardReference>(null);
export const laneRechInfoCardRef = ref<InfoCardReference>(null);
export const blockBayInfoCardRef = ref<InfoCardReference>(null);
export const historyReplayInfoCardRef = ref<InfoCardReference>(null);

// 悬浮窗
export const trafficLightInfoCardHoverRef = ref<InfoCardReference>(null);
export const containerInfoCardHoverRef = ref<InfoCardReference>(null);
export const igvBlockInfoCardHoverRef = ref<InfoCardReference>(null);

// 颜色配置
export const colorConfigurationRef = ref<InfoCardReference>(null); // 颜色配置
