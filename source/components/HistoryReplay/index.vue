<template>
  <Tooltip :title="'历史回放'" @click="click1">
    <div>
      <SvgIcon size="24" name="mapui-historyreplay" />
    </div>
  </Tooltip>
</template>

<script setup lang="ts">
import "./index.scss";
import { SvgIcon } from "@/components/Icon";
import { Tooltip } from "ant-design-vue";
import { historyReplayRef } from "@2dmapv2/onMap/index";

const click1 = () => {
  if (historyReplayRef.value) historyReplayRef.value.openInfoCard();
};
</script>
