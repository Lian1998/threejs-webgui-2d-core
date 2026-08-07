<template>
  <div id="gui-header">
    <!-- 标题 -->
    <div class="logos">
      <img src="/header-logo.jpg" />
      <div class="title"> {{ t("2dmapv2.CommonUI.title") }} </div>
    </div>

    <!-- 目录 -->
    <div class="menus">
      <div class="menus-item" v-for="menu in menus" @click="handleMenuClicked(menu)">
        {{ menu.title }}
      </div>
    </div>

    <div class="header-right">
      <!-- 搜索框 -->

      <div class="searcher">
        <a-input-group compact>
          <a-select v-model:value="deviceType" @change="onSelectDeviceType">
            <a-select-option value="IGV">IGV</a-select-option>
            <a-select-option value="QC">QC</a-select-option>
            <a-select-option value="YC">YC</a-select-option>
            <a-select-option value="TRUCK">TRUCK</a-select-option>
          </a-select>
          <a-select style="width: 150px" :options="deviceOptions" v-model:value="deviceNo" :allowClear="true" placeholder="请选择设备" @change="onSelectDevice" show-search />
        </a-input-group>
      </div>

      <!-- 按钮 -->
      <div class="tools">
        <UserDropDownOpen class="user-dropdown" />
        <!-- <DeviceExcepitonAlarm class="device-exception-alarm" /> -->
        <ColorConfiguration class="color-configuration" />
        <FullScreen class="full-screen" />
      </div>
    </div>
  </div>
</template>

<script setup>
import "./index.scss";
// import { getMenus } from "@/router/menus";
import { onMounted, ref } from "vue";
import FullScreen from "./full-screen/index.vue";
import UserDropDownOpen from "./user-dropdown-open/index.vue";
import ColorConfiguration from "./ColorConfiguration/index.vue";

import { router } from "@/router";
import { useI18n } from "@/hooks/web/useI18n";

import { IGVMap } from "@2dmapv2/data/";
import { deviceOptions } from "./index";
import { deviceType } from "./index";
import { deviceNo } from "./index";
import { onSelectDeviceType } from "./index";
import { onSelectDevice } from "./index";

const { t } = useI18n();
const menus = ref([]);

const handleMenuClicked = (menu) => {
  window.open(menu.path);
};

onMounted(() => {
  // 需要初始化 yudao permissionRoutes
  // getMenus().then((response) => {
  //   if (Array.isArray(response)) {
  //     response.forEach((item) => { // 对目录进行过滤, 看需要显示哪些
  //        menus.value.push(item);
  //     });
  //   }
  // });

  menus.value.push({ title: t("2dmapv2.CommonUI.menus.home"), path: "/index.html" });

  const intervalTask = setInterval(() => {
    if (IGVMap.size > 0) {
      deviceType.value = "IGV";
      onSelectDeviceType();
      clearInterval(intervalTask);
    }
  }, 500);
});
</script>
