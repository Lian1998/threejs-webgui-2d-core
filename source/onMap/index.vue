<template>
  <a-config-provider :theme="{ algorithm: theme.defaultAlgorithm }" :component-size="'small'" :locale="zhCN">
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
import { theme } from "ant-design-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");

/////////////////////////////////// 将 Ant-Design-Vue 计算的颜色变量注入到RootCss ///////////////////////////////////
import { injectRootCssVars } from "@source/themes/injectRootCss";
import { getAntDesignVueCurrentToken } from "@source/themes/getAntDesignVueThemeToken";
injectRootCssVars("ant-design-vue-theme-token", getAntDesignVueCurrentToken());

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { DOMElements } from "./index";
import { historyReplayInfoCardRef } from "./index";

import InfoCard from "./InfoCards/_InfoCard/index.vue";
import InfoCardHover from "./InfoCards_hover/_InfoCard/index.vue";
import HistoryReplaypage from "@source/onMap/InfoCards/HistoryReplay/page/index.vue";

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
