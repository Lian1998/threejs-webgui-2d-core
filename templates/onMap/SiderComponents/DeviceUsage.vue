<template>
  <SiderComponent class="device-usage">
    <template v-slot:title>
      <div class="title"> 设备忙闲统计 </div>
    </template>
    <template v-slot:content>
      <div ref="chartRef" class="a-echarts" id="device-usage-echarts"></div>
    </template>
  </SiderComponent>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import SiderComponent from "./_SiderComponent.vue";
import { socketioSubModule_datascreen as socketioHelper } from "@2dmapv2/data/initWebSocketData";

const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"];
const chartRef = ref(undefined);
const option = {
  color: [colors[2], colors[1]],
  textStyle: {
    color: "#ffffff",
  },
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params: EChartsOption["series"]) => {
      const b = params[0].name;
      const c0 = params[0].value;
      const c1 = params[1].value;
      return /*html*/ `
      <div class="tooltip">
        <div class="tooltip-title">${b}</div>
        <div class="tooltip-row">
          <span class="tip" style="background-color: ${colors[1]}"></span>
          <span class="name">设备数量</span>
          <span class="value">${c0 + c1}</span>
        </div>
        <div class="tooltip-row">
          <span class="tip" style="background-color: ${colors[2]}"></span>
          <span class="name">工作中</span>
          <span class="value">${c0}</span>
        </div>
      </div>`;
    },
  },
  grid: {
    left: "0%",
    right: "0%",
    bottom: "10%",
    containLabel: true,
  },
  xAxis: [
    {
      offset: 15,
      type: "category",
      data: ["小车IGV", "岸桥QC", "场桥YC"],
      axisTick: { alignWithLabel: true },
    },
  ],
  yAxis: [
    {
      show: false,
      type: "value",
    },
  ],
  series: [
    {
      type: "bar",
      stack: "total",
      barWidth: "60%",
      data: [1, 1, 1],
    },
    {
      type: "bar",
      stack: "total",
      data: [1, 1, 1],
    },
  ],
};

onMounted(() => {
  const myChart = echarts.init(chartRef.value);
  window.addEventListener("resize", () => myChart.resize());
  myChart.setOption(option);

  const data0 = option.series[0].data;
  const data1 = option.series[1].data;

  socketioHelper.registerListener<
    {
      name: "AHT" | "QC" | "ASC";
      working: number;
      sum: number;
    }[]
  >("DF.StatisticsDeviceTask", (itemValue) => {
    if (!Array.isArray(itemValue)) return;

    for (let i = 0; i < itemValue.length; i++) {
      const element = itemValue[i];
      if (element.name === "AHT") {
        data1[0] = element.sum - element.working;
        data0[0] = element.working;
      } else if (element.name === "QC") {
        data1[1] = element.sum - element.working;
        data0[1] = element.working;
      } else if (element.name === "ASC") {
        data1[2] = element.sum - element.working;
        data0[2] = element.working;
      }
    }
    if (myChart) myChart.setOption({ series: [{ data: data0 }, { data: data1 }] }, false);
  });
  socketioHelper.subReal(undefined, "DF.StatisticsDeviceTask");
});
</script>

<style lang="scss">
.device-usage {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  #device-usage-echarts {
    .tooltip {
      font-size: 14px;
      color: #666;
      font-weight: 400;
      line-height: 1.8;

      .tooltip-title {
        margin-bottom: 5px;
      }

      .tooltip-row {
        width: 120px;
        display: flex;
        align-items: center;

        .tip {
          display: inline-block;
          margin-right: 4px;
          border-radius: 10px;
          width: 10px;
          height: 10px;
        }

        .name {
        }

        .value {
          margin-left: auto;
          font-weight: bolder;
          font-weight: 900;
        }
      }
    }
  }
}
</style>
