<template>
  <div class="qc-info-container">
    <!-- 岸桥状态图形化 -->
    <div class="graphic-card">
      <div class="qc-details">
        <!-- 岸桥SVG -->
        <div class="svg-window" ref="svgContainer">
          <SvgIcon class="svg-fullscreen" name="mapui-fullscreen" @click="toggleFullScreen" />
        </div>

        <!-- 岸桥平台状态 -->
        <VertiviewSpreader ref="vertiviewSpreaderRef" />
      </div>

      <div class="status-bar">
        <a-tooltip v-for="(item, index) in QCStatusLabels" :key="index">
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

    <!-- 岸桥详细信息表格卡片 -->
    <div class="information-card">
      <!-- tabsLoading -->
      <a-tabs v-model:activeKey="activceTabKey" type="card" size="small">
        <a-tab-pane :key="1" tab="任务信息" :forceRender="true">
          <a-tabs v-model:activeKey="activceTabKey1" type="card" size="small">
            <a-tab-pane :key="1" tab="主小车" :forceRender="true">
              <BaseInfoTable :list="infoList11" :widthCols="24" :lineHeight="34" :rowTitlewidth="100" isAstWiden="true" />
            </a-tab-pane>
            <a-tab-pane :key="3" tab="海侧平台" :forceRender="true">
              <BaseInfoTable :list="infoList12" :widthCols="24" :lineHeight="34" :rowTitlewidth="100" isAstWiden="true" />
            </a-tab-pane>
            <a-tab-pane :key="2" tab="陆侧平台" :forceRender="true">
              <BaseInfoTable :list="infoList13" :widthCols="24" :lineHeight="34" :rowTitlewidth="100" isAstWiden="true" />
            </a-tab-pane>
            <a-tab-pane :key="4" tab="门架小车" :forceRender="true">
              <BaseInfoTable :list="infoList14" :widthCols="24" :lineHeight="34" :rowTitlewidth="100" isAstWiden="true" />
            </a-tab-pane>
          </a-tabs>
        </a-tab-pane>
        <a-tab-pane :key="2" tab="设备信息" :forceRender="true">
          <BaseInfoTable :list="infoList2" :widthCols="24" :lineHeight="34" :rowTitlewidth="250" />
        </a-tab-pane>
        <a-tab-pane :key="3" tab="吊具指令" :forceRender="true">
          <BaseInfoTable :list="infoList3" :widthCols="24" :lineHeight="34" :rowTitlewidth="250" />
        </a-tab-pane>
        <a-tab-pane :key="4" tab="配置" :forceRender="true">
          <SettingCard ref="settingCardRef" :rowTitlewidth="120" :line-height="34" />
        </a-tab-pane>
        <a-tab-pane :key="5" tab="关键信息" :forceRender="true">
          <BaseInfoTable :list="infoList5" :widthCols="24" :lineHeight="34" :rowTitlewidth="150" />
        </a-tab-pane>
        <a-tab-pane :key="6" tab="JOB" :forceRender="true">
          <a-tabs v-model:activeKey="activceTabKey2" type="card" size="small">
            <a-tab-pane :key="1" tab="主小车" :forceRender="true">
              <BaseInfoTable :list="infoList61" :widthCols="24" :lineHeight="34" :rowTitlewidth="250" />
            </a-tab-pane>
            <a-tab-pane :key="2" tab="门架小车" :forceRender="true">
              <BaseInfoTable :list="infoList62" :widthCols="24" :lineHeight="34" :rowTitlewidth="250" />
            </a-tab-pane>
          </a-tabs>
        </a-tab-pane>
        <a-tab-pane :key="7" tab="异常信息" :forceRender="true">
          <BaseInfoTable :list="infoList7" :widthCols="24" :lineHeight="34" :rowTitlewidth="250" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";
