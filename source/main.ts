import "normalize.css";

import { createApp } from "vue";
import Antd from "ant-design-vue";

import { ColorPaletteManager } from "@source/themes/ColorPaletteManager/";
import App from "@source/onMap/index.vue";

export const initializationWebGUI = async () => {
  ColorPaletteManager.instance.initialization();

  const app = createApp(App);
  app.use(Antd);
  app.mount("#app");
};

initializationWebGUI();

window.addEventListener("keyup", (e) => {
  if (e.code !== "KeyP") return;
  ColorPaletteManager.instance.downloadItemsTemplate();
});
