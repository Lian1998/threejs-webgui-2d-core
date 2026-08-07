<template>
  <Tooltip :title="'客户端设置'" @click="click1">
    <div>
      <!-- size="18"  -->
      <SvgIcon size="26" name="mapui-colors" />
    </div>
  </Tooltip>
</template>

<script setup lang="ts">
import "./index.scss";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { Tooltip } from "ant-design-vue";
import { colorConfigurationRef } from "@2dmapv2/onMap/index";

const click1 = () => {
  if (colorConfigurationRef.value) colorConfigurationRef.value.openInfoCard();
};
</script>
