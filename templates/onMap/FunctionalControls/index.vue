<template>
  <div id="functional-controls">
    <div id="functional-controls-controlbutton">
      <SvgIcon name="mapui-fcontrols" size="20" />
    </div>
    <div id="functional-controls-buttons">
      <!-- 
      <a-button type="primary" @click="click1">绘制IGV禁行区</a-button>
      <a-button type="primary" @click="click2">绘制堆场禁行区</a-button> 
      -->
    </div>
  </div>
</template>
<script setup>
import "./index.scss";
import { onMounted } from "vue";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";

import { blockDrawInfoCardRef } from "@2dmapv2/onMap/index";
import { blockDrawInfoCardRef_yard } from "@2dmapv2/onMap/index";

let rootElement = undefined;
let controlButton = undefined;
let tablesButton = undefined;

onMounted(() => {
  rootElement = document.getElementById("gui-functional-controls");
  controlButton = document.getElementById("functional-controls-controlbutton");
  tablesButton = document.getElementById("functional-controls-buttons");

  if (controlButton)
    controlButton.addEventListener("click", () => {
      rootElement.classList.toggle("active");
    });
});

const click1 = () => {
  blockDrawInfoCardRef.value.openInfoCard();
};

const click2 = () => {
  blockDrawInfoCardRef_yard.value.openInfoCard();
};
</script>
