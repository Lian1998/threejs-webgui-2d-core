<template>
  <div class="igv-info-card">
    <!-- 小车SVG / 小车状态图标栏 -->
    <div class="graphic-card">
      <div class="svg-window" ref="svgContainer">
        <SvgIcon class="svg-fullscreen" name="mapui-fullscreen" @click="toggleFullScreen" />
      </div>
      <div class="status-bar">
        <a-tooltip v-for="(item, index) in IGVStatusLabels" :key="index">
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

    <!-- 小车详细信息表格卡片 -->
    <div class="information-card">
      <a-spin class="iic-spin" :spinning="tabsLoading">
        <a-tabs v-model:activeKey="activceTabKey" type="card" size="small">
          <a-tab-pane :key="1" tab="任务信息" :forceRender="true">
            <BaseInfoTable :rowTitlewidth="120" :list="infoList1" :widthCols="24" :lineHeight="34" />
          </a-tab-pane>
          <a-tab-pane :key="2" tab="设备信息" :forceRender="true">
            <BaseInfoTable :rowTitlewidth="120" :list="infoList2" :widthCols="24" :lineHeight="34" />
          </a-tab-pane>
          <a-tab-pane :key="3" tab="模式" :forceRender="true">
            <BaseInfoTable :rowTitlewidth="120" :list="infoList3" :widthCols="24" :lineHeight="34" />
          </a-tab-pane>
          <a-tab-pane :key="4" tab="操作" :forceRender="true">
            <SettingCard ref="settingCardRef" />
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";
import SettingCard from "./operations/SettingCard.vue";
import svgRawContent from "./svg/igv.svg?raw";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { initializeSvgPack } from "./svg/index";

import { ref } from "vue";
import { onMounted } from "vue";

import { IGVStatusLabels } from "./data/IGVStatusLabels";
import infoList1Data from "./data/info1-任务信息.js";
import infoList2Data from "./data/info2-设备信息.js";
import infoList3Data from "./data/info3-模式.js";

import BaseInfoTable from "../_BaseInfoTable/index";
import { tabsLoading } from "./index";
import { socketioSubModule_infocard_igv as socketioHelper } from "@2dmapv2/data/initWebSocketData";
import { findBaseXItem, getAccValue, resetBaseInfoTable, resetBaseStatusLabel, setBaseStatusLabelStatus } from "@2dmapv2/classes/DataHelper.js";
import dayjs from "dayjs";
import { cloneFnJSON } from "@vueuse/core";

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
    return `IGV详细信息 ${idRef.value}`;
  },
} as InfoCardDefaultSlot);

// --------------------------------------------------------------------------------
//
// Javascript指针(VueSFC域) | 常量 | 页面指针 | Layout
//
// --------------------------------------------------------------------------------
const idRef = ref("");
const settingCardRef = ref(undefined);
const svgContainer = ref<HTMLElement>(null);
let svgPack = undefined;
const activceTabKey = ref(1);
const infoList1 = ref<BaseInfoTableItem[]>([]);
const infoList2 = ref<BaseInfoTableItem[]>([]);
const infoList3 = ref<BaseInfoTableItem[]>([]);
const toggleFullScreen = () => {
  if (!svgContainer.value) return;
  if (document.fullscreenElement === svgContainer.value) document.exitFullscreen();
  else svgContainer.value.requestFullscreen();
};

const initialization = async () => {
  // 判断是否需要初始化svg图插件
  const domElement = svgContainer.value;
  if (!svgPack) {
    if (domElement) {
      svgPack = await initializeSvgPack(domElement, svgRawContent);
      svgPack.draw.viewbox(0 - 70, 0 - 100, 980 + 150, 330 + 100); // IGV的svg需要进行略微的缩放(太大了显示不了文字)
      svgPack.draw.attr({ style: "width: 100%; max-height: 100%;" });
    }
  }

  const id = idRef.value;
  if (svgPack.resetStatus) svgPack.resetStatus(id); // 复位svg
  resetBaseStatusLabel(IGVStatusLabels.value); // 复位状态栏
  if (settingCardRef.value) settingCardRef.value.setStatus(id); // 复位设置卡片
  // 复位数据表格
  resetBaseInfoTable(infoList1.value);
  resetBaseInfoTable(infoList2.value);
  resetBaseInfoTable(infoList3.value);

  request_webscoket(); // 请求ws点位
};

onMounted(() => {
  infoList1.value.push(...infoList1Data());
  infoList2.value.push(...infoList2Data());
  infoList3.value.push(...infoList3Data());
});