import SettingCard from "./operations/SettingCard.vue";
import svgRawContent from "./svg/index.svg?raw";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { initializeSvgPack } from "./svg/index.ts";
import { ref } from "vue";
import { onMounted } from "vue";
import { QCStatusLabels } from "./data/QCStatusLabels";
import infoList11Data from "./data/info1-任务信息1.js";
import infoList12Data from "./data/info1-任务信息2.js";
import infoList13Data from "./data/info1-任务信息3.js";
import infoList14Data from "./data/info1-任务信息4.js";
import infoList2Data from "./data/info2-设备信息.js";
import infoList3Data from "./data/info3-吊具指令.js";
import infoList5Data from "./data/info5-关键信息.js";
import infoList61Data from "./data/info6-JOB1.js";
import infoList62Data from "./data/info6-JOB2.js";
import infoList7Data from "./data/info7-异常.js";

import dayjs from "dayjs";

import BaseInfoTable from "../_BaseInfoTable/index";
import { findBaseXItem } from "@2dmapv2/classes/DataHelper";
import { getAccValue } from "@2dmapv2/classes/DataHelper";
import { resetBaseInfoTable } from "@2dmapv2/classes/DataHelper";
import { resetBaseStatusLabel } from "@2dmapv2/classes/DataHelper";
import { setBaseStatusLabelStatus } from "@2dmapv2/classes/DataHelper";

import VertiviewSpreader from "./VertiviewSpreader/index.vue";

import { SocketioSubModule } from "@2dmapv2/classes/SocketioHelper.ts";
import { socketioHelpers } from "./index";
defineExpose({
  onOpenInfoCard: async (data: string, options) => {
    if (idRef.value === data) return;
    idRef.value = data;
    socketioHelper = socketioHelpers[options.instanceIndex];
    socketioHelper.dispose();
    initialization();
  },
  onCloseInfoCard: () => {
    idRef.value = undefined;
    socketioHelper.dispose();
  },
  setTitle: () => {
    return `QC详细信息 ${idRef.value}`;
  },
} as InfoCardDefaultSlot);

// --------------------------------------------------------------------------------
//
// Javascript指针(VueSFC域) | 常量 | 页面指针 | Layout
//
// --------------------------------------------------------------------------------
const idRef = ref("");
const settingCardRef = ref(undefined);
const vertiviewSpreaderRef = ref(null);
const svgContainer = ref<HTMLElement | null>(null);
let svgPack = undefined;
let socketioHelper: SocketioSubModule = undefined;
const activceTabKey = ref(1);
const activceTabKey1 = ref(1);
const activceTabKey2 = ref(1);
const infoList11 = ref<BaseInfoTableItem[]>([]);
const infoList12 = ref<BaseInfoTableItem[]>([]);
const infoList13 = ref<BaseInfoTableItem[]>([]);
const infoList14 = ref<BaseInfoTableItem[]>([]);
const infoList2 = ref<BaseInfoTableItem[]>([]);
const infoList3 = ref<BaseInfoTableItem[]>([]);
const infoList5 = ref<BaseInfoTableItem[]>([]);
const infoList61 = ref<BaseInfoTableItem[]>([]);
const infoList62 = ref<BaseInfoTableItem[]>([]);
const infoList7 = ref<BaseInfoTableItem[]>([]);
const toggleFullScreen = () => {
  if (!svgContainer.value) return;
  if (document.fullscreenElement === svgContainer.value) document.exitFullscreen();
  else svgContainer.value.requestFullscreen();
};
const initialization = async () => {
  const id = idRef.value;
  if (svgPack.resetStatus) svgPack.resetStatus(id, socketioHelper); // 复位svg
  vertiviewSpreaderRef.value.resetStatus(id, socketioHelper); // 复位垂直显示平台和锁具集装箱图
  resetBaseStatusLabel(QCStatusLabels.value); // 复位状态栏
  if (settingCardRef.value) settingCardRef.value.resetStatus(id); // 复位设置卡片
  // 复位数据表格
  resetBaseInfoTable(infoList11.value);
  resetBaseInfoTable(infoList12.value);
  resetBaseInfoTable(infoList13.value);
  resetBaseInfoTable(infoList14.value);
  resetBaseInfoTable(infoList2.value);
  resetBaseInfoTable(infoList3.value);
  resetBaseInfoTable(infoList5.value);
  resetBaseInfoTable(infoList61.value);
  resetBaseInfoTable(infoList62.value);
  resetBaseInfoTable(infoList7.value);

  request_webscoket(); // 请求ws点位
};

