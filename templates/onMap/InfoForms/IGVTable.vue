<template>
  <DynamicForm class="igv-table" :tableHead="DATAHEAD" v-model:tableData="DATALIST">
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
      <template v-if="column.dataIndex === 'ahtCommunication'">
        {{ record.ahtCommunication === "1" ? "在线" : "不在线" }}
      </template>

      <template v-if="column.dataIndex === 'local'">
        <div class="svg-cell">
          <SvgIcon v-if="record.local" color="#004898" size="20" name="status-tables-igvlocal" />
          <SvgIcon v-else color="#aaaaaa" size="20" name="status-tables-igvlocal" />
        </div>
      </template>
      <template v-if="column.dataIndex === 'auto'">
        <div class="svg-cell">
          <SvgIcon v-if="record.auto" color="#004898" size="20" name="status-tables-igvauto" />
          <SvgIcon v-else color="#aaaaaa" size="20" name="status-tables-igvauto" />
        </div>
      </template>
      <template v-if="column.dataIndex === 'remote'">
        <div class="svg-cell">
          <SvgIcon v-if="record.remote" color="#004898" size="20" name="status-tables-igvremote" />
          <SvgIcon v-else color="#aaaaaa" size="20" name="status-tables-igvremote" />
        </div>
      </template>
      <template v-if="column.dataIndex === 'options'">
        <div class="options-cell">
          <span @click="click1(record)">{{ record.pauseState === "False" ? "暂停IGV" : "取消暂停" }}</span>
          <span @click="click2(record)">{{ record.ahtFleet === "NO" ? "加入车队" : "移出车队" }}</span>
          <span @click="click3(record)">{{ record.charging === "1" ? "中止充电" : "一键充电" }}</span>
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

const DATALIST: Ref<
  {
    cheId: string;
    remainingFuel: number;
    ahtCommunication: string;
    controlMode?: string;
    local: boolean;
    auto: boolean;
    remote: boolean;
    pauseState: string;
    emgStopStatus: string;
    ahtFleet: string;
    ecsExceptionStatus: string;
    locationX: number;
    locationY: number;
    heading: number;
    charging: string;
    avl4tos: string;
    orderType: string;
    orderId: string;
    commandId: string;
    status: string;
    isCarrying: string;
    containerSize1: string;
    containerSize2: string;
    location: string;
  }[]
> = ref([]);

const DATAHEAD: Ref<TableColumnsType> = ref<TableColumnsType>([
  {
    title: "设备编号",
    dataIndex: "cheId",
    key: "cheId",
    fixed: "left",
    width: 100,
  },
  {
    title: "电池状态",
    dataIndex: "remainingFuel",
    key: "remainingFuel",
    width: 100,
  },
  {
    title: "通信状态",
    dataIndex: "ahtCommunication",
    key: "ahtCommunication",
    width: 100,
  },
  {
    title: "控制断开",
    dataIndex: "status",
    key: "status",
    width: 100,
  },
  {
    title: "本地模式",
    dataIndex: "local",
    key: "local",
    width: 100,
  },
  {
    title: "自动模式",
    dataIndex: "auto",
    key: "auto",
    width: 100,
  },
  {
    title: "远程模式",
    dataIndex: "remote",
    key: "remote",
    width: 100,
  },
  {
    title: "暂停状态",
    dataIndex: "pauseState",
    key: "pauseState",
    width: 100,
  },
  {
    title: "紧停状态",
    dataIndex: "emgStopStatus",
    key: "emgStopStatus",
    width: 100,
  },
  {
    title: "车队状态",
    dataIndex: "ahtFleet",
    key: "ahtFleet",
    width: 100,
  },

  {
    title: "ESC故障",
    dataIndex: "ecsExceptionStatus",
    key: "ecsExceptionStatus",
    width: 100,
  },
  {
    title: "X坐标",
    dataIndex: "locationX",
    key: "locationX",
    width: 100,
  },
  {
    title: "Y坐标",
    dataIndex: "locationY",
    key: "locationY",
    width: 100,
  },
  {
    title: "车头角度",
    dataIndex: "heading",
    key: "heading",
    width: 100,
  },
  {
    title: "运行速度",
    dataIndex: "enable",
    key: "enable",
    width: 100,
  },
  {
    title: "充电状态",
    dataIndex: "charging",
    key: "charging",
    width: 100,
  },
  {
    title: "调度可用",
    dataIndex: "avl4tos",
    key: "avl4tos",
    width: 100,
  },
  {
    title: "任务类型",
    dataIndex: "orderType",
    key: "orderType",
    width: 100,
  },
  {
    title: "OrderID",
    dataIndex: "orderId",
    key: "orderId",
    width: 160,
  },
  {
    title: "CommandId",
    dataIndex: "commandId",
    key: "commandId",
    width: 160,
  },
  {
    title: "任务状态",
    dataIndex: "status",
    key: "status",
    width: 100,
  },
  {
    title: "是否带箱",
    dataIndex: "isCarrying",
    key: "isCarrying",
    width: 100,
  },
  {
    title: "箱1尺寸",
    dataIndex: "containerSize1",
    key: "containerSize1",
    width: 100,
  },
  {
    title: "箱2尺寸",
    dataIndex: "containerSize2",
    key: "containerSize2",
    width: 100,
  },
  {
    title: "逻辑位置",
    dataIndex: "location",
    key: "location",
    width: 140,
  },
  {
    title: "操作",
    dataIndex: "options",
    key: "options",
    width: 250,
    fixed: "right",
  },
]);

