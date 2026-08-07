<template>
  <DynamicForm class="qc-table" :tableHead="DATAHEAD" v-model:tableData="DATALIST">
    <template v-slot:tableHeader>
      <div class="search-box">
        <SvgIcon size="16" name="status-tables-filter" />
        <div class="label">设备查找</div>
        <a-input-search placeholder="请输入" style="width: 200px" @search="onSearch" />
        <a-button class="refresh" type="primary" @click="onRefresh">刷新</a-button>
      </div>
    </template>
    <template v-slot:headerCell="{ title, column }">
      <template v-if="column.dataIndex === 'options'">
        <div class="options-cell">
          {{ title }}
        </div>
      </template>
    </template>
    <template v-slot:bodyCell="{ text, record, index, column }">
      <template v-if="column.dataIndex === 'options'">
        <div class="options-cell">
          <a-select ref="select" v-model:value="record.selectValue" style="width: 200px">
            <a-select-option value="0">ANTI_CLOCK_BOTH</a-select-option>
            <a-select-option value="1">ANTI_CLOCK_AND_CLOCK</a-select-option>
            <a-select-option value="2">CLOCK_BOTH</a-select-option>
            <a-select-option value="3">CLOCK_AND_ANTI_CLOCK</a-select-option>
          </a-select>
          <span type="text" @click="click1(record)">设置循环方向</span>
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
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";

const QCCYCLE_MAPPING = {
  ANTI_CLOCK_BOTH: "0",
  ANTI_CLOCK_AND_CLOCK: "1",
  CLOCK_BOTH: "2",
  CLOCK_AND_ANTI_CLOCK: "3",
};

const DATALIST: Ref<
  {
    qcId: string;
    qcCommunication: string;
    lashingStatus: string;
    gantryAnchorStatus: string;
    trollyAnchorStatus: string;
    emgStopStatus: string;
    ecsExceptionStatus: string;
    tosExceptionStatus: string;
    moveKind: string;
    heartBeat: string;
    currentBay: string;
    qcCycle: string;
    options: string;
  }[]
> = ref([]);

const DATAHEAD: Ref<TableColumnsType> = ref<TableColumnsType>([
  {
    title: "设备编号",
    dataIndex: "qcId",
    key: "qcId",
    fixed: "left",
    width: 100,
  },
  {
    title: "通信状态",
    dataIndex: "qcCommunication",
    key: "qcCommunication",
    width: 100,
  },
  {
    title: "绑扎状态",
    dataIndex: "lashingStatus",
    key: "lashingStatus",
    width: 100,
  },
  {
    title: "大车锚定",
    dataIndex: "gantryAnchorStatus",
    key: "gantryAnchorStatus",
    width: 100,
  },
  {
    title: "小车锚定",
    dataIndex: "trollyAnchorStatus",
    key: "trollyAnchorStatus",
    width: 100,
  },
  {
    title: "紧停状态",
    dataIndex: "emgStopStatus",
    key: "emgStopStatus",
    width: 100,
  },
  {
    title: "TOS故障",
    dataIndex: "tosExceptionStatus",
    key: "tosExceptionStatus",
    width: 100,
  },
  {
    title: "ESC故障",
    dataIndex: "ecsExceptionStatus",
    key: "ecsExceptionStatus",
    width: 100,
  },
  {
    title: "装卸类型",
    dataIndex: "moveKind",
    key: "moveKind",
    width: 100,
  },
  {
    title: "心跳数值",
    dataIndex: "heartBeat",
    key: "heartBeat",
    width: 100,
  },
  {
    title: "当前贝位",
    dataIndex: "currentBay",
    key: "currentBay",
    width: 100,
  },
  { title: "循环方向", dataIndex: "options", key: "options", width: 350 },
  // { title: "循环方向", dataIndex: "qcCycle", key: "qcCycle", width: 180 },
  // { title: "操作", dataIndex: "options", key: "options", width: 350 },
]);

defineExpose({
  onOpenInfoCard: (data: any) => {
    initialization();
  },
  onCloseInfoCard: () => {},
  setTitle: () => {
    return `QC管理`;
  },
} as InfoCardDefaultSlot);

const getList = () => {
  return axiosInstance.get({ url: `/ecs-interface/QC-CENTRALIZED/selectList` });
};

const getItem = (id) => {
  return axiosInstance.get({
    url: `/ecs-interface/QC-CENTRALIZED/selectById`,
    params: { qcId: id },
  });
};

const onSearch = (searchValue: string) => {
  if (!searchValue) {
    initialization();
    return;
  }
  getItem(searchValue)
    .then((response) => {
      if (response) {
        DATALIST.value.length = 0;
        const item = response;
        item.selectValue = QCCYCLE_MAPPING[item["qcCycle"]];
        DATALIST.value.push(item);
      } else {
        message.error("查询失败");
      }
    })
    .catch((err) => {
      message.error("查询失败");
    });
};

const onRefresh = () => {
  initialization();
};

const initialization = () => {
  getList()
    .then((response) => {
      if (Array.isArray(response)) {
        DATALIST.value.length = 0;
        response.forEach((item) => {
          item.selectValue = QCCYCLE_MAPPING[item["qcCycle"]];
          DATALIST.value.push(item);
        });
      } else {
        message.error("获取数据失败");
      }
    })
    .catch((err) => {
      message.error("获取数据失败");
    });
};

// ================================================================
// 操作
// ================================================================

const setQCCycleStatus = (params) => {
  return axiosInstance.post({
    url: `/ecs-interface/IGV-CENTRALIZED/schRpcMessage`,
    data: params,
  });
};

const click1 = (record) => {
  setQCCycleStatus({
    qcName: record.qcId,
    cycle: Number(record.selectValue),
  })
    .then((response) => {
      if (response) {
        message.success("设置成功");
        initialization(); // 重新请求一下表格
      } else {
        message.error("设置失败");
      }
    })
    .catch((err) => {
      message.error("设置失败");
    });
};
</script>

<style lang="scss">
.qc-table {
  .search-box {
    display: flex;
    align-items: center;

    .label {
      padding: 0 10px;
    }

    .refresh {
      margin-left: auto;
    }
  }
}
</style>
