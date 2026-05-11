import "normalize.css";

import { createApp } from "vue";
import Antd from "ant-design-vue";

import { ColorPaletteManager } from "@source/themes/ColorPaletteManager/";
import App from "@source/onMap/index.vue";

export const initialization = async () => {
  ColorPaletteManager.instance.initialization(); // 初始化调色盘插件

  // 挂载vue以及vue的插件
  const app = createApp(App);
  app.use(Antd);
  app.mount("#app");
};

// 初始化WebGUI函数, 找到对应的viewport, 挂载threejs画布
initialization();

window.addEventListener("keyup", (e) => {
  if (e.code !== "KeyP") return;
  ColorPaletteManager.instance.downloadItemsTemplate(); // 导出当前的颜色盘配置
});
