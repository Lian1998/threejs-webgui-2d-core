<template>
  <div id="gui-container">
    <!-- 大屏遮罩 -->
    <div id="gui-mask" />
    <div id="gui-viewport" />
    <div id="gui-spy" />

    <InfoCard ref="historyReplayInfoCardRef" :instanceComponent="HistoryReplaypage" :instanceTitle="'历史回放'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { onUnmounted } from "vue";

import InfoCard from "./InfoCards/_InfoCard/index.vue";
import InfoCardHover from "./InfoCards_hover/_InfoCard/index.vue";

import { DOMElements } from "./index";
import { historyReplayInfoCardRef } from "./index";
import HistoryReplaypage from "@source/onMap/Header/HistoryReplay/page/index.vue";

import { initializationInMapPart } from "@source/inMap/index";
const _onMounted = () => {
  const viewportEL = document.getElementById("gui-viewport");
  const spyEl1 = document.getElementById("gui-spy");
  DOMElements.viewportEL = viewportEL;
  DOMElements.spyEl1 = spyEl1;

  const container = document.getElementById("gui-container");
  const mask = document.getElementById("gui-mask");
  const header = document.getElementById("gui-header");
  const footer = document.getElementById("gui-footer");
  const siderLeft = document.getElementById("gui-sider-left");
  const siderRight = document.getElementById("gui-sider-right");
  const layerControls = document.getElementById("gui-layer-controls");
  const functionalcontrols = document.getElementById("gui-functional-controls");
  const statusTables = document.getElementById("gui-status-tables");

  DOMElements.container = container;
  DOMElements.mask = mask;
  DOMElements.header = header;
  DOMElements.footer = footer;
  DOMElements.siderLeft = siderLeft;
  DOMElements.siderRight = siderRight;
  DOMElements.layerControls = layerControls;
  DOMElements.functionalcontrols = functionalcontrols;
  DOMElements.statusTables = statusTables;

  initializationInMapPart(viewportEL as HTMLDivElement, spyEl1 as HTMLDivElement); // 初始化 openlayers
};

import { socketioMainModule } from "@source/data/initWebSocketData";
const _onUnmounted = () => {
  socketioMainModule.disconnect();
  socketioMainModule.dispose();
};

onMounted(_onMounted);
onUnmounted(_onUnmounted);
</script>
