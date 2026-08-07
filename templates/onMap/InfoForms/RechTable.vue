<template>
  <DynamicForm class="rech-table" :tableHead="DATAHEAD" v-model:tableData="DATALIST">
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
      <template v-if="column.dataIndex === 'inService'">
        <div class="svg-cell">
          <SvgIcon v-if="text === 'YES'" size="16" name="status-tables-servicenable" />
          <SvgIcon v-if="text === 'NO'" size="16" name="status-tables-servicedisable" />
          {{ text }}
        </div>
      </template>
      <template v-if="column.dataIndex === 'enable'">
        <div class="svg-cell">
          <SvgIcon v-if="text === 'YES'" size="16" name="status-tables-schedulenable" />
          <SvgIcon v-if="text === 'NO'" size="16" name="status-tables-scheduledisable" />
          {{ text }}
        </div>
      </template>
      <template v-if="column.dataIndex === 'options'">
        <div class="options-cell">
          <span @click="click1(record)">调度{{ record.enable === "NO" ? "启用" : "禁用" }}</span>
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
    location: string;
    inService: string;
    enable: string;
    updated: string;
    ahtId: string;
  }[]
> = ref([]);

const DATAHEAD: Ref<TableColumnsType> = ref<TableColumnsType>([
  {
    title: "充电位编号",
    dataIndex: "location",
    key: "location",
    fixed: "left",
    width: 100,
  },
  {
    title: "服务状态",
    dataIndex: "inService",
    key: "inService",
    width: 100,
  },
  {
    title: "更新时间",
    dataIndex: "updated",
    key: "updated",
    width: 150,
  },
  {
    title: "IGV编号",
    dataIndex: "ahtId",
    key: "ahtId",
    width: 100,
  },
  {
    title: "调度状态",
    dataIndex: "enable",
    key: "enable",
    width: 100,
  },
  {
    title: "操作",
    dataIndex: "options",
    key: "options",
    width: 80,
    fixed: "right",
  },
]);

defineExpose({
  onOpenInfoCard: (data: any) => {
    initialization();
  },
  onCloseInfoCard: () => {},
  setTitle: () => {
    return `充电位管理`;
  },
} as InfoCardDefaultSlot);

const getList = () => {
  return axiosInstance.get({ url: `/ecs-interface/rech-operational-control/selectList` });
};

const getItem = (id) => {
  return axiosInstance.get({
    url: `/ecs-interface/rech-operational-control/select`,
    params: { location: id },
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
        response["ahtId"] = response.ahtId ? response.ahtId : "";
        response["updated"] = response.updated ? response.updated : "";
        DATALIST.value.push(response);
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
          if (item.type === "RECHARGE") {
            item["ahtId"] = item.ahtId ? item.ahtId : "";
            item["updated"] = item.updated ? item.updated : "";
            DATALIST.value.push(item);
          }
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

const setEnable = (params) => {
  return axiosInstance.post({
    url: `/ecs-interface/rech-operational-control/setEnable`,
    data: params,
  });
};

const click1 = (record) => {
  setEnable({
    rechId: record.location,
    setValue: record.enable === "YES" ? "NO" : "YES",
  })
    .then((response) => {
      if (response) {
        message.success(record.enable === "YES" ? "已成功设置调度可用" : "已成功设置调度不可用");
        initialization(); // 重新请求一下表格
      } else {
        message.error("设置调度失败");
      }
    })
    .catch((err) => {
      message.error("设置调度失败");
    });
};
</script>

<style lang="scss">
.rech-table {
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
