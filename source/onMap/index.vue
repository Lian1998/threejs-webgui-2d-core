<template>
  <a-config-provider :theme="{ algorithm: theme.defaultAlgorithm }">
    <div id="gui-container">
      <!-- 遮罩 -->
      <div id="gui-mask" />

      <!-- 视口 -->
      <div id="gui-viewport" />

      <InfoCard ref="historyReplayInfoCardRef" :instanceComponent="HistoryReplaypage" :instanceTitle="'历史回放'" />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import "./index.scss";

/////////////////////////////////// 将 Ant-Design-Vue 计算的颜色变量注入到RootCss ///////////////////////////////////
import { theme } from "ant-design-vue";
const { useToken } = theme;
const { token } = useToken();
const injectAntdCssVars = (token: Record<string, any>) => {
  const styleEl = document.createElement("style");
  styleEl.setAttribute("theme-onmap-vars", "true");
  let cssText = ":root {";
  Object.entries(token).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      cssText += `--ant-${kebabCase(key)}: ${String(value)};`;
    }
  });
  cssText += "}";
  styleEl.innerHTML = cssText;
  document.head.appendChild(styleEl);
};
const kebabCase = (str: string) => {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
};
injectAntdCssVars(token.value);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { DOMElements } from "./index";
import { historyReplayInfoCardRef } from "./index";

import InfoCard from "./InfoCards/_InfoCard/index.vue";
import InfoCardHover from "./InfoCards_hover/_InfoCard/index.vue";
import HistoryReplaypage from "@source/onMap/Header/HistoryReplay/page/index.vue";

import { onMounted } from "vue";
import { onUnmounted } from "vue";
import { initializationInMapPart } from "@source/inMap/index";
const _onMounted = () => {
  const containerEl = document.getElementById("gui-container");
  const viewportEl = document.getElementById("gui-viewport");
  const maskEl = document.getElementById("gui-mask");

  DOMElements.containerEl = containerEl;
  DOMElements.viewportEl = viewportEl;
  DOMElements.maskEl = maskEl;

  const spyEl = document.createElement("div");
  spyEl.style.position = "absolute";
  spyEl.style.left = "0";
  spyEl.style.bottom = "0";
  DOMElements.spyEl = spyEl;

  initializationInMapPart(viewportEl as HTMLDivElement, spyEl as HTMLDivElement); // 初始化 openlayers

  historyReplayInfoCardRef.value.openInfoCard();
};

import { socketioMainModule } from "@source/data/initWebSocketData";
const _onUnmounted = () => {
  socketioMainModule.disconnect();
  socketioMainModule.dispose();
};

onMounted(_onMounted);
onUnmounted(_onUnmounted);
</script>
