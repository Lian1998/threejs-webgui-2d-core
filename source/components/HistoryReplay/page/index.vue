<template>
  <div class="hostory-replay-page" ref="pageRef">
    <div class="hostory-replay-page-container">
      <div class="tool-box">
        <!-- 时间选择器 -->
        <a-range-picker class="range" format="YYYY-MM-DD HH:mm:ss" v-model:value="timePicked" :disabled="historyReplayStatus.pickTimeConfirmed" :placeholder="['回放开始时间', '回放结束时间']" :show-time="{ format: 'YYYY-MM-DD HH:mm:ss' }" @ok="on_timePickedChanged" />

        <!-- Tick文件导入导出 -->
        <div class="input-export">
          <a-button v-show="!historyReplayStatus.pickTimeConfirmed" :icon="h(ImportOutlined)" :loading="importBtnLoading" @click="on_tickFileImport" />
        </div>

        <!-- 当前状态文字提示 -->
        <template v-if="historyReplayStatus.pickTimeConfirmed">
          <span v-if="!historyReplayStatus.initializedUA" class="status-0">
            <LoadingOutlined :style="'fill: red'" />
            等待UA初始化中...
          </span>
          <span v-else-if="!historyReplayStatus.finishedUA" class="status-1">
            <LoadingOutlined />
            回放数据获取中...
          </span>
          <span v-else class="status-2">
            <CheckOutlined />
            数据加载完成
            <div class="input-export">
              <a-button v-show="historyReplayStatus.finishedUA" :icon="h(ExportOutlined)" :loading="exportBtnLoading" @click="on_tickFileExport_wrapped" />
            </div>
          </span>
        </template>

        <!-- prettier-ignore -->
        <a-button type="primary" class="rtbtn" :disabled="historyReplayStatus.pickTimeConfirmed" @click="on_timePickedConfirmed">确认回放</a-button>
      </div>

      <div class="tool-box">
        <div class="playbtn">
          <a-tooltip>
            <template #title> 快退到上一个时间点 </template>
            <template #default>
              <a-button :disabled="!historyReplayStatus.finishedUA || historyReplayStatus.playing" shape="circle" :icon="h(DoubleLeftOutlined)" @click="on_sliderStepChange(-1)" />
            </template>
          </a-tooltip>
          <a-tooltip>
            <template #title> {{ historyReplayStatus.playing ? "暂停" : "播放" }} </template>
            <template #default>
              <a-button shape="circle" :disabled="!historyReplayStatus.initializedUA" :icon="historyReplayStatus.playing ? h(PauseOutlined) : h(CaretRightOutlined)" @click="on_playpauseButtonClicked" />
            </template>
          </a-tooltip>
          <a-tooltip>
            <template #title> 快进到下一个时间点 </template>
            <template #default>
              <a-button :disabled="!historyReplayStatus.finishedUA || historyReplayStatus.playing" shape="circle" :icon="h(DoubleRightOutlined)" @click="on_sliderStepChange(1)" />
            </template>
          </a-tooltip>

          <a-select ref="select" v-model:value="xSpeed" :disabled="!historyReplayStatus.initializedUA || historyReplayStatus.playing" style="width: 90px">
            <a-select-option :value="1">1x</a-select-option>
            <a-select-option :value="2">2x</a-select-option>
            <a-select-option :value="4">4x</a-select-option>
            <a-select-option :value="8">8x</a-select-option>
          </a-select>
        </div>

        <a-button class="rtbtn" style="margin-right: 10px" type="primary" :disabled="!historyReplayStatus.initializedUA || historyReplayStatus.playing" @click="on_reqeuestDBInfo"> 获取此刻任务数据 </a-button>
        <a-button type="primary" @click="on_quit">退出回放</a-button>
      </div>

      <div class="slider" ref="sliderRef">
        <!-- :disabled="!historyReplayStatus.finishedUA || historyReplayStatus.playing" -->
        <a-slider :tip-formatter="sliderFormatter" tooltipPlacement="bottom" v-model:value="sliderValue" :disabled="historyReplayStatus.playing" :marks="sliderMarks" :min="sliderMin" :max="sliderMax" :tooltipOpen="historyReplayStatus.pickTimeConfirmed" @change="on_sliderTackChange">
          <template #mark="{ label }">{{ label }}</template>
        </a-slider>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import zhCN from "ant-design-vue/es/locale/zh_CN";

