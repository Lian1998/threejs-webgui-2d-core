<template>
  <a-config-provider :theme="{ algorithm: theme.defaultAlgorithm }" :component-size="'small'" :locale="zhCN">
    <div id="gui-container">
      <!-- 遮罩 -->
      <div id="gui-mask" />

      <!-- 视口 -->
      <div id="gui-viewport" />

      <InfoCard ref="historyReplayInfoCardRef" :instanceComponent="HistoryReplay" :instanceTitle="'历史回放'" />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import "./index.scss";

import { theme } from "ant-design-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";

// 将 Ant-Design-Vue 计算的颜色变量注入到RootCss
import { injectRootCssVars } from "@source/themes/injectRootCss";
import { getAntDesignVueCurrentToken } from "@source/themes/getAntDesignVueThemeToken";
injectRootCssVars("ant-design-vue-theme-token", getAntDesignVueCurrentToken());

import { DOMElements } from "./index";
import { onMounted } from "vue";
import { onUnmounted } from "vue";
const _onMounted = () => {
  const containerEl = document.getElementById("gui-container");
  const viewportEl = document.getElementById("gui-viewport");
  const maskEl = document.getElementById("gui-mask");

  DOMElements.containerEl = containerEl;
  DOMElements.viewportEl = viewportEl;
  DOMElements.maskEl = maskEl;

  import("@source/inMap/_index").then(({ init }) => {
    init().finally(() => {
      // 演示项目自动打开历史回放
      historyReplayInfoCardRef.value.openInfoCard();
    });
  });
};

// 卡片
import InfoCard from "./InfoCards/_InfoCard/index";
import { historyReplayInfoCardRef } from "./index";
import HistoryReplay from "@source/onMap/InfoCards/HistoryReplay/page/index.vue";

// 悬窗
import InfoCardHover from "./InfoCards_hover/_InfoCard/index";

// 数据订阅
import { socketioMainModule } from "@source/data/initWebSocketData";
const _onUnmounted = () => {
  socketioMainModule.disconnect();
  socketioMainModule.dispose();
};

onMounted(_onMounted);
onUnmounted(_onUnmounted);
</script>