defineExpose({
  onOpenInfoCard: (data: any) => {
    initialization();
  },
  onCloseInfoCard: () => {},
  setTitle: () => {
    return `IGV管理`;
  },
} as InfoCardDefaultSlot);

const getList = () => {
  return axiosInstance.get({ url: `/ecs-interface/IGV-CENTRALIZED/selectList` });
};

const getItem = (id) => {
  return axiosInstance.get({
    url: `/ecs-interface/IGV-CENTRALIZED/selectById`,
    params: { cheId: id },
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
        Object.keys(item).forEach((key) => (item[key] = item[key] ? item[key] : ""));
        item.charging = item.charging === "1" ? "充电中" : "未充电";
        item.local = item.controlMode === "LOCAL" ? true : false;
        item.auto = item.controlMode === "AUTO" ? true : false;
        item.remote = item.controlMode === "REMOTE" ? true : false;
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
          Object.keys(item).forEach((key) => (item[key] = item[key] ? item[key] : ""));
          item.charging = item.charging === "1" ? "充电中" : "未充电";
          item.local = item.controlMode === "LOCAL" ? true : false;
          item.auto = item.controlMode === "AUTO" ? true : false;
          item.remote = item.controlMode === "REMOTE" ? true : false;
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

const setIGVPauseStatus = (params) => {
  return axiosInstance.post({
    url: `/ecs-interface/vms-operational-control/setPauseStatus`,
    data: params,
  });
};

const click1 = (record) => {
  setIGVPauseStatus({
    cheId: Number(record.cheId.substring(1)),
    pauseStatus: record.pauseState === "False" ? "1" : "0",
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

const setAGVEnable = (params) => {
  return axiosInstance.post({
    url: `/ecs-interface/vms-operational-control/setEnableIgv`,
    data: params,
  });
};

const click2 = (record) => {
  setAGVEnable({
    cheId: Number(record.cheId.substring(1)),
    enable: record.ahtFleet === "NO" ? true : false,
  })
    .then((response) => {
      if (response) {
        message.success(`${record.ahtFleet === "NO" ? "加入" : "移除"}车队成功`);
        initialization(); // 重新请求一下表格
      } else {
        message.error(`${record.ahtFleet === "NO" ? "加入" : "移除"}车队失败`);
      }
    })
    .catch((err) => {
      message.error(`${record.ahtFleet === "NO" ? "加入" : "移除"}车队失败`);
    });
};

const startIGVChargeOptions = (params) => {
  return axiosInstance.post({
    url: `/ecs-interface/IGV-CENTRALIZED/schRpcMessage`,
    data: params,
  });
};

const endIGVChargeOptions = (params) => {
  return axiosInstance.post({
    url: `/ecs-interface/vms-charger-control/cancelJob`,
    // 取消充电任务: "0", 强制结束充电: "1"
    data: params,
  });
};

const click3 = (record) => {
  if (record.charging === "1") {
    endIGVChargeOptions({
      cheId: record.cheId,
      cancelType: "1",
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
  } else {
    startIGVChargeOptions({
      cheId: record.cheId,
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
  }
};
</script>

<style lang="scss">
.igv-table {
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
