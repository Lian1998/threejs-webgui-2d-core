<template>
  <div id="gui-sider-left">
    <TodayGeneral />
    <TodayQCUsageDetails />
  </div>
</template>
<script setup lang="ts">
import TodayGeneral from "../SiderComponents/TodayGeneral.vue";
import TodayQCUsageDetails from "../SiderComponents/TodayQCUsageDetails.vue";
</script>

<style lang="scss">
#gui-container {
  #gui-sider-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
  }
}
</style>
