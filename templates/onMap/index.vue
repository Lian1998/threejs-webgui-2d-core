<template>
  <div id="gui-container" mode="0">
    <div id="gui-mask"></div>

    <div id="gui-background"></div>

    <!-- 装载cavas -->
    <div id="gui-viewport"></div>

    <!-- 大屏切换控件 -->
    <!-- 
    <div id="gui-mode-switch">
      <a-switch v-model:checked="modeSwitch" checked-children="Over View" un-checked-children="Data Screen" @change="onModelSwitchChange" />
    </div>
     -->

    <!-- Mode1 -->
    <Header id="gui-header" />
    <Footer id="gui-footer" />
    <!-- <LayerControls id="gui-layer-controls" /> -->
    <!-- <FunctionalControls id="gui-functional-controls" /> -->
    <!-- <StatusTables id="gui-status-tables" /> -->

    <!-- Mode2 左右数据屏 -->
    <SiderLeft id="gui-sider-left" />
    <SiderRight id="gui-sider-right" />

    <!-- 弹窗 -->

    <!-- prettier-ignore -->
    <InfoCard ref="colorConfigurationRef" :instanceComponent="ColorConfigPage" :instanceTitle="'客户端颜色配置'" />

    <!-- prettier-ignore -->
    <InfoCard ref="qcInfoCardRef" :instanceCount="3" :instanceComponent="QCInfoCard" :instanceTitle="'QC详细信息'" />

    <!-- prettier-ignore -->
    <InfoCard ref="ycInfoCardRef" :instanceComponent="YCInfoCard" :instanceTitle="'YC详细信息'" />

    <!-- prettier-ignore -->
    <InfoCard ref="igvInfoCardRef" :instanceComponent="IGVInfoCard" :instanceTitle="'IGV详细信息'" />

    <!-- prettier-ignore -->
    <InfoCard ref="blockBayInfoCardRef" :instanceComponent="BlockBayInfoCard" :instanceTitle="'堆场贝侧视图'" />

    <!-- 悬浮窗 -->

    <!-- prettier-ignore -->
    <InfoCardHover ref="containerInfoCardHoverRef" :instanceComponent="ContainerInfoCard" :preWidth="200" :preHeight="150" />

    <!-- prettier-ignore -->
    <InfoCardHover ref="vesselInfoCardHoverRef" :instanceComponent="VesselInfoCard" :preWidth="280" :preHeight="430" />

    <!-- 表格 -->
  </div>
</template>

<script lang="ts" setup>
import "./index.scss";

import { ref } from "vue";
import { onMounted } from "vue";
import { onUnmounted } from "vue";

import { DOMElements } from "./index";
import { onModelSwitchChange } from "./index";

import { socketioMainModule } from "@2dmapv2/data/index";

// 元素弹窗
import { qcInfoCardRef } from "./index";
import QCInfoCard from "./InfoCards/QCInfoCard/";
import { ycInfoCardRef } from "./index";
import YCInfoCard from "./InfoCards/YCInfoCard/";
import { igvInfoCardRef } from "./index";
import IGVInfoCard from "./InfoCards/IGVInfoCard/";
import { blockBayInfoCardRef } from "./index";
import BlockBayInfoCard from "./InfoCards/BlockBayInfoCard/index.vue";

// 悬浮窗
import { containerInfoCardHoverRef } from "./index";
import ContainerInfoCard from "./InfoCards_hover/ContainerInfoCard/index.vue";
import { vesselInfoCardHoverRef } from "./index";
import VesselInfoCard from "./InfoCards_hover/VesselInfoCard/index.vue";

// 表格弹窗

// 其他
import { colorConfigurationRef } from "./index";
import ColorConfigPage from "./Header/ColorConfiguration/page/index.vue";

// 初始化图/管线
import { initializationOpenLayers } from "@2dmapv2/inMap/index";
import { disposeOpenlayers } from "@2dmapv2/inMap/index";
import { initMousePositionListener_EPSG3857_Logic } from "@2dmapv2/inMap/listeners/mousePositionListener";
import { initMousePositionListener_Logic } from "@2dmapv2/inMap/listeners/mousePositionListener";

// Layout
import Header from "./Header/index.vue";
import Footer from "./Footer/index.vue";
import LayerControls from "./LayerControls/index.vue";
import FunctionalControls from "./FunctionalControls/index.vue";
import StatusTables from "./StatusTables/index.vue";
import SiderLeft from "./SiderLeft/index.vue";
import SiderRight from "./SiderRight/index.vue";
import InfoCard from "./InfoCards/_InfoCard/index";
import InfoCardHover from "./InfoCards_hover/_InfoCard/index.vue";

const modeSwitch = ref<boolean>(true);

const _onMounted = () => {
  const viewportEL = document.getElementById("gui-viewport");
  const spyEl1 = document.getElementById("mouseposition-listen");
  DOMElements.viewportEL = viewportEL;
  DOMElements.spyEl1 = spyEl1;

  const container = document.getElementById("gui-container");
  const mask = document.getElementById("gui-mask");
  const modeSwitch = document.getElementById("gui-mode-switch");
  const header = document.getElementById("gui-header");
  const footer = document.getElementById("gui-footer");
  const siderLeft = document.getElementById("gui-sider-left");
  const siderRight = document.getElementById("gui-sider-right");
  const layerControls = document.getElementById("gui-layer-controls");
  const functionalcontrols = document.getElementById("gui-functional-controls");
  const statusTables = document.getElementById("gui-status-tables");

  DOMElements.container = container;
  DOMElements.mask = mask;
  DOMElements.modeSwitch = modeSwitch;
  DOMElements.header = header;
  DOMElements.footer = footer;
  DOMElements.siderLeft = siderLeft;
  DOMElements.siderRight = siderRight;
  DOMElements.layerControls = layerControls;
  DOMElements.functionalcontrols = functionalcontrols;
  DOMElements.statusTables = statusTables;

  socketioMainModule.connect(); // 开启socketIO助手连接
  initializationOpenLayers(viewportEL); // 初始化 openlayers

  // 初始化鼠标移动监控
  if (import.meta.env.MODE === "development") initMousePositionListener_EPSG3857_Logic(spyEl1);
  else initMousePositionListener_Logic(spyEl1);
};

const _onUnmounted = () => {
  socketioMainModule.disconnect();
  socketioMainModule.dispose();
  disposeOpenlayers();
};

onMounted(_onMounted);
onUnmounted(_onUnmounted);

// // 测试回收
// window.addEventListener("keydown", (e) => {
//   if (e.code === "KeyD") _onUnmounted();
//   else if (e.code === "KeyI") _onMounted();
// });
</script>
