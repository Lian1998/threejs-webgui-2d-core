<template>
  <a-config-provider :theme="{ algorithm: theme.defaultAlgorithm }" :component-size="'small'" :locale="zhCN">
    <div id="gui-container">
      <!-- 遮罩 -->
      <div id="gui-mask" />

      <!-- 视口 -->
      <div id="gui-viewport" />

      <InfoCard ref="historyReplayInfoCardRef" :min-width="1000" :instanceComponent="HistoryReplay" :instanceTitle="'历史回放'" :dragable="false" :resizable="false" />

      <div id="gui-footer-position" />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import "./index.scss";

import { theme } from "ant-design-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";

// 将 Ant-Design-Vue 计算的颜色变量注入到RootCss
import { injectRootCssVars } from "@/themes/injectRootCss";
import { getAntDesignVueCurrentToken } from "@/themes/getAntDesignVueThemeToken";
injectRootCssVars("ant-design-vue-theme-token", getAntDesignVueCurrentToken());

import { DOMElements } from "./index";
import { onMounted, onUnmounted } from "vue";
import { listen } from "@/inMap/utils/coordinatePointer";
import { coordinateTrans } from "@/inMap/utils/coordinateTrans";
import { ViewportResizeDispatcher } from "@core/legacy/index";
const _onMounted = () => {
  const containerEl = document.getElementById("gui-container");
  const viewportEl = document.getElementById("gui-viewport");
  const maskEl = document.getElementById("gui-mask");

  DOMElements.containerEl = containerEl;
  DOMElements.viewportEl = viewportEl;
  DOMElements.maskEl = maskEl;

  import("@/inMap/index").then(({ init }) => {
    init().finally(() => {
      // 演示项目自动打开历史回放
      historyReplayInfoCardRef.value.openInfoCard();

      const positionEl = document.querySelector("#gui-footer-position");
      const canvas = viewportEl.querySelector("canvas");
      const { camera, renderer } = ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>(0);
      canvas.addEventListener("pointermove", (e) => {
        const { x, z } = listen(e, camera, renderer);
        const [x1, z1] = coordinateTrans(x, z);
        positionEl.innerHTML = `EPSG:3857 ${x.toFixed(1)},${z.toFixed(1)}, Logic ${x1.toFixed(1)}, ${z1.toFixed(1)}`;
      });
    });
  });
};

// 卡片
import InfoCard from "./InfoCards/_InfoCard/index";
import { historyReplayInfoCardRef } from "./index";
import HistoryReplay from "@/onMap/InfoCards/HistoryReplay/page/index.vue";

// 悬窗
import InfoCardHover from "./InfoCards_hover/_InfoCard/index";

// 数据订阅
import { socketioMainModule } from "@/data/initWebSocketData";
const _onUnmounted = () => {
  socketioMainModule.disconnect();
  socketioMainModule.dispose();
};

onMounted(_onMounted);
onUnmounted(_onUnmounted);
</script>
