<template>
  <a-tooltip :title="t('2dmapv2.CommonUI.header.logout')" @click="click1">
    <div>
      <SvgIcon size="23" name="mapui-logout" />
    </div>
  </a-tooltip>
</template>

<script setup lang="ts">
import "./index.scss";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { Tooltip as ATooltip } from "ant-design-vue";
import { useUserStore } from "@/store/modules/user";

import { useI18n } from "@/hooks/web/useI18n";

const { t } = useI18n();

const userStore = useUserStore();
const click1 = () => {
  userStore.confirmLoginOut();
};
</script>
