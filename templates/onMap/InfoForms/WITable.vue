<template>
  <DynamicForm class="wi-table" :tableHead="DATAHEAD" v-model:tableData="DATALIST" :loading="loading">
    <template v-slot:tableHeader>
      <div class="search-box">
        <SvgIcon size="16" name="status-tables-filter" />
        <div class="label">任务查找</div>
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

    <template v-slot:expandedRowRender="{ record }">
      <div class="task-information" v-if="record.ahtOrderDOS.length">
        <div class="title">IGV任务详情</div>
        <div class="info" v-for="(item, index) in record.ahtOrderDOS" :key="index">
          <div class="object-pv" v-for="(property, propertyIndex) in Object.keys(item)" :key="propertyIndex">
            <div class="property">{{ namemap[property] }}:</div>
            <div class="property-value">{{ item[property] }}</div>
          </div>
        </div>
      </div>
      <div class="task-information" v-if="record.ascOrderDOS.length">
        <div class="title">轨道吊任务详情</div>
        <div class="info" v-for="(item, index) in record.ascOrderDOS" :key="index">
          <div class="object-pv" v-for="(property, propertyIndex) in Object.keys(item)" :key="propertyIndex">
            <div class="property">{{ namemap[property] }}:</div>
            <div class="property-value">{{ item[property] }}</div>
          </div>
        </div>
      </div>
      <div class="task-information" v-if="record.qcCommandDOS.length">
        <div class="title">QC任务详情</div>
        <div class="info" v-for="(item, index) in record.qcCommandDOS" :key="index">
          <div class="object-pv" v-for="(property, propertyIndex) in Object.keys(item)" :key="propertyIndex">
            <div class="property">{{ namemap[property] }}:</div>
            <div class="property-value">{{ item[property] }}</div>
          </div>
        </div>
      </div>
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

const loading = ref<boolean>(false);

const namemap = {
  cheId: "设备名称",
  ahtId: "设备名称",
  orderId: "任务编号",
  orderType: "任务类型",
  status: "任务状态",
  plannedDestination: "目标位置",
  containerId1: "箱号1",
  destDoor1: "箱门朝向1",
  containerId2: "箱号2",
  destDoor2: "箱门朝向2",
  commandId: "任务编号",
  containerOrigLocation: "起始位置",
  containerCurrLocation: "当前位置",
  timeMtPickup: "主小车抓箱时间",
  timeMtDropoff: "主小车放箱时间",
  timePtPickup: "平台小车抓箱时间",
  timePtDropoff: "平台小车放箱时间",
  origin: "起始位置",
  created: "计划开始时间",
  plannedcompletionTime: "计划结束时间",
};

const DATALIST = ref<
  {
    key: number;
    ahtOrderDOS: {
      cheId: string; // "V024";
      containerId1: string; // "cid770150019";
      containerId2: string | null; // null;
      destDoor1: string; // "HIGHBOLLARD";
      destDoor2: string | null;
      orderId: string; // "799812061004562432";
      orderType: string; // "DELIVER";
      plannedDestination: string; // "QCTP.QC081.C";
      status: string; // "COMPLETE";
    }[];
    ascOrderDOS: any[];
    qcCommandDOS: {
      cheId: string; // "QC081";
      commandId: string; // "2405061543590281000";
      status: string; // "COMPLETE";
      containerOrigLocation: string; // "AHT.V024.C";
      containerCurrLocation: string; // "VESSEL.MYTEST/005/2021.044.04";
      ahtId: string; // "V024";
      timeMtPickup: string; // "2024-05-06 15:44:13";
      timeMtDropoff: string; // "2024-05-06 15:43:57";
      timePtPickup: string; // "2024-05-06 15:43:57";
      timePtDropoff: string; // "2024-05-06 15:44:05";
    }[];
    containerId: string;
    containerSize: string;
    containerWiRef: string;
    created: string;
    destSlot: string;
    moveKind: string;
    moveStage: string;
    originSlot: string;
    updated: string;
  }[]
>([]);

const DATAHEAD: Ref<TableColumnsType> = ref<TableColumnsType>([
  {
    title: "WI_REF",
    dataIndex: "containerWiRef",
    key: "containerWiRef",
    fixed: "left",
    width: 140,
  },
  {
    title: "箱号",
    dataIndex: "containerId",
    key: "containerId",
    width: 140,
  },
  {
    title: "箱尺寸",
    dataIndex: "containerSize",
    key: "containerSize",
    width: 80,
  },
  {
    title: "任务类型",
    dataIndex: "moveKind",
    key: "moveKind",
    width: 120,
  },
  {
    title: "起始位置",
    dataIndex: "originSlot",
    key: "originSlot",
    width: 240,
  },
  {
    title: "目标位置",
    dataIndex: "destSlot",
    key: "destSlot",
    width: 240,
  },
  {
    title: "更新时间",
    dataIndex: "updated",
    key: "updated",
    width: 150,
  },
  {
    title: "创建时间",
    dataIndex: "created",
    key: "created",
    width: 150,
  },
  {
    title: "任务节点",
    dataIndex: "moveStage",
    key: "moveStage",
    fixed: "right",
    width: 150,
  },
]);

defineExpose({
  onOpenInfoCard: (data: any) => {
    initialization();
  },
  onCloseInfoCard: () => {},
  setTitle: () => {
    return `任务管理`;
  },
} as InfoCardDefaultSlot);

const getList = () => {
  return axiosInstance.get({ url: `/ecs-interface/task-operational-control/selectWIList` });
};

const getItem = (name) => {
  return axiosInstance.get({
    url: `/ecs-interface/task-operational-control/selectTaskList`,
    params: {
      WI: name,
      CTN: name,
    },
  });
};

const onSearch = (searchValue: string) => {
  if (!searchValue) {
    initialization();
    return;
  }
  getItem(searchValue)
    .then((response) => {
      if (Array.isArray(response)) {
        DATALIST.value.length = 0;
        response.forEach((item, index) => {
          item.key = index;
          DATALIST.value.push(item);
        });
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
  loading.value = true;
  getList()
    .then((response) => {
      if (Array.isArray(response)) {
        DATALIST.value.length = 0;
        response.forEach((item, index) => {
          item.key = index;
          DATALIST.value.push(item);
        });
        loading.value = false;
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
</script>

<style lang="scss">
.wi-table {
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

  .task-information {
    margin-top: 10px;
    width: 100%;

    .title {
      width: 100%;
      text-align: center;
      padding: 10px 12px;
      background-color: var(--overlay-background-darker);
      border: 1px solid var(--overlay-border);
    }

    .info {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      border: 1px solid var(--overlay-border);
      border-top: none;
      padding: 15px;

      .object-pv {
        width: 50%;
        display: flex;
        line-height: 1.8;

        .property {
          text-align: right;
          width: 40%;
          padding-right: 10px;
        }

        .property-value {
          width: 60%;
        }
      }
    }
  }
}
</style>
