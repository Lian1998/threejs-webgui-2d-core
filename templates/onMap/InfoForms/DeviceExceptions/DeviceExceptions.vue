<template>
  <DynamicForm width="1200" class="device-exceptions-table" :tableHead="DATAHEAD" v-model:tableData="DATALIST">
    <template v-slot:bodyCell="{ text, record, index, column }">
      <template v-if="column.dataIndex === 'solution'">
        <div class="device-exceptions-solution-container">
          <span class="device-exceptions-solution" v-if="Array.isArray(record.solution)" v-for="item of record.solution">
            <a-tooltip>
              <template #title> {{ JSON.stringify(item, null, 2) }} </template>
              <span> {{ item.handleMessage }} </span>
            </a-tooltip>
          </span>
        </div>
      </template>

      <template v-if="column.dataIndex === 'description'">
        <a-tooltip>
          <template #title> {{ record.operator }} </template>
          <span> {{ record.description }} </span>
        </a-tooltip>
      </template>
    </template>
  </DynamicForm>
</template>

<script setup lang="ts">
import DynamicForm from "../_DynamicForm.vue";
import { message } from "ant-design-vue";
import { TableColumnsType } from "ant-design-vue";
import { Ref, ref } from "vue";
import { axiosInstance } from "@2dmapv2/data/initRestfulData";
import { DATALIST, initialization } from ".";

const DATAHEAD: Ref<TableColumnsType> = ref<TableColumnsType>([
  {
    title: "故障编号",
    dataIndex: "exceptionRecorderId",
    key: "exceptionRecorderId",
    width: 120,
    align: "center",
  },
  {
    title: "设备号",
    dataIndex: "cheId",
    key: "cheId",
    width: 140,
    align: "center",
  },
  {
    title: "设备类型",
    dataIndex: "type",
    key: "type",
    width: 100,
    align: "center",
  },
  {
    title: "故障等级",
    dataIndex: "level",
    key: "level",
    width: 100,
    align: "center",
  },
  {
    title: "故障发生时间",
    dataIndex: "createTime",
    key: "createTime",
    width: 250,
    align: "center",
  },
  {
    title: "故障描述",
    dataIndex: "description",
    key: "description",
    width: 170,
    ellipsis: true,
    align: "center",
  },
  {
    title: "故障解决方案",
    dataIndex: "solution",
    width: 170,
    align: "left",
  },
]);

defineExpose({
  onOpenInfoCard: (data: any) => {
    initialization();
  },
  onCloseInfoCard: () => {},
  setTitle: () => {
    return `告警信息`;
  },
} as InfoCardDefaultSlot);

// ================================================================
// 操作
// ================================================================
</script>

<style lang="scss">
.device-exceptions-table {
  padding-top: 40px;

  .options {
    display: flex;
    justify-content: center;
    align-items: center;

    .options-cell {
      margin: 0px 5px;
    }
  }

  .device-exceptions-solution-container {
    width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }
  .device-exceptions-solution {
    margin: 5px;
    padding: 2px 10px;
    background-color: #eee;
    border: 1px solid #888;
    border-radius: 2px;
  }
}
</style>
