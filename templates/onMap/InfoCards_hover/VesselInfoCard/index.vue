<template>
  <div class="vessel-info-card">
    <div v-for="item in infoList" :key="item.subject" class="row">
      <div class="title">{{ item.title }}:</div>
      <div class="value">{{ item.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

type VesselInfoItem = {
  title: string;
  subject: string;
  value: string;
};

const infoList = ref<VesselInfoItem[]>([
  { title: "船舶艘次", subject: "vesselVisit", value: "" },
  { title: "船舶呼号", subject: "vesselCallSign", value: "" },
  { title: "船舶代码", subject: "vesselCode", value: "" },
  { title: "船头缆桩", subject: "bowBollard", value: "" },
  { title: "船头偏移(cm)", subject: "bowBollardOffsetCm", value: "" },
  { title: "船尾缆桩", subject: "sternBollard", value: "" },
  { title: "船尾偏移(cm)", subject: "sternBollardOffsetCm", value: "" },
  { title: "船舶分类", subject: "vesselClassification", value: "" },
  { title: "船舶作业阶段", subject: "vesselVisitPhase", value: "" },
  { title: "靠泊方式", subject: "berthingMode", value: "" },
  { title: "卸船操作模式", subject: "discOperMode", value: "" },
  { title: "装船操作模式", subject: "loadOperMode", value: "" },
  { title: "卸船作业模式", subject: "discWorkMode", value: "" },
  { title: "贝位顺序模式", subject: "baySequenceMode", value: "" },
  { title: "泊位号", subject: "berthingNo", value: "" },
  { title: "更新时间", subject: "updated", value: "" },
]);

defineExpose({
  onOpenInfoCard: (data: Record<string, unknown>) => {
    infoList.value.forEach((item) => {
      const value = data?.[item.subject];
      item.value = value === undefined || value === null ? "" : String(value);
    });
  },
  onCloseInfoCard: () => {},
} as InfoCardDefaultSlot);
</script>

<style lang="scss">
.vessel-info-card {
  padding: 4px 0;

  .row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin: 5px 8px;
    line-height: 16px;

    .title {
      flex-shrink: 0;
    }

    .value {
      max-width: 150px;
      overflow-wrap: anywhere;
      text-align: right;
    }
  }
}
</style>
