<template>
  <!-- prettier-ignore -->
  <div ref="dynamicFormContainer" class="dynamic-form" :class="sizeAttr" :style="`width: ${dynamicFormWidth}px`">
    <div v-if="slots.tableHeader" class="dynamic-form-header">
      <slot name="tableHeader" v-bind="{ size: sizeAttr }" />
    </div>

    <img ref="dynamicFormResizer" class="resizer" src="/v2/onmap/resizer.svg" />

    <a-table
      ref="dynamicFormTable"
      class="dynamic-form-table"
      size="small"
      :bordered="false"
      :expandFixed="true"
      :scroll="tableScroll"
      :loading="props.tableLoading"
      :pagination="props.tablePagnination"
      :columns="props.tableHead"
      :data-source="props.tableData"
      :rowSelection="props.tableRowSelection"
      :rowKey="props.tableRowKey"
      @expand="props.tableOnExpand"
      @resizeColumn="(width: number, column: TableColumnType) => (column.width = width)">
      <template #headerCell="{ title, column }">
        <slot name="headerCell" v-bind="{ title, column }" />
      </template>

      <template #customFilterDropdown="{ setSelectedKeys, selectedKeys, confirm, clearFilters, column }">
        <slot name="customFilterDropdown" v-bind="{ setSelectedKeys, selectedKeys, confirm, clearFilters, column }" />
      </template>

      <template #bodyCell="{ text, record, index, column }">
        <slot name="bodyCell" v-bind="{ text, record, index, column }" />
      </template>

      <template v-if="slots.expandedRowRender" #expandedRowRender="{ record }">
        <slot name="expandedRowRender" v-bind="{ record }" />
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { onMounted } from "vue";
import { useAttrs } from "vue";
import { reactive } from "vue";
import { nextTick } from "vue";
import { ResizerWindowController } from "./_DynamicForm_ResizerWindowController";
import type { TableColumnType } from "ant-design-vue";
import type { TableProps } from "ant-design-vue";
import { DOMElements } from "@2dmapv2/onMap/index";

// attributes
const { width, size, tableHeight } = useAttrs();
const sizeAttr = size === undefined ? "small" : size;
const dynamicFormWidth = width === undefined ? 750 : width;

// vue property
const props = defineProps({
  tableLoading: Boolean,
  tableHead: { type: Object, default: () => {} },
  tableData: { type: Array, default: () => [] },
  tableRowSelection: {},
  tableRowKey: {},
  tablePagnination: { default: reactive({ showSizeChanger: true }) },
  tableOnExpand: {},
});

// vue slots
const slots = defineSlots();

// dom
const dynamicFormContainer = ref(null);
const dynamicFormResizer = ref(null);
const dynamicFormTable = ref(null);

// dynamic antdv compoennts configuration
const tableScroll = reactive<TableProps["scroll"]>({ y: tableHeight ? (tableHeight as string | number) : 400 });

onMounted(() => {
  nextTick(() => {
    const controller = new ResizerWindowController({ containerEl: dynamicFormContainer.value, resizerEl: dynamicFormResizer.value, tableEl: dynamicFormTable.value }, tableScroll);
  });
});
</script>

<style lang="scss">
// General Style
.dynamic-form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;

  .dynamic-form-header {
    width: 100%;
    padding: 20px 10px;
  }

  .ant-table-wrapper.dynamic-form-table {
    padding-left: 15px;
    padding-right: 15px;
    padding-bottom: 15px;

    .ant-table {
      .ant-table-container {
        border: 1px solid var(--overlay-border);

        .ant-table-cell-fix-left,
        .ant-table-cell-fix-right {
          opacity: 0.9;
        }

        .ant-table-header {
          .options-cell {
            text-align: center;
          }
        }

        .ant-table-body {
          min-height: 400px;

          .ant-table-tbody {
            .ant-table-cell {
              line-height: 1.5;
            }

            .ant-table-cell > .img-status-cell {
              display: flex;
              align-items: center;
              img {
                width: 25px;
              }
            }

            .ant-table-cell > .svg-cell {
              display: flex;
              align-items: center;
            }

            .ant-table-cell > .options-cell {
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: space-evenly;
              color: var(--overlay-primary-color);
            }
          }
        }
      }
    }

    .ant-pagination {
      margin-top: 12px;
      margin-bottom: 0px;
    }
  }

  .resizer {
    width: 15px;
    height: 15px;
    position: absolute;
    bottom: 3px;
    right: 3px;
    cursor: nw-resize;
  }
}

// Small Table
.dynamic-form.small {
  .ant-table.ant-table-small {
    font-size: 12px;

    .ant-table-container {
      .ant-table-body {
        .ant-table-tbody > tr > td {
          padding: 4px 4px;

          .ant-btn.ant-btn-link.ant-btn-sm {
            font-size: 12px;
            margin: 0;
          }
        }
      }
    }
  }
  .dynamic-form-header {
    padding: 10px 10px;
  }
}

.column-setting-tree {
  .ant-tree-list {
    .ant-tree-treenode {
      .ant-tree-switcher {
        display: none;
      }
    }
  }
}
</style>
