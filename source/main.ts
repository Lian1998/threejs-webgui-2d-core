import "normalize.css";

import { createApp } from "vue";
import Antd from "ant-design-vue";

import { ColorPaletteManager } from "@source/themes/ColorPaletteManager/";
import App from "@source/onMap/index.vue";

// dayjs汉化
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");

export const init = async () => {
  ColorPaletteManager.instance.init(); // 初始化调色盘插件
  console.warn(
    "按下'P'键下载当前的颜色盘配置...",
    (() => {
      window.addEventListener("keydown", (e) => {
        if (e.code === "KeyP") ColorPaletteManager.instance.downloadItemsTemplate();
      });
      return ColorPaletteManager.instance.itemsMap;
    })(),
  );

  // 挂载vue以及vue的插件
  const app = createApp(App);
  app.use(Antd);
  app.mount("#app");
};

// 初始化WebGUI函数, 找到对应的viewport, 挂载threejs画布
init();
