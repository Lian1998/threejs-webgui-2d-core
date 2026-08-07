<template>
  <div>
    <span class="label">{{ t("component.table.settingColumn") }}</span>
    <Popover placement="bottomLeft" trigger="click">
      <template #content>
        <Tree class="column-setting-tree" style="width: 100%; height: 300px; overflow: auto" :tree-data="columnsOptions" v-model:checkedKeys="checkedList" :checkable="true" :default-expand-all="true" @check="onChange">
          <template #title="{ title }">
            <span>{{ title }}</span>
          </template>
        </Tree>
      </template>
      <SettingOutlined />
    </Popover>
  </div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { ref } from "vue";
import { nextTick } from "vue";
import { Popover } from "ant-design-vue";
import { Tree } from "ant-design-vue";
import { Tooltip } from "ant-design-vue";
import { SettingOutlined } from "@ant-design/icons-vue";
import { TableColumnsType } from "ant-design-vue";

import { useI18n } from "@/hooks/web/useI18n";

let dataHead = undefined;
const _dataHeadIn = [];

defineExpose({
  setContext: (dataHeadIn: Ref<TableColumnsType>) => {
    dataHead = dataHeadIn;
    columnsOptions.value.length = 0;
    checkedList.value.length = 0;
    _dataHeadIn.length = 0;

    if (Array.isArray(dataHead.value)) {
      // 缓存原始值
      Array.prototype.push.apply(_dataHeadIn, dataHead.value);

      // 生成树选项
      (dataHead.value as TableColumnsType).forEach((item) => {
        columnsOptions.value.push({
          title: item.title,
          key: item.key,
        });

        // 在生成树选项后将所有的选项选中
        checkedList.value.push(item.key);
      });
    }
  },
});

const { t } = useI18n();

const columnsOptions = ref([]);
const checkedList = ref([]);

const onChange = (checkedKeys, e) => {
  const _filtered = _dataHeadIn.filter((item) => checkedKeys.includes(item.key));
  if (Array.isArray(dataHead.value)) {
    dataHead.value.length = 0;
    Array.prototype.push.apply(dataHead.value, _filtered);
  }
};
</script>
