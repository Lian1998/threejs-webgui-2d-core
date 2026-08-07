<script lang="ts" setup>
import { computed, unref } from "vue";
import { Tooltip } from "ant-design-vue";
import { useFullscreen } from "@vueuse/core";
import { FullscreenExitOutlined, FullscreenOutlined } from "@ant-design/icons-vue";
import { useI18n } from "@/hooks/web/useI18n";

defineOptions({ name: "MapFullScreen" });

const { t } = useI18n();
const { isFullscreen, toggle } = useFullscreen();

isFullscreen.value = !!document.fullscreenElement;

const getTitle = computed(() => {
  return unref(isFullscreen) ? t("layout.header.tooltipExitFull") : t("layout.header.tooltipEntryFull");
});

window.addEventListener("keydown", (event) => {
  if (event.code === "F11") {
    event.preventDefault();
    toggle();
  }
});
</script>

<template>
  <Tooltip :title="getTitle" placement="bottom" :mouse-enter-delay="0.5">
    <span @click="toggle">
      <FullscreenOutlined v-if="!isFullscreen" />
      <FullscreenExitOutlined v-else />
    </span>
  </Tooltip>
</template>
