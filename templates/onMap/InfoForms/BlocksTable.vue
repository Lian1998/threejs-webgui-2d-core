<template>
  <DynamicForm class="blocks-table" :tableHead="DATAHEAD" v-model:tableData="DATALIST">
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
          <span @click="click1(record)">删除</span>
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

const TYPE_MAPPING = {
  0: "未知",
  1: "GuI立即",
  2: "VMS自动生成",
  3: "Ecs预定义延时",
  4: "Tos预定义延时",
  5: "Asc过街",
  6: "Ecs预定义立即",
  7: 'Tos自定义立即"',
  8: "GuI延时",
  9: "门禁预定义",
};

const STATE_MAPPING = {
  "0": "未启用",
  "1": "已申请启用",
  "2": "有车，待人工操作",
  "3": "人工已确认，待生效",
  "4": "已生效",
  "5": "已删除",
};

const DATALIST: Ref<
  {
    id: string;
    relationArea: string;
    type: string;
    state: string;
    createUser: string;
    reason: string;
    createTime: string;
    remark: string;
    updateTime: string;
    updateUser: string;
    options: string;
  }[]
> = ref([]);

const DATAHEAD: Ref<TableColumnsType> = ref<TableColumnsType>([
  {
    title: "编号",
    dataIndex: "id",
    key: "id",
    fixed: "left",
    width: 100,
  },
  {
    title: "范围",
    dataIndex: "relationArea",
    key: "relationArea",
    width: 100,
  },
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
    width: 150,
  },
  {
    title: "状态",
    dataIndex: "state",
    key: "state",
    width: 100,
  },
  {
    title: "创建用户",
    dataIndex: "createUser",
    key: "createUser",
    width: 100,
  },
  {
    title: "创建原因",
    dataIndex: "reason",
    key: "reason",
    width: 200,
  },
  {
    title: "创建时间",
    dataIndex: "createTime",
    key: "createTime",
    width: 150,
  },
  {
    title: "备注信息",
    dataIndex: "remark",
    key: "remark",
    width: 100,
  },
  {
    title: "更新时间",
    dataIndex: "updateTime",
    key: "updateTime",
    width: 150,
  },
  {
    title: "更新用户",
    dataIndex: "updateUser",
    key: "updateUser",
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
    return `禁行区管理`;
  },
} as InfoCardDefaultSlot);

const getList = () => {
  return axiosInstance.get({ url: `/ecs-interface/vms-block-area/selectList` });
};

const getItem = (id) => {
  return axiosInstance.get({
    url: `/ecs-interface/vms-block-area/select`,
    params: { id: id },
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
        for (let i = 0; i < response.length; i++) {
          const item = response[i];
          Object.keys(item).forEach((key) => (item[key] ? (item[key] = item[key]) : ""));
          item.type = TYPE_MAPPING[item.type];
          item.state = STATE_MAPPING[item.state];
          DATALIST.value.push(item);
        }
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
      if (response) {
        DATALIST.value.length = 0;
        if (Array.isArray(response)) {
          response.forEach((item) => {
            Object.keys(item).forEach((key) => (item[key] ? (item[key] = item[key]) : ""));
            item.type = TYPE_MAPPING[item.type];
            item.state = STATE_MAPPING[item.state];
            DATALIST.value.push(item);
          });
        }
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

const deleteBlock = (id) => {
  return axiosInstance.delete(
    {
      url: `/ecs-interface/vms-block-area/delete`,
      params: { id: id },
    },
    { joinParamsToUrl: true },
  );
};

const click1 = (record) => {
  if (record["modifiable"] === "False") {
    message.error("该禁行区无法手动更改");
    return;
  }

  deleteBlock(record.id)
    .then((response) => {
      if (response) {
        initialization(); // 重新请求一下表格
        message.success("删除成功");
      } else {
        message.error("删除失败");
      }
    })
    .catch((err) => {
      message.error("删除失败");
    });
};
</script>

<style lang="scss">
.blocks-table {
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
