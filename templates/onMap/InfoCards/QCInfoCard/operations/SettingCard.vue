<template>
  <div class="task-setting-box" style="height: 100%; overflow: auto">
    <div class="row" v-for="(item, index) in qcms_optionList" :key="item.title">
      <div class="row-title">{{ item.title }}</div>
      <div class="row-value">
        <a-select v-model:value="qcms_optionForm[item.key]" style="width: 250px; margin-right: 12px" :options="item.options" />
      </div>
      <div class="row-button">
        <a-button type="primary" :loading="qcms_optionForm[`loading_${item.key}`]" @click="updateQCMSConfig(item.key)">设置</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { qcms_optionList } from "./qcms.data.ts";
import { qcms_optionForm } from "./qcms.data.ts";
import { message } from "ant-design-vue";

import { getQcmsConfig } from "./qcms.operations.ts";
import { setQcmsConfig } from "./qcms.operations.ts";
import { setQcmsConfig_CycleDirection } from "./qcms.operations.ts";
import { setQcmsConfig_QCStatus } from "./qcms.operations.ts";

const idRef = ref();

const openLoading = (key: string) => {
  qcms_optionForm[`loading_${key}`] = true;
};
const closeLoading = (key: string) => {
  setTimeout(() => (qcms_optionForm[`loading_${key}`] = false), 500);
};

const updateQCMSConfig = (key: string) => {
  const id = idRef.value;
  openLoading(key);
  // 循环方向
  if (key === "cicle_direction") {
    setQcmsConfig_CycleDirection({ qcName: id, cycle: qcms_optionForm[key] })
      .then((res) => {
        message.success("设置成功");
      })
      .finally(() => closeLoading(key));
  }
  // 状态设置
  else if (key === "qc_status") {
    setQcmsConfig_QCStatus({ qcName: id, enable: qcms_optionForm[key] })
      .then((res) => {
        message.success("设置成功");
      })
      .finally(() => closeLoading(key));
  }
  // 配置值设置
  else {
    setQcmsConfig({ qcId: id, setKey: key, setValue: qcms_optionForm[key] })
      .then((res) => {
        message.success("设置成功");
      })
      .finally(() => closeLoading(key));
  }
};

const initialization = (id: string) => {
  return;
  getQcmsConfig({ qcId: id }).then((response) => {
    if (!Array.isArray(response)) return;
    for (let i = 0; i < response.length; i++) {
      const configObject = response[i];
      // 比较特殊的
      if (i === 0) {
        // 循环方向
        const findOption1 = qcms_optionList.value[0].options.find((item) => item.label === configObject["cycle"]);
        if (findOption1) qcms_optionForm["cicle_direction"] = findOption1.value;
        // QC可用状态
        if ((configObject["enable"] as string)?.toLowerCase() === "yes") qcms_optionForm["qc_status"] = "true";
        else qcms_optionForm["qc_status"] = "false";
      }
      const optionIndex = qcms_optionList.value.findIndex((item) => item.key === configObject["serviceCfg"]);
      if (optionIndex === -1) break;
      const option = qcms_optionList.value[optionIndex];
      qcms_optionForm[option.key] = configObject["serviceValue"];
    }
  });
};

defineExpose({
  resetStatus: (id: string) => {
    initialization(id);
  },
});
</script>

<style scoped lang="scss">
.task-setting-box {
  margin: 0;
  padding: 10px;
  display: flex;
  flex-direction: column;

  .row {
    display: flex;
    align-items: center;
    margin: 5px;

    .row-title {
      text-align: right;
    }

    .row-value {
      margin-left: auto;
    }

    .row-button {
      width: 120px;
    }
  }

  .ant-select {
    .ant-select:not(.ant-select-customize-input) .ant-select-selector {
      background: transparent;
    }

    .row {
      display: flex;
    }

    .ant-select-selector {
      .ant-select-selection-item {
        color: var(--overlay-font) !important;
      }
    }
  }
}
</style>
