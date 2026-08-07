<template>
  <div class="base-info-table-container">
    <div class="row" :style="{ lineHeight: calculateRowHeight }">
      <div v-for="item in props.list" :key="item.title" :class="{ column: true, 'table-title-column': item.isTableTitle === true }">
        <div class="column-title" :style="{ minWidth: props.rowTitlewidth + 'px' }">{{ item.title }}</div>

        <!-- 一行多值 -->
        <div class="column-values" v-if="Array.isArray(item.value)">
          <div class="column-value" v-for="(value, index) in item.value" :key="index" :style="calculateRowColumnWidth(item, index)">
            <!-- 一行多值 是标题 -->
            <div class="wrapper" v-if="item.isTableTitle === true">
              <span> {{ value }} </span>
            </div>
            <!-- 一行多值 且不是标题 -->
            <div class="wrapper" v-else>
              <!-- prettier-ignore -->
              <SvgIcon name="mapui-copy"
                  @click="copy(value)" 
                  v-if="calculateCopyButtonShow(item.isColumnCopyable, value)" />
              <a-tooltip :title="value">
                <span @click="() => item?.clickEvent && item.clickEvent(item.value)">{{ value }}</span>
              </a-tooltip>
            </div>
          </div>
        </div>

        <!-- 一行单值 -->
        <div class="column-values" v-else>
          <div class="column-value">
            <!-- 一行单值 是标题 -->
            <div class="wrapper" v-if="item.isTableTitle === true">
              <span> {{ item.value }} </span>
            </div>

            <!-- 一行单值 且不是标题 -->
            <div class="wrapper" v-else>
              <!-- prettier-ignore -->
              <SvgIcon name="mapui-copy"
                  @click="copy(item.value)" 
                  v-if="calculateCopyButtonShow(item.isColumnCopyable, item.value)" />
              <a-tooltip :title="item.value">
                <span @click="() => item?.clickEvent && item.clickEvent(item.value)">{{ item.value }}</span>
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";

import { computed } from "vue";
import { useAttrs } from "vue";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { copy } from "./";

import { Tooltip as ATooltip } from "ant-design-vue";

defineOptions({ name: "BaseInfoTable" });

const attrs = useAttrs() as { isAstWiden: boolean | string };

const props = defineProps({
  list: { type: Array<BaseInfoTableItem> },
  rowTitlewidth: { type: Number, default: 90 }, // 一行中标题的宽度
  rowHeight: { type: Number, default: 34 },
});

/** 动态计算表格的列宽 */
const calculateRowColumnWidth = computed(() => (item: BaseInfoTableItem, index: number) => {
  const howManyColumns = (item.value as string[]).length; // 当前一行数据有多少列?

  // 第一列拓宽
  if (attrs.isAstWiden || attrs.isAstWiden === "true") {
    if (index == 0) return `width: 75%;`;
    else return `width: ${(100 - 75) / (howManyColumns - 1)}%`; // 否则的话平分剩余宽度
  }

  // 正常计算布局
  else return `width: ${100 / howManyColumns}%`;
});

/** 计算行高 */
const calculateRowHeight = computed(() => props.rowHeight + "px");

/** 计算是否显示"复制"按钮 */
const calculateCopyButtonShow = computed(() => (_isColumnCopyable: boolean, _value: string | number) => {
  if (_isColumnCopyable && _value !== "") return true;
  return false;
});
</script>
