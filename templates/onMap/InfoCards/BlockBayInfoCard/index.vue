<template>
  <div class="block-bay-info-card" ref="infoCardRef">
    <div class="svg-containers" ref="svgContainerRef"> </div>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";

import type { Ref } from "vue";
import { ref } from "vue";
import { onMounted } from "vue";

import { initializeSvgPack } from "./svg/index";

import { BayMap, BlockMap } from "@2dmapv2/data/index";

import { socketioSubModule_infocard_yc as socketioHelper } from "@2dmapv2/data/initWebSocketData";

const idRef = ref();
const infoCardRef = ref(undefined);
const settingCardRef = ref(undefined);

onMounted(() => {});

const packs: { key: string; dom: HTMLDivElement; pack: ReturnType<typeof initializeSvgPack> }[] = [];
const subjections = [];

defineExpose({
  onOpenInfoCard: (bayItem: MapTypeV<typeof BayMap>) => {
    const key = `YARD-${bayItem.block_deviceAlias}_${bayItem.deviceAlias}`;
    if (packs.find((pack) => pack.key === key)) return; // 看看是否已经请求且生成过侧视图
    const block_deviceAlias = bayItem.block_deviceAlias;
    const columnNum = BlockMap.get(block_deviceAlias).laneMap.size - 2;

    const dom = document.createElement("div");
    svgContainerRef.value.appendChild(dom);
    const svgPack = initializeSvgPack(dom, { columnNum: columnNum, key: key });
    svgPack.draw.viewbox(0, 0, svgPack.canvasSize.width, svgPack.canvasSize.height);
    svgPack.draw.attr({ style: "width: auto; height: 300px;" });
    packs.push({ key, dom, pack: svgPack });

    if (packs.length > 1) infoCardRef.value.style.height = "600px";
  },
  onCloseInfoCard: () => {
    for (let i = 0; i < packs.length; i++) {
      const { dom, pack } = packs[i];
      pack.draw.remove();
      svgContainerRef.value.removeChild(dom);
    }
    packs.length = 0;
    socketioHelper.dispose();

    infoCardRef.value.style.height = "unset";
  },
  setTitle: () => {
    return `堆场贝侧视图`;
  },
} as InfoCardDefaultSlot);

// --------------------------------------------------------------------------------
//
// Javascript指针(VueSFC域) | 常量 | 页面指针 | Layout
//
// --------------------------------------------------------------------------------

const svgContainerRef = ref();
</script>
