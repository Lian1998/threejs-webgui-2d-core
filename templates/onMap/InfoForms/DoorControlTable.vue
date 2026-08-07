<template>
  <DynamicForm class="doorcontrol-table" :tableHead="DATAHEAD" v-model:tableData="DATALIST">
    <template v-slot:bodyCell="{ text, record, index, column }">
      <template v-if="column.dataIndex === 'options' && record.finishedTime">
        <div class="options-cell">--</div>
      </template>
      <template v-else-if="column.dataIndex === 'options'">
        <div class="options">
          <div class="options-cell">
            <a-popconfirm title="确定同意吗?" ok-text="是" cancel-text="否" @confirm="click1(record, true)">
              <span href="#">同意</span>
            </a-popconfirm>
          </div>
          /
          <div class="options-cell">
            <a-popconfirm title="确定拒绝吗?" ok-text="是" cancel-text="否" @confirm="click1(record, false)">
              <span href="#">拒绝</span>
            </a-popconfirm>
          </div>
        </div>
      </template>
    </template>
  </DynamicForm>
</template>

<script setup lang="ts">
import DynamicForm from "./_DynamicForm.vue";
import { message } from "ant-design-vue";
import { TableColumnsType } from "ant-design-vue";
import { Ref, ref } from "vue";
import { axiosInstance } from "@2dmapv2/data/initRestfulData";
import { socketioSubModule_statustables as socketioHelper } from "@2dmapv2/data/initWebSocketData";
let subjected = false;

const DATALIST: Ref<
  {
    id: string; // 自定义变量
    requestID: string;
    userID: string;
    doorID: string;
    requestType: string;
    permission: string;
    cardID: string;
    userName: string;
    doorCode: string;
    finishedDoorCode: string;
    createTime: string;
    finishedTime: string;
  }[]
> = ref([]);

const DATAHEAD: Ref<TableColumnsType> = ref<TableColumnsType>([
  {
    title: "requestID",
    dataIndex: "requestID",
    key: "requestID",
    fixed: "left",
    width: 100,
  },
  {
    title: "userID",
    dataIndex: "userID",
    key: "userID",
    width: 100,
  },
  {
    title: "doorID",
    dataIndex: "doorID",
    key: "doorID",
    width: 100,
  },
  {
    title: "requestType",
    dataIndex: "requestType",
    key: "requestType",
    width: 120,
  },
  {
    title: "permission",
    dataIndex: "permission",
    key: "permission",
    width: 120,
  },
  {
    title: "cardID",
    dataIndex: "cardID",
    key: "cardID",
    width: 100,
  },
  {
    title: "userName",
    dataIndex: "userName",
    key: "userName",
    width: 100,
  },
  {
    title: "doorCode",
    dataIndex: "doorCode",
    key: "doorCode",
    width: 150,
  },
  {
    title: "finishedDoorCode",
    dataIndex: "finishedDoorCode",
    key: "finishedDoorCode",
    width: 180,
  },
  {
    title: "createTime",
    dataIndex: "createTime",
    key: "createTime",
    width: 180,
  },

  {
    title: "finishedTime",
    dataIndex: "finishedTime",
    key: "finishedTime",
    width: 180,
  },
  {
    title: "Action",
    dataIndex: "options",
    key: "options",
    width: 150,
    fixed: "right",
  },
]);

defineExpose({
  onOpenInfoCard: (data: any) => {
    initialization();
  },
  onCloseInfoCard: () => {},
  setTitle: () => {
    return `门禁请求管理`;
  },
} as InfoCardDefaultSlot);

const initialization = () => {
  if (!subjected) {
    socketioHelper.registerListener(`DF.DoorControlRequest`, (itemValue) => {
      if (Array.isArray(itemValue)) {
        for (let i = 0; i < itemValue.length; i++) {
          const element = itemValue[i];
          const findIndex = DATALIST.value.findIndex((item) => item.id === element.name);
          const item = element.value;
          item.id = element.name;
          if (findIndex !== -1) DATALIST[i] = item;
          else DATALIST.value.push(item);
        }
      }
    });
    socketioHelper.subReal(undefined, `DF.DoorControlRequest`);
    subjected = true;
  }
};

// ================================================================
// 操作
// ================================================================

const setEnable = (params) => {
  return axiosInstance.post({
    url: `/ecs-interface/door-control/openDoorReply`,
    data: params,
  });
};

const click1 = (record, agree) => {
  setEnable({
    requestId: record.requestId,
    state: agree,
    doorCode: record.doorCode,
  })
    .then((response) => {
      if (response) {
        message.success(agree ? "已同意开启" : "已拒绝开启");
      } else {
        message.error("操作失败");
      }
    })
    .catch((err) => {
      message.error("操作失败");
    });
};
</script>

<style lang="scss">
.doorcontrol-table {
  padding-top: 40px;

  .options {
    display: flex;
    justify-content: center;
    align-items: center;

    .options-cell {
      margin: 0px 5px;
    }
  }
}
</style>
