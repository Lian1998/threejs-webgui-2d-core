<script lang="ts" setup>
import { MenuItem } from "ant-design-vue";
import { PoweroffOutlined, UserOutlined } from "@ant-design/icons-vue";
import { computed, getCurrentInstance } from "vue";

const props = defineProps({
  key: String,
  text: String,
  icon: String,
});

const instance = getCurrentInstance();
const itemKey = computed(() => props.key || instance?.vnode?.props?.key);
const iconComponent = computed(() => (props.icon === "ion:power-outline" ? PoweroffOutlined : UserOutlined));
</script>

<template>
  <MenuItem :key="itemKey">
    <span>
      <component :is="iconComponent" />
      <span>{{ text }}</span>
    </span>
  </MenuItem>
</template>
