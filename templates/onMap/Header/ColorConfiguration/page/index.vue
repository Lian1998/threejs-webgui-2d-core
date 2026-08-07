<template>
  <div class="color-configuration-page">
    <div class="color-configuration-page-container">
      <div class="buttons">
        <Button @click="click1">亮色配置</Button>
        <Button @click="click2">暗色配置</Button>
      </div>
      <div class="preview">
        <img :src="imgUrl" />
      </div>
    </div>

    <div class="tools">
      <Button type="primary" style="margin-left: 20px" @click="click5">确认</Button>
      <a-popover placement="top">
        <template #content>
          <p style="margin-bottom: 0">清空客户端的颜色配置缓存, 使用最新发布的亮色颜色配置</p>
          <p>(当出现明显的样式问题时, 建议使用此按钮!)</p>
        </template>
        <Button @click="click4">清除缓存</Button>
      </a-popover>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { CONFIG_STRING_MAP } from "@2dmapv2/classes/colorConfig";
import { LS_PREFIX } from "@2dmapv2/classes/colorConfig";
import { clearLocalStorage } from "@2dmapv2/classes/colorConfig";
import { Button } from "ant-design-vue";

const configurations = {
  light: ["light", "/v2/onmap/Light.png", `${LS_PREFIX}default_light`],
  dark: ["dark", "/v2/onmap/Dark.png", `${LS_PREFIX}default_dark`],
};

const targetConfiguration = ref(configurations.light[0]);
const imgUrl = ref(configurations.light[1]);

defineExpose({
  onOpenInfoCard: (data: any) => {
    initialization();
  },
  onCloseInfoCard: () => {},
  setTitle: () => "客户端颜色配置",
} as InfoCardDefaultSlot);

const initialization = () => {
  click1();
  try {
    const localStorageConfiguration = window.localStorage.getItem(`${LS_PREFIX}local`);
    const localStorageConfigurationObject = JSON.parse(localStorageConfiguration);
    const keys = Object.keys(configurations);
    let found = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (found) continue;
      if (localStorageConfigurationObject["NAME"] === configurations[key][0]) {
        targetConfiguration.value = configurations[key][0];
        imgUrl.value = configurations[key][1];
        found = true;
      }
    }
  } catch (err) {}
};

const click1 = () => {
  targetConfiguration.value = configurations.light[0];
  imgUrl.value = configurations.light[1];
};

const click2 = () => {
  targetConfiguration.value = configurations.dark[0];
  imgUrl.value = configurations.dark[1];
};

const click4 = () => {
  clearLocalStorage();
  window.location.reload();
};

const click5 = () => {
  const jsonString = window.localStorage.getItem(configurations[targetConfiguration.value][2]);
  window.localStorage.setItem(`${LS_PREFIX}local`, jsonString);
  window.location.reload();
};
</script>

<style lang="scss">
.color-configuration-page {
  padding: 30px 40px;

  .color-configuration-page-container {
    display: flex;

    .buttons {
      padding-right: 40px;
      display: flex;
      flex-direction: column;

      button {
        margin-bottom: 15px;
      }
    }

    .preview {
      img {
        width: calc(192px * 2.5);
        height: calc(108px * 2.5);
      }
    }
  }

  .tools {
    margin-top: 30px;
    width: 100%;
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
  }
}
</style>
