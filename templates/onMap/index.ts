import { ref } from "vue";

export const DOMElements: { [key: string]: HTMLElement } = {
  viewportEL: undefined,
  spyEl1: undefined,

  container: undefined,
  mask: undefined,
  modeSwitch: undefined,
  header: undefined,
  siderLeft: undefined,
  siderRight: undefined,
  layerControls: undefined,
  functionalcontrols: undefined,
  statusTables: undefined,
  footer: undefined,
};

export const onModelSwitchChange = (value: boolean) => {
  // Overview
  if (value === true) {
    DOMElements.container.setAttribute("mode", "0");
  }
  // Datascreen
  else if (value === false) {
    DOMElements.container.setAttribute("mode", "1");
  }
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

// 悬浮窗
export const containerInfoCardHoverRef = ref<InfoCardReference>(null);
export const vesselInfoCardHoverRef = ref<InfoCardReference>(null);

// 表格
export const rechTableRef = ref<InfoCardReference>(null);
export const qctpTableRef = ref<InfoCardReference>(null);
export const blocksTableRef = ref<InfoCardReference>(null);
export const igvTableRef = ref<InfoCardReference>(null);
export const qcTableRef = ref<InfoCardReference>(null);
export const wiTableRef = ref<InfoCardReference>(null);
export const doorcontrolTableRef = ref<InfoCardReference>(null);
export const deviceExceptionsRef = ref<InfoCardReference>(null);

// 控制
export const tosInfoCardRef = ref<InfoCardReference>(null);

// 颜色配置
export const colorConfigurationRef = ref<InfoCardReference>(null);
