import { ref } from "vue";

export const DOMElements: { [key: string]: HTMLElement } = {
  containerEl: undefined,
  viewportEl: undefined,
  maskEl: undefined,
  spyEl: undefined,
};

// 元素弹窗
export const historyReplayInfoCardRef = ref<InfoCardReference>(null); // 历史回放配置页面
export const colorConfigurationRef = ref<InfoCardReference>(null); // 颜色配置页面
