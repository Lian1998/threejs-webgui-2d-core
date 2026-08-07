<template>
  <div id="gui-layer-controls">
    <a-tooltip overlayClassName="gui-layer-controls" v-for="(configuration, index) in subbuttonConfiguration" trigger="hover">
      <template #title>{{ configuration.title }}</template>
      <template #default>
        <div class="sub-button" :class="subbuttonClassList(index)" @click="subbuttonClicked($event, index)">
          <SvgIcon :name="configuration.iconName" :size="configuration.iconSize ?? 24" />
        </div>
      </template>
    </a-tooltip>

    <div id="main-button" @click="mainbuttonClicked">
      <SvgIcon name="mapui-tvisiability" size="35" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import "./index.scss";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { subbuttonClicked } from "./index";
import { btnControllers } from "./index";
import { computed } from "vue";

const subbuttonClassList = computed(() => (index) => {
  if (btnControllers[index].disabled) {
    return [...btnControllers[index].classList, "disabled"];
  }
  return btnControllers[index].classList;
});

// 使用脚本计算按钮css
// import "./calculate_buttons_style";

const subbuttonConfiguration = [
  // { title: "IGV标签", iconName: "mapui-tlabel", iconSize: 27 },
  // { title: "IGV路径", iconName: "mapui-troute", iconSize: 25 },
  // { title: "基站信号", iconName: "mapui-tsignalb", iconSize: 30 },
  // { title: "禁行区", iconName: "mapui-tblock", iconSize: 27 },
  // { title: "QC岸桥循环方向", iconName: "mapui-tcycle" },
];

const mainbuttonClicked = () => {
  const selector = document.querySelector("#gui-layer-controls");
  if (selector) selector.classList.toggle("open");
};
</script>

<style>
.ant-tooltip.gui-layer-controls {
  pointer-events: none;
}
</style>
