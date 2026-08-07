<template>
  <div id="gui-sider-right">
    <DeviceUsage />
  </div>
</template>
<script setup>
import DeviceUsage from "../SiderComponents/DeviceUsage.vue";
</script>

<style lang="scss">
#gui-container {
  #gui-sider-right {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
  }
}
</style>
