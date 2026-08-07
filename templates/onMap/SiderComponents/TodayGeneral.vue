<template>
  <SiderComponent class="today-general">
    <template v-slot:title>
      <div class="title"> 当天作业情况 </div>
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

const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"];
const chartRef = ref(undefined);
const option = {
  color: [colors[2], colors[1]],
  textStyle: { color: "#ffffff" },
  tooltip: { trigger: "item" },
  legend: {
    selectedMode: false,
    bottom: "0%",
    left: "center",
    textStyle: { color: "#ffffff" },
  },
  series: [
    {
      type: "pie",
      name: "当天作业情况",
      center: ["50%", "80%"],
      radius: ["100%", "140%"],
      startAngle: 182,
      endAngle: 358,
      padAngle: 2,
      itemStyle: { borderRadius: 5 },
      label: { show: false, position: "center" },
      emphasis: { show: false },
      labelLine: { show: false },
      data: [
        { value: 1, name: "装船" },
        { value: 1, name: "卸船" },
      ],
    },
  ],
};

onMounted(() => {
  const myChart = echarts.init(chartRef.value);
  window.addEventListener("resize", () => myChart.resize());
  myChart.setOption(option);

  const data = option.series[0].data;
  socketioHelper.registerListener<
    {
      moveKind: "DSCH" | "LOAD";
      count: number;
    }[]
  >("DF.StatisticsMoveKindTask", (itemValue) => {
    if (!Array.isArray(itemValue)) return;
    for (let i = 0; i < itemValue.length; i++) {
      const element = itemValue[i];

      // 装船
      if (element.moveKind === "LOAD") {
        data[0].value = element.count;
        continue;
      }
      // 卸船
      else if (element.moveKind === "DSCH") {
        data[1].value = element.count;
        continue;
      }
    }

    if (myChart) myChart.setOption({ series: [{ data: data }] }, false);
  });
  socketioHelper.subReal(undefined, "DF.StatisticsMoveKindTask");
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
