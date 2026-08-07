<template>
  <div id="gui-status-tables">
    <div id="status-tables-controlbutton">
      <SvgIcon name="status-tables-status" size="20" />
    </div>
    <div id="status-tables-buttons">
      <!-- 
      <a-button type="primary" @click="click1">充电位</a-button>
      <a-button type="primary" @click="click2">岸桥作业位</a-button>
      <a-button type="primary" @click="click3">禁行区</a-button>
      <a-button type="primary" @click="click4">IGV</a-button>
      <a-button type="primary" @click="click5">QC</a-button>
      <a-button type="primary" @click="click6">任务管理</a-button>
      <a-button type="primary" @click="click7">门禁请求</a-button> 
      -->
    </div>
  </div>
</template>
<script setup>
import "./index.scss";
import { onMounted } from "vue";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { rechTableRef } from "@2dmapv2/onMap/index";
import { qctpTableRef } from "@2dmapv2/onMap/index";
import { blocksTableRef } from "@2dmapv2/onMap/index";
import { igvTableRef } from "@2dmapv2/onMap/index";
import { qcTableRef } from "@2dmapv2/onMap/index";
import { wiTableRef } from "@2dmapv2/onMap/index";
import { doorcontrolTableRef } from "@2dmapv2/onMap/index";

let rootElement = undefined;
let controlButton = undefined;
let tablesButton = undefined;

onMounted(() => {
  rootElement = document.getElementById("gui-status-tables");
  controlButton = document.getElementById("status-tables-controlbutton");
  tablesButton = document.getElementById("status-tables-buttons");

  if (controlButton)
    controlButton.addEventListener("click", () => {
      rootElement.classList.toggle("active");
    });
});

const click1 = () => {
  rechTableRef.value.openInfoCard();
};
const click2 = () => {
  qctpTableRef.value.openInfoCard();
};
const click3 = () => {
  blocksTableRef.value.openInfoCard();
};
const click4 = () => {
  igvTableRef.value.openInfoCard();
};
const click5 = () => {
  qcTableRef.value.openInfoCard();
};
const click6 = () => {
  wiTableRef.value.openInfoCard();
};
const click7 = () => {
  doorcontrolTableRef.value.openInfoCard();
};
</script>
