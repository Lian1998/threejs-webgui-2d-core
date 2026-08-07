<template>
  <div class="vertiview-spreader-container">
    <div class="side-name">海侧</div>
    <div class="layout">
      <div class="layout-view" style="display: flex">
        <Spreader name="MT_WS" class="layout-view" :ref="(e) => spreaderRefs.push(e)" />
        <Spreader name="MT_LS" v-if="false" class="layout-view" />
      </div>
      <div class="spreader-name">主小车</div>
    </div>
    <div class="layout">
      <div class="layout-view" style="display: flex">
        <Spreader name="PF_WS" platformLockName="平台海侧锁头状态" :ref="(e) => spreaderRefs.push(e)" />
        <Spreader name="PF_LS" platformLockName="平台陆侧锁头状态" :ref="(e) => spreaderRefs.push(e)" />
      </div>
      <div class="spreader-name">平台</div>
    </div>
    <div class="layout">
      <Spreader name="PT" class="layout-view" :ref="(e) => spreaderRefs.push(e)" />
      <div class="spreader-name">门架小车</div>
    </div>
    <div class="side-name">陆侧</div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Spreader from "./Spreader.vue";
import { SocketioSubModule } from "@2dmapv2/classes/SocketioHelper";

const spreaderRefs = ref([]);

const updateQcContainers = (response: any) => {
  spreaderRefs.value.forEach((item) => {
    item.updateQcContainers(response);
  });
};

const updatePlatformLocks = (name: string, value: string) => {
  spreaderRefs.value.forEach((item) => {
    item.updatePlatformLocks(name, value);
  });
};

defineExpose({
  resetStatus: (id: string, socketioHelper: SocketioSubModule) => {
    updateQcContainers([]); // 复位集装箱俯视图
    updatePlatformLocks("PF_WS", "grey"); // 复位锁头情况
    updatePlatformLocks("PF_LS", "grey"); // 复位锁头情况

    socketioHelper.registerListener<string>(`DF.QC.${id}.PfLsPadConingStatus`, (itemValue) => {
      updatePlatformLocks("PF_LS", itemValue);
    });

    socketioHelper.registerListener<string>(`DF.QC.${id}.PfWsPadConingStatus`, (itemValue) => {
      updatePlatformLocks("PF_WS", itemValue);
    });

    socketioHelper.registerListener<
      {
        name: "PT_L" | "PT_R" | "MT_WS_L" | "MT_WS_R" | "MT_LS_L" | "MT_LS_R" | "PF_LS_L" | "PF_LS_R" | "PF_WS_L" | "PF_WS_R";
        value: Partial<{
          containerHeightCm: number; // 259;
          containerId: string; // "cid179423258";
          containerLengthCm: number; // 610;
          containerPosition: string; // "中间";
          containerSize: number; // "20";
          containerType: string; // "干货箱";
          containerWeightKg: number; // 20061;
          doorDirection: string; // "高桩";
          moveKind: string; // "卸船";
          moveStage: string; // "作业中";
          pointOfWork: string; // "QC082";
          qcId: string; // "QC082";
        }>;
      }[]
    >(`DF.QC.${id}.QcContainer`, (itemValue) => {
      // console.log(`DF.QC.${id}.QcContainer`, itemValue);
      updateQcContainers(itemValue || []);
    });
  },
});
</script>

<style lang="scss">
.vertiview-spreader-container {
  flex: 0;
  display: flex;
  width: 100%;
  height: 100%;
  padding: 5px;
  min-height: 230px;

  font-size: 0.75rem;
  line-height: 1rem;

  .side-name {
    width: 1rem;
    text-align: center;
    writing-mode: vertical-lr;
  }

  .layout {
    display: flex;
    flex-direction: column;
    margin: 2px;

    .layout-view {
      flex: 1;
    }

    .spreader-name {
      height: 1rem;
      text-align: center;
      width: 100%;
    }
  }
}
</style>