import { Slider as ASlider } from "ant-design-vue";
import { RangePicker as ARangePicker } from "ant-design-vue";
import { Select as ASelect } from "ant-design-vue";
import { Button as AButton } from "ant-design-vue";
import { Tooltip as ATooltip } from "ant-design-vue";
import { CaretRightOutlined } from "@ant-design/icons-vue";
import { DoubleLeftOutlined } from "@ant-design/icons-vue";
import { DoubleRightOutlined } from "@ant-design/icons-vue";
import { PauseOutlined } from "@ant-design/icons-vue";
import { LoadingOutlined } from "@ant-design/icons-vue";
import { CheckOutlined } from "@ant-design/icons-vue";
import { ImportOutlined } from "@ant-design/icons-vue";
import { ExportOutlined } from "@ant-design/icons-vue";

import { timePicked } from "./index_ui";
import { sliderMarks } from "./index_ui";
import { sliderValue } from "./index_ui";
import { sliderMin } from "./index_ui";
import { sliderMax } from "./index_ui";
import { xSpeed } from "./index_ui";
import { extraDoms } from "./index_ui";
import { importBtnLoading } from "./index_ui";
import { exportBtnLoading } from "./index_ui";

import { on_timePickedChanged } from "./index_ui";
import { on_timePickedConfirmed } from "./index_ui";
import { on_quit } from "./index_ui";
import { on_reqeuestDBInfo } from "./index_ui";
import { on_playpauseButtonClicked } from "./index_ui";
import { on_sliderStepChange } from "./index_ui";
import { on_sliderTackChange } from "./index_ui";
import { on_sliderRailHover } from "./index_ui";

import { historyReplayStatus } from "./index_core";
import { on_tickFileImport, on_tickFileExport } from "./index_core";

import { ref } from "vue";
import { h } from "vue";
import { watch } from "vue";
import { nextTick } from "vue";
import { debounce } from "lodash-es";

const sliderFormatter = () => dayjs(sliderValue.value).format("MM-DD HH:mm:ss");
const pageRef = ref(null);
const sliderRef = ref(null);

let firstTimeOpen = true;

// 如果是确定了时间范围进入UA初始化阶段了, 那么去除掉header的关闭按钮
watch(historyReplayStatus, (newValue) => {
  if (newValue.pickTimeConfirmed === true) {
    if (extraDoms.headerCloseBtn) extraDoms.headerCloseBtn.style.display = "none";
  }
});

// nextTick不会在非sfc的地方生效
const on_tickFileExport_wrapped = async () => {
  exportBtnLoading.value = true;
  await nextTick();

  setTimeout(() => {
    on_tickFileExport();
  }, 100);
};