onMounted(async () => {
  const domElement = svgContainer.value;
  if (domElement) {
    svgPack = await initializeSvgPack(domElement, svgRawContent);
    svgPack.draw.viewbox(0, 0, 1700, 1200);
    svgPack.draw.attr({ style: "width: 100%; max-height: 100%;" });
  }

  infoList11.value.push(...infoList11Data());
  infoList12.value.push(...infoList12Data());
  infoList13.value.push(...infoList13Data());
  infoList14.value.push(...infoList14Data());
  infoList2.value.push(...infoList2Data());
  infoList3.value.push(...infoList3Data());
  infoList5.value.push(...infoList5Data());
  infoList61.value.push(...infoList61Data());
  infoList62.value.push(...infoList62Data());
  infoList7.value.push(...infoList7Data());
});

// --------------------------------------------------------------------------------
// 岸桥图标栏
// 任务信息页面
// 设备信息页面
// 模式页面
// --------------------------------------------------------------------------------
const request_webscoket = () => {
  const id = idRef.value;

  const subjections = [
    `DF.QC.${id}.QCGantryPos`,
    `DF.QC.${id}.QCMtTrolleyPos`,
    `DF.QC.${id}.QCMtHoistPos`,
    `DF.QC.${id}.QCPtTrolleyPos`,
    `DF.QC.${id}.QCPtHoistPos`,
    `DF.QC.${id}.QCPfWsPadSize`,
    `DF.QC.${id}.QCPfLsPadSize`,
    `DF.QC.${id}.QCMtWsSprdSize`,
    `DF.QC.${id}.QCPtSprdSize`,
    `DF.QC.${id}.QCMtWsSprdTwist`,
    `DF.QC.${id}.QCPtSprdTwist`,
    `DF.QC.${id}.PfLsPadConingStatus`,
    `DF.QC.${id}.PfWsPadConingStatus`,
    `DF.QC.${id}.LasherManMode`, // 平台锁头工分配模式
    `DF.QC.${id}.MtInstrType`, // 主小车指令类型
    `DF.QC.${id}.MtInstrTypeObject`,
    `DF.QC.${id}.MtInstrStatus`,
    `DF.QC.${id}.PtInstrType`, // 门架小车指令
    `DF.QC.${id}.PtInstrTypeObject`,
    `DF.QC.${id}.PtInstrStatus`,
    `DF.QC.${id}.MtWorkMode`, // 真实工作状态
    `DF.QC.${id}.PtWorkMode`,
    `DF.QC.${id}.QCHeartBeat`, // 心跳
    `DF.QC.${id}.QCEvent`, // 关键信息
    `DF.QC.${id}.QCCommunication`, // 操作模式
    `DF.QC.${id}.QcTaskInfo`, // 任务信息
    `DF.QC.${id}.QcContainer`, // 集装箱
  ];

  const 大车位置 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "大车位置(m)");
  socketioHelper.registerListener<{ value: 22000; code: "DC01" }>(`DF.QC.${id}.QCGantryPos`, (itemValue) => {
    大车位置.value = itemValue.value / 100.0;
  });
  const 主小车位置 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "主小车位置(m)");
  socketioHelper.registerListener<{ value: 11775; code: "DC01" }>(`DF.QC.${id}.QCMtTrolleyPos`, (itemValue) => {
    主小车位置.value = itemValue.value / 1000.0;
  });
  const 门架小车位置 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "门架小车位置(m)");
  socketioHelper.registerListener<{ value: 920; code: "DC01" }>(`DF.QC.${id}.QCPtTrolleyPos`, (itemValue) => {
    门架小车位置.value = itemValue.value / 100.0;
  });
  const 主小车起升 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "主小车起升(m)");
  socketioHelper.registerListener<{ value: 618; code: "DC01" }>(`DF.QC.${id}.QCMtHoistPos`, (itemValue) => {
    主小车起升.value = itemValue.value / 100.0;
  });
  const 门架小车起升 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "门架小车起升(m)");
  socketioHelper.registerListener<{ value: 1610; code: "DC01" }>(`DF.QC.${id}.QCPtHoistPos`, (itemValue) => {
    门架小车起升.value = itemValue.value / 100.0;
  });

  const N人模式 = findBaseXItem<BaseStatusLabelItem>(QCStatusLabels.value, "N人模式");
  socketioHelper.registerListener<{ value: 1; code: "DC01" }>(`DF.QC.${id}.LasherManMode`, (itemValue) => {
    N人模式.tipValue = "S";
    setBaseStatusLabelStatus(N人模式, "off");
    if (itemValue.value === 1) {
      N人模式.tipValue = "0";
      setBaseStatusLabelStatus(N人模式, "on");
    } else if (itemValue.value === 2) {
      N人模式.tipValue = "1";
      setBaseStatusLabelStatus(N人模式, "on");
    } else if (itemValue.value === 3) {
      N人模式.tipValue = "2";
      setBaseStatusLabelStatus(N人模式, "on");
    }
  });

  const 主小车指令类型 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "主小车指令类型");
  socketioHelper.registerListener<string>(`DF.QC.${id}.MtInstrStatus`, (itemValue) => (主小车指令类型.value = itemValue));
  const 主小车指令对象 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "主小车指令对象");
  socketioHelper.registerListener<string>(`DF.QC.${id}.MtInstrTypeObject`, (itemValue) => (主小车指令对象.value = itemValue));
  const 主小车指令状态 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "主小车指令状态");
  socketioHelper.registerListener<string>(`DF.QC.${id}.MtInstrStatus`, (itemValue) => (主小车指令状态.value = itemValue));

  const 门架小车指令类型 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "门架小车指令类型");
  socketioHelper.registerListener<string>(`DF.QC.${id}.PtInstrType`, (itemValue) => (门架小车指令类型.value = itemValue));
  const 门架小车指令对象 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "门架小车指令对象");
  socketioHelper.registerListener<string>(`DF.QC.${id}.PtInstrTypeObject`, (itemValue) => (门架小车指令对象.value = itemValue));
  const 门架小车指令状态 = findBaseXItem<BaseInfoTableItem>(infoList3.value, "门架小车指令状态");
  socketioHelper.registerListener<string>(`DF.QC.${id}.PtInstrStatus`, (itemValue) => (门架小车指令状态.value = itemValue));

  const 主小车工作模式 = findBaseXItem<BaseStatusLabelItem>(QCStatusLabels.value, "主小车工作模式");
  socketioHelper.registerListener<{ value: 1; code: "DC01" }>(`DF.QC.${id}.MtWorkMode`, (itemValue) => {
    主小车工作模式.description = "主小车工作模式: 未知";
    setBaseStatusLabelStatus(主小车工作模式, "off");
    if (itemValue.value === 1) {
      主小车工作模式.description = "主小车工作模式: 正常模式";
      setBaseStatusLabelStatus(主小车工作模式, "normal");
    } else if (itemValue.value === 2) {
      主小车工作模式.description = "主小车工作模式: 自由模式";
      setBaseStatusLabelStatus(主小车工作模式, "free");
    } else if (itemValue.value === 3) {
      主小车工作模式.description = "主小车工作模式: 仓盖板模式";
      setBaseStatusLabelStatus(主小车工作模式, "hatchcover");
    } else if (itemValue.value === 4) {
      主小车工作模式.description = "主小车工作模式: 特殊模式";
      setBaseStatusLabelStatus(主小车工作模式, "special");
    }
  });

  const 门架小车工作模式 = findBaseXItem<BaseStatusLabelItem>(QCStatusLabels.value, "门架小车工作模式");
  socketioHelper.registerListener<{ value: 1; code: "DC01" }>(`DF.QC.${id}.PtWorkMode`, (itemValue) => {
    门架小车工作模式.description = "门架小车工作模式: 未知";
    setBaseStatusLabelStatus(门架小车工作模式, "off");
    if (itemValue.value === 1) {
      门架小车工作模式.description = "门架小车工作模式: 正常模式";
      setBaseStatusLabelStatus(门架小车工作模式, "normal");
    } else if (itemValue.value === 2) {
      门架小车工作模式.description = "门架小车工作模式: 维修模式";
      setBaseStatusLabelStatus(门架小车工作模式, "maintenance");
    } else if (itemValue.value === 3) {
      门架小车工作模式.description = "门架小车工作模式: 本地模式";
      setBaseStatusLabelStatus(门架小车工作模式, "local");
    } else if (itemValue.value === 4) {
      门架小车工作模式.description = "门架小车工作模式: 被平台操作工暂停";
      setBaseStatusLabelStatus(门架小车工作模式, "suspended");
    }
  });

  // 关键信息
  socketioHelper.registerListener<{ cheId: "DC01"; mtschd: null; pt: null; mt: null; ptschd: null; gantry: null }>(`DF.QC.${id}.QCEvent`, (itemValue) => {
    for (let i = 0; i < infoList5.value.length; i++) {
      const infoItem = infoList5.value[i];
      if (!infoItem.subject) infoItem.value = "";
      else infoItem.value = getAccValue(itemValue, infoItem.subject);
    }
  });

  const 通信状态 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "通信状态");
  const 通信状态StatusLabel = findBaseXItem<BaseStatusLabelItem>(QCStatusLabels.value, "通信状态");
  socketioHelper.registerListener<{ value: 16; code: "DC01" }>(`DF.QC.${id}.QCHeartBeat`, (itemValue) => {
    通信状态.value = "离线";
    setBaseStatusLabelStatus(通信状态StatusLabel, "off");
    if (itemValue.value > 0) {
      通信状态.value = "在线";
      setBaseStatusLabelStatus(通信状态StatusLabel, "on");
    }
  });

  const 设备模式 = findBaseXItem<BaseInfoTableItem>(infoList2.value, "设备模式");
  const Auto自动模式 = findBaseXItem<BaseStatusLabelItem>(QCStatusLabels.value, "Auto自动模式");
  const Remote远程模式 = findBaseXItem<BaseStatusLabelItem>(QCStatusLabels.value, "MANUAL手动模式");
  socketioHelper.registerListener<number>(`DF.QC.${id}.QCCommunication`, (itemValue) => {
    setBaseStatusLabelStatus(Auto自动模式, "off");
    setBaseStatusLabelStatus(Remote远程模式, "off");
    if (itemValue === 1) {
      设备模式.value = "AUTOMATIC 自动模式";
      setBaseStatusLabelStatus(Auto自动模式, "on");
    } else if (itemValue === 2) {
      设备模式.value = "MANUAL 手动模式";
      setBaseStatusLabelStatus(Remote远程模式, "on");
    }
  });

  const pages = ["mtWs", "pfWs", "pfLs", "pt"];
  const sides = ["Left", "Right"];
  const infoLists = [infoList11, infoList12, infoList13, infoList14];
  socketioHelper.registerListener<
    // prettier-ignore
    Record<string, {
      cheId: "DC01";
      commandId: "af613ee1c9144f829349130ea42c8c0d";
      commandStatus: "WORKING";
      containerCurrLocation: "QCPLATFORM.DC01.LS.C";
      containerLastLocation: "QCSPREADER.DC01.M.C.C";
      containerOrigLocation: "VESSEL.HMIR0014W.086.10.74";
      containerPosition: "中间";
      containerSize: "40";
      doorDirectionAtQc: "未知";
      moveKind: "卸船";
      referenceId: "02506100010025434001";
      vesselName: "HMM MIR";
      workQueue: "HMIR0014W-8640DDISCH";
    }>
  >(`DF.QC.${id}.QcTaskInfo`, (itemValue) => {
    // console.log(`DF.QC.${id}.QcTaskInfo`, itemValue);
    itemValue = itemValue ?? {};
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const infoList = infoLists[i];
      for (let j = 0; j < sides.length; j++) {
        const side = sides[j];
        const key = page + side;
        infoList.value.forEach((item) => {
          if (!item.subject) return;
          item.value[j] = getAccValue(itemValue, key, item.subject);
        });
      }
    }
  });
  socketioHelper.subReal(undefined, ...subjections);
};
</script>
