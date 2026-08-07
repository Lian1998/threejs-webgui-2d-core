<template>
  <SiderComponent class="today-general">
    <template v-slot:title>
      <div class="title"> 今日岸桥效率 </div>
    </template>
    <template v-slot:content>
      <div ref="chartRef" class="a-echarts"></div>
    </template>
  </SiderComponent>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as echarts from "echarts";
import SiderComponent from "./_SiderComponent.vue";
import { socketioSubModule_datascreen as socketioHelper } from "@2dmapv2/data/initWebSocketData";

const chartRef = ref(undefined);
const option = {
  textStyle: { color: "#ffffff" },
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category",
    data: ["总效率", "净效率", "毛效率"],
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      data: [36, 35, 32],
      type: "bar",
    },
  ],
};

onMounted(() => {
  const myChart = echarts.init(chartRef.value);
  window.addEventListener("resize", () => myChart.resize());
  myChart.setOption(option);

  const data = option.series[0].data;
});
</script>

<style lang="scss">
.today-general {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
