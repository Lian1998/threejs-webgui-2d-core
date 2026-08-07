<template>
  <div class="container-info-card" :ref="(e: HTMLDivElement) => (rootElement = e)">
    <template v-for="item of infoList1">
      <div class="row" v-if="!item.isTableTitle">
        <div class="title">{{ item.title }}:</div>
        <div class="value">
          {{ item.value }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onMounted } from "vue";
import { getAccValue } from "@2dmapv2/classes/DataHelper.js";
import { findBaseXItem } from "@2dmapv2/classes/DataHelper.js";
import { resetBaseInfoTable } from "@2dmapv2/classes/DataHelper.js";

import infoList1Data from "./index.data";

let rootElement = undefined;
const infoList1 = ref<BaseInfoTableItem[]>([]);

defineExpose({
  onOpenInfoCard: (data) => {
    Object.keys(data).forEach((key) => {
      const baseInfoTableItem = findBaseXItem<BaseInfoTableItem>(infoList1.value, key);
      if (baseInfoTableItem) baseInfoTableItem.value = data[key];
    });
  },
  onCloseInfoCard: () => {},
} as InfoCardDefaultSlot);

onMounted(() => {
  infoList1.value.push(...infoList1Data());

  const father = rootElement.parentNode as HTMLDivElement;
  father.style.zIndex = "997";
});
</script>

<style lang="scss">
.container-info-card {
  .row {
    margin: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title {
    }

    .values {
      flex-grow: 1;
      max-width: unset;
      margin-left: 0px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      .value {
        flex-grow: 1;
      }
    }

    .value {
      margin-left: 12px;
      max-width: 80px;
      text-align: right;
      line-height: 12px;
    }
  }
}
</style>