defineExpose({
  onOpenInfoCard: async (data: any) => {
    if (firstTimeOpen) {
      firstTimeOpen = false;
      // 强制修改样式
      const father = (pageRef.value as HTMLDivElement).parentNode as HTMLDivElement;
      father.style.position = "absolute";
      father.style.left = "50%";
      father.style.top = "5px";
      father.style.transform = "translateX(-50%)";

      // 去除弹框头的移动监听
      const headerElement: HTMLDivElement = father.firstElementChild as HTMLDivElement;
      const title = headerElement.querySelector(".title") as HTMLDivElement;
      title.style.padding = "5px";
      title.innerHTML = "历史回放";
      if (headerElement["callback_mousedown"]) {
        headerElement.style.cursor = "unset";
        headerElement.removeEventListener("mousedown", headerElement["callback_mousedown"]);
        headerElement["callback_mousedown"] = undefined;
      }
      extraDoms.headerCloseBtn = headerElement.querySelector(".close-button");

      const sliderDom = sliderRef.value as HTMLDivElement;

      // 添加一个sliderTrack, 用于现实当前帧加载情况
      const sliderTrack = sliderDom.querySelector(".ant-slider-track") as HTMLDivElement;
      const sliderTrackAdd = document.createElement("div");
      extraDoms.sliderTrackAdd = sliderTrackAdd;
      sliderTrackAdd.style.left = "0%";
      sliderTrackAdd.style.right = "auto";
      sliderTrackAdd.style.width = "0%";
      sliderTrackAdd.style.backgroundColor = "#FFD3B6FF"; // #FFD3B6FF #DCEDC1FF
      sliderTrackAdd.style.height = "4px";
      sliderTrack.after(sliderTrackAdd);

      // 添加一个Tooltip, 用于实现hover提示
      const sliderRail = sliderDom.querySelector(".ant-slider") as HTMLDivElement;
      let sliderRailLeft = 0.0;
      let sliderRailWidth = 0.0;
      const resizeCallback = debounce(
        () => {
          const boundingRect = sliderRail.getBoundingClientRect();
          sliderRailLeft = boundingRect.left;
          sliderRailWidth = boundingRect.width;
        },
        100,
        { trailing: true },
      );
      resizeCallback();
      window.addEventListener("resize", resizeCallback);

      const tooltipAdd = document.createElement("div");
      extraDoms.tooltipAdd = tooltipAdd;
      sliderDom.appendChild(tooltipAdd);
      tooltipAdd.classList.add("tooltip-add");
      tooltipAdd.style.display = "none";
      let mouseEnterFlag = false;
      sliderRail.addEventListener("mouseenter", () => (mouseEnterFlag = true));
      sliderRail.addEventListener("mouseleave", () => {
        mouseEnterFlag = false;
        tooltipAdd.style.display = "none";
      });
      sliderRail.addEventListener("mousemove", (e) => {
        if (!historyReplayStatus.pickTimeConfirmed) return;
        if (historyReplayStatus.playing) return;
        if (!mouseEnterFlag) return;
        tooltipAdd.style.display = "block";
        on_sliderRailHover(e.clientX - sliderRailLeft, sliderRailWidth);
      });
    }
    return Promise.resolve({ block: true });
  },
  onCloseInfoCard: () => {},
} as InfoCardDefaultSlot);
</script>

<style lang="scss">
.hostory-replay-page {
  width: 1000px;

  .hostory-replay-page-container {
    padding: 10px 32px;

    .tool-box {
      margin-bottom: 12px;
      align-content: center;
      display: flex;
      align-items: center;
      position: relative;
    }

    // 第一层
    .tool-box {
      .input-export {
        display: inline-block;
        scale: 0.8;
        margin-left: 5px;
      }

      .status-0 {
        margin-left: 10px;
        color: red;
        svg {
          fill: red;
        }
      }

      .status-1 {
        margin-left: 10px;
        color: orange;
        svg {
          fill: orange;
        }
      }

      .status-2 {
        margin-left: 10px;
        color: green;
        svg {
          fill: green;
        }
      }

      .rtbtn {
        margin-left: auto;
      }
    }

    // 第二层
    .tool-box {
      .playbtn {
        .ant-btn {
          margin-right: 7px;
        }

        .ant-select {
          margin-left: 7px;
        }
      }
    }

    // 第三层
    .slider {
      position: relative;

      .ant-slider {
        // 给mark添加一个默认宽度, 不让文字换行
        .ant-slider-mark {
          .ant-slider-mark-text {
            width: 108px;
            height: 32px;
            white-space: nowrap;
          }
        }
      }

      // 自定义hover tooltip样式
      .tooltip-add {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        font-size: 14px;
        position: absolute;
        top: -45px;
        left: 0px;
        transform: translateX(-50%);

        width: 108px;
        height: 32px;
        padding: 6px 8px;
        color: #fff;
        text-align: start;
        text-decoration: none;
        background-color: rgba(0, 0, 0, 0.85);
        border-radius: 6px;
        box-shadow:
          0 6px 16px 0 rgba(0, 0, 0, 0.08),
          0 3px 6px -4px rgba(0, 0, 0, 0.12),
          0 9px 28px 8px rgba(0, 0, 0, 0);
        white-space: nowrap;
      }

      .tooltip-add::after {
        position: absolute;
        width: 16px;
        height: 8px;
        bottom: 0;
        background: black;
        transform: rotate(180deg) translateX(48px) translateY(-8px);
        clip-path: path("M 0 8 A 4 4 0 0 0 2.82842712474619 6.82842712474619 L 6.585786437626905 3.0710678118654755 A 2 2 0 0 1 9.414213562373096 3.0710678118654755 L 13.17157287525381 6.82842712474619 A 4 4 0 0 0 16 8 Z");
        content: "";
      }
    }
  }
}
</style>