const request_webscoket = () => {
  const id = idRef.value;

  const subjections = [`DF.AGV.${id}.AhtStatus`, `DF.AGV.${id}.AhtTaskInfo`, `DF.AGV.${id}.AGVRealStatus`, `DF.AGV.${id}.ContainerInventory`, `DF.AGV.${id}.AGVCommunication`];

  const 允许调度 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "允许调度");
  const 调度状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "调度状态");

  const 控制模式 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "控制模式");
  const 控制状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "控制状态");
  const Local本地控制状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "ControlMode", "Local本地控制");
  const Auto自动模式状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "ControlMode", "Auto自动模式");
  const Remote远程模式状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "ControlMode", "Remote远程模式");

  const 车队状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "车队状态");
  const 告警状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "告警状态");
  const 暂停状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "暂停状态");
  const 紧停状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "紧停状态");
  const ECS故障 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "ECS故障");

  const 电池电量 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "电池电量");
  const 充电状态 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "充电状态");
  const 电池状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "电池状态");

  const merge_电池状态 = () => {
    if (充电状态.value === "充电") {
      if (电池状态.currentStatus === "fullEnergy") {
        setBaseStatusLabelStatus(电池状态, "fullEnergyCharging");
      } else if (电池状态.currentStatus === "normalEnergy") {
        setBaseStatusLabelStatus(电池状态, "normalEnergyCharging");
      } else if (电池状态.currentStatus === "lowEnergy") {
        setBaseStatusLabelStatus(电池状态, "lowEnergyCharging");
      } else if (电池状态.currentStatus === "off") {
        setBaseStatusLabelStatus(电池状态, "verylowCharging");
      }
    } else if (充电状态.value === "未充电") {
      if (电池状态.currentStatus === "fullEnergyCharging") {
        setBaseStatusLabelStatus(电池状态, "fullEnergy");
      } else if (电池状态.currentStatus === "normalEnergyCharging") {
        setBaseStatusLabelStatus(电池状态, "normalEnergy");
      } else if (电池状态.currentStatus === "lowEnergyCharging") {
        setBaseStatusLabelStatus(电池状态, "lowEnergy");
      } else if (电池状态.currentStatus === "verylowCharging") {
        setBaseStatusLabelStatus(电池状态, "off");
      }
    }
  };

  socketioHelper.registerListener<{
    cheId: "D001";
    displayName: "D001";
    operationalStatus: "AUTOMATIC";
    technicalStatus: "GREEN";
    ahtFleet: "YES";
    orientation: 0;
    heading: "HIGHROW";
    guiMode: "Auto";
    controlMode: "AUTO";
    remainingFuel: 80;
    chargingStatus: "NO";
    pauseState: "NO";
    emgStopStatus: "NO";
    ecsExceptionStatus: "NO";
    timeoutOrderId: null;
    avl4tos: "True";
    plcControlMode: 2;
  }>(`DF.AGV.${id}.AhtStatus`, (itemValue) => {
    try {
      const value = getAccValue(itemValue, "avl4tos");
      允许调度.value = "是";
      setBaseStatusLabelStatus(调度状态, "on");
      if (value == "False") {
        允许调度.value = "否";
        setBaseStatusLabelStatus(调度状态, "off");
      }
    } catch (err) {}

    try {
      const value = getAccValue(itemValue, "avl4tos");
      允许调度.value = "是";
      setBaseStatusLabelStatus(调度状态, "on");
      if (value == "False") {
        允许调度.value = "否";
        setBaseStatusLabelStatus(调度状态, "off");
      }
    } catch (err) {}

    try {
      setBaseStatusLabelStatus(Local本地控制状态, "off");
      setBaseStatusLabelStatus(Auto自动模式状态, "off");
      setBaseStatusLabelStatus(Remote远程模式状态, "off");
      const _plcControlMode = getAccValue(itemValue, "plcControlMode");
      const _vmsTableControlMode = getAccValue(itemValue, "controlMode");

      if (_plcControlMode == 0) {
        控制模式.value = "控制断开";
        setBaseStatusLabelStatus(控制状态, "on");
      } else if (_plcControlMode == 1) {
        控制模式.value = "Local 本地控制";
        setBaseStatusLabelStatus(Local本地控制状态, "on");
      } else if (_plcControlMode == 2 && _vmsTableControlMode == "AUTO") {
        控制模式.value = "Auto 自动模式";
        setBaseStatusLabelStatus(Auto自动模式状态, "on");
      } else if (_plcControlMode == 2 && _vmsTableControlMode == "REMOTE") {
        控制模式.value = "Remote 远程模式";
        setBaseStatusLabelStatus(Remote远程模式状态, "on");
      }
    } catch (err) {}

    try {
      const value = getAccValue(itemValue, "ahtFleet");
      setBaseStatusLabelStatus(车队状态, "on");
      if (value == "NO") setBaseStatusLabelStatus(车队状态, "off");
    } catch (err) {}

    try {
      setBaseStatusLabelStatus(告警状态, "off");
      const value = getAccValue(itemValue, "timeoutOrderId");
      if (value) setBaseStatusLabelStatus(告警状态, "on");
    } catch (err) {}

    try {
      setBaseStatusLabelStatus(暂停状态, "off");
      const value = getAccValue(itemValue, "pauseState");
      if (value == "Yes") {
        setBaseStatusLabelStatus(暂停状态, "on");
      }
    } catch (err) {}

    try {
      setBaseStatusLabelStatus(紧停状态, "off");
      const value = getAccValue(itemValue, "emgStopStatus");
      if (value == "Yes") setBaseStatusLabelStatus(紧停状态, "on");
    } catch (err) {}

    try {
      充电状态.value = "未充电";
      const value = getAccValue(itemValue, "chargingStatus");
      if (value == "YES") 充电状态.value = "充电";
      merge_电池状态();
    } catch (err) {}

    try {
      setBaseStatusLabelStatus(ECS故障, "off");
      const value = getAccValue(itemValue, "technicalStatus");
      if (value == "RED" || value == "ORANGE") {
        setBaseStatusLabelStatus(ECS故障, "FAULT");
      }
    } catch (err) {}

    try {
      const value = getAccValue(itemValue, "remainingFuel");
      电池电量.value = value;
      电池状态.tipValue = value;
      if (value > 60) setBaseStatusLabelStatus(电池状态, "fullEnergy");
      else if (value > 40) setBaseStatusLabelStatus(电池状态, "normalEnergy");
      else if (value > 20) setBaseStatusLabelStatus(电池状态, "lowEnergy");
      else setBaseStatusLabelStatus(电池状态, "off");
      merge_电池状态(); // 电池状态收到充电状态影响
    } catch (err) {}
  });

  socketioHelper.registerListener<{
    cheId: "T001";
    status: "YARD_GOING";
    orderType: "DELIVER";
    workPhase: "DELIVER";
    parkSpot: "CLTP.61B.61B101.026";
    location: "CLTP.61B.61B101.026";
    wi: "5833816866371";
    moveKind: "M";
    tempDestination: "CLTP.61B.61B101.026";
    parkTime: 1782114504000;
    taskId: "4708056816402173952";
    jobPos: "CENTER";
    ahtHeading: "HIGHROW";
    yardId: "61B";
    updated: 1782118024000;
    wi1: "5833816866371";
    wiPosAht1: "CENTER";
    containerId1: "KOCU4424045";
    containerSize1: "40";
    moveKind1: "YARD";
  }>(`DF.AGV.${id}.AhtTaskInfo`, (itemValue) => {
    console.log(`DF.AGV.${id}.AhtTaskInfo`, itemValue);
    for (let i = 0; i < infoList1.value.length; i++) {
      const infoItem = infoList1.value[i];
      if (!infoItem.subject) continue;
      const value = getAccValue(itemValue, infoItem.subject);
      infoItem.value = value;
      if (infoItem.classify === "time") {
        if (!value) continue;
        infoItem.value = dayjs(value).format("YYYY-MM-DD HH:mm:ss");
      }
    }
  });

  const X坐标 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "X坐标(cm)");
  const Y坐标 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "Y坐标(cm)");
  const 车头朝向 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "车头朝向");
  socketioHelper.registerListener<{ code: "D005"; x: 467315.82; y: 2499678.24; heading: 0; updated: 1750393952108 }>(`DF.AGV.${id}.AGVRealStatus`, (itemValue) => {
    // console.log(`DF.AGV.${id}.AGVRealStatus`, itemValue);
    X坐标.value = getAccValue(itemValue, "x");
    Y坐标.value = getAccValue(itemValue, "y");
    const heading = getAccValue(itemValue, "heading");
    车头朝向.value = 0;
    if (heading !== undefined) 车头朝向.value = Number(heading) / 100.0;
  });

  const 通信状态t = findBaseXItem<BaseInfoTableItem>(infoList2.value, "通信状态");
  const 通信状态 = findBaseXItem<BaseStatusLabelItem>(IGVStatusLabels.value, "通信状态");
  socketioHelper.registerListener<{ value: number; code: "D005" }>(`DF.AGV.${id}.AGVCommunication`, (itemValue) => {
    通信状态t.value = "在线";
    setBaseStatusLabelStatus(通信状态, "on");
    if (itemValue.value !== 1) {
      通信状态t.value = "离线";
      setBaseStatusLabelStatus(通信状态, "off");
    }
  });

  socketioHelper.subReal(undefined, ...subjections);
};
</script>
