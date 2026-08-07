<template>
  <div class="yc-info-card">
    <!-- 场桥状态图形化 -->
    <div class="graphic-card">
      <!-- 场桥SVG -->
      <div class="svg-window" ref="svgContainer">
        <SvgIcon class="svg-fullscreen" name="mapui-fullscreen" @click="toggleFullScreen" />
      </div>
      <div class="status-bar">
        <a-tooltip v-for="(item, index) in YCStatusLabels" :key="index">
          <template #title>{{ item.description }}</template>
          <template #default>
            <div class="image-status">
              <img :src="item.src" />
              <div class="image-status-tip-value" v-if="item.tipValue !== undefined">{{ item.tipValue }}</div>
            </div>
          </template>
        </a-tooltip>
      </div>
    </div>

    <!-- 场桥详细信息表格卡片 -->
    <div class="information-card">
      <!-- tabsLoading -->
      <a-tabs v-model:activeKey="activceTabKey" type="card" size="small">
        <a-tab-pane :key="1" tab="任务信息" :forceRender="true">
          <BaseInfoTable :list="infoList1" :widthCols="24" :lineHeight="34" :rowTitlewidth="150" />
        </a-tab-pane>
        <a-tab-pane :key="2" tab="设备信息" :forceRender="true">
          <BaseInfoTable :list="infoList2" :widthCols="24" :lineHeight="34" :rowTitlewidth="150" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";
import svgRawContent from "./svg/index.svg?raw";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { initializeSvgPack } from "./svg/index";
import { ref } from "vue";
import { onMounted } from "vue";

import infoList1Data from "./data/info1-任务信息.js";
import infoList2Data from "./data/info2-设备信息.js";
import BaseInfoTable from "../_BaseInfoTable/index";
import { YCStatusLabels } from "./data/YCStatusLabels";

import { socketioSubModule_infocard_yc as socketioHelper } from "@2dmapv2/data/initWebSocketData";
import { getAccValue } from "@2dmapv2/classes/DataHelper.js";
import { findBaseXItem } from "@2dmapv2/classes/DataHelper.js";
import { resetBaseInfoTable } from "@2dmapv2/classes/DataHelper.js";
import { resetBaseStatusLabel } from "@2dmapv2/classes/DataHelper.js";

defineExpose({
  onOpenInfoCard: (data: any) => {
    // 如果是重复打开窗口
    if (idRef.value === data) return;
    idRef.value = data;
    socketioHelper.dispose();
    initialization();
  },
  onCloseInfoCard: () => {
    idRef.value = undefined;
    socketioHelper.dispose();
  },
  setTitle: () => {
    return `YC详细信息 ${idRef.value}`;
  },
} as InfoCardDefaultSlot);

// --------------------------------------------------------------------------------
//
// Javascript指针(VueSFC域) | 常量 | 页面指针 | Layout
//
// --------------------------------------------------------------------------------
const idRef = ref("");
let svgContainer = ref<HTMLElement | null>(null);
let svgPack = undefined;
const activceTabKey = ref(1);
const infoList1 = ref<BaseInfoTableItem[]>([]);
const infoList2 = ref<BaseInfoTableItem[]>([]);
const toggleFullScreen = () => {
  if (!svgContainer.value) return;
  if (document.fullscreenElement === svgContainer.value) document.exitFullscreen();
  else svgContainer.value.requestFullscreen();
};

// --------------------------------------------------------------------------------
//
// 生命周期回调
//
// --------------------------------------------------------------------------------

const initialization = async () => {
  // 判断是否需要初始化svg图插件
  const domElement = svgContainer.value;
  if (!svgPack) {
    if (domElement) {
      svgPack = await initializeSvgPack(domElement, svgRawContent);
      svgPack.draw.viewbox(0, 0, 1700, 1200);
      svgPack.draw.attr({ style: "width: 100%; max-height: 100%;" });
    }
  }

  const id = idRef.value;
  if (svgPack.resetStatus) svgPack.resetStatus(id); // 复位svg
  resetBaseStatusLabel(YCStatusLabels.value); // 复位状态栏
  // 复位数据表格
  resetBaseInfoTable(infoList1.value);
  resetBaseInfoTable(infoList2.value);

  request_webscoket(); // 请求ws表格
};

onMounted(() => {
  infoList1.value.push(...infoList1Data());
  infoList2.value.push(...infoList2Data());
});

const request_webscoket = () => {
  const id = idRef.value;

  const subjections = [`DF.YC.${id}.ASCGantryCurPos`, `DF.YC.${id}.ASCTrolleyCurPos`, `DF.YC.${id}.ASCHoistCurPos`, `DF.YC.${id}.ASCSpreaderSizeStatus`, `DF.YC.${id}.ASCSpreaderTwistStatus`, `DF.YC.${id}.AscStatus`, `DF.YC.${id}.AscTaskInfo`];

  socketioHelper.registerListener<{
    cheId: "R601";
    operationStatus: "AUTOMATIC";
    workStatus: "IDLE";
    executionStatus: "WAIT";
    location: "YARD.61A.000.10.3";
    currentBay: "000";
  }>(`DF.YC.${id}.AscStatus`, (itemValue) => {
    // console.log(`DF.YC.${id}.AscStatus`, itemValue);
    infoList2.value.forEach((item) => {
      if (item.classify === "AscStatus") {
        item.value = getAccValue(itemValue, item.subject);
      }
    });
  });

  const 大车位置 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "大车位置(m)");
  socketioHelper.registerListener<{ value: 22000; code: "DC01" }>(`DF.YC.${id}.ASCGantryCurPos`, (itemValue) => {
    try {
      大车位置.value = itemValue.value / 1000.0;
    } catch (err) {}
  });
  const 小车位置 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "小车位置(m)");
  socketioHelper.registerListener<{ value: 22000; code: "DC01" }>(`DF.YC.${id}.ASCTrolleyCurPos`, (itemValue) => {
    小车位置.value = itemValue.value / 1000.0;
  });

  const 小车起升 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "小车起升(m)");
  socketioHelper.registerListener<{ value: 8000; code: "R629" }>(`DF.YC.${id}.ASCHoistCurPos`, (itemValue) => {
    小车起升.value = itemValue.value / 1000.0;
  });

  socketioHelper.registerListener<{
    cheId: "R602";
    orderId: "638862933203364875";
    commandId: "638862933203364875";
    orderStatus: "WORKING";
    commandStatus: "WORKING";
    update: "2025-06-23 09:53:31";
    containerWiRef: "5832698884867";
    moveKind: "LOAD";
    containerId: "HMMU6746770";
    destVehicleId: "D005";
    containerLength: "12192";
    originSlot: "YARD.61A.016.06.04";
    destinationSlot: "VESSEL.HMIR0014W.082.14.72";
    currentBay: "016";
    vehicleType: "IGV";
    vehicleId: "D005";
  }>(`DF.YC.${id}.AscTaskInfo`, (itemValue) => {
    // console.log(`DF.YC.${id}.AscTaskInfo`, itemValue);

    infoList1.value.forEach((item) => {
      if (item.classify === "AscTaskInfo") {
        item.value = getAccValue(itemValue, item.subject);
      }
    });
  });

  socketioHelper.subReal(undefined, ...subjections);
};
</script>
