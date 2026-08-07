import "virtual:svg-icons-register";
import "ant-design-vue/dist/reset.css";
import "./index.scss";

import { createApp } from "vue";
import App from "./onMap/index.vue";
import Antd from "ant-design-vue";

import { initColorConfig } from "@2dmapv2/classes/colorConfig/index";
import { setupStore } from "@/store/index";
import { store } from "@/store/index";
import { setupPermissionDirective } from "@/directives/permission";
import { setupLoadingDirective } from "@/directives/loading";
import { clearObsoleteStorage } from "@/logics/initAppConfig";
import { setupI18n } from "@/locales/setupI18n";
import { useI18n } from "@/hooks/web/useI18n";
import { setupI18nWithout } from "@/locales/setupI18n";
import { i18n } from "@/locales/setupI18n";
import { usePermission } from "@/hooks/web/usePermission";

import { useUserStoreWithOut } from "@/store/modules/user";
import { useLocaleStoreWithOut } from "@/store/modules/locale";
import { usePermissionStoreWithOut } from "@/store/modules/permission";
import { useAppStore } from "@/store/modules/app";
import { PermissionModeEnum } from "@/enums/appEnum";
import { isAuth } from "@2dmapv2/onMap/directives";

import { useDictStoreWithOut } from "@/store/modules/dict";

initColorConfig();

const initializationDataScreen = async () => {
  const localeStore = useLocaleStoreWithOut();
  console.warn("localeStore.getLocale", localeStore.getLocale); // 打印基于i18n的国际化信息, 便于后续debug
  localeStore.initLocale();
  await setupI18nWithout(); // 多语言配置, 调用 createI18nOptions 获取配置文件

  const userStore = useUserStoreWithOut();
  // 使用 userStore.getAccessToken 请求接口 获取 userInfo
  await userStore.getUserInfoAction();
  const userInfo = userStore.getUserInfo;
  console.warn("userStore.getUserInfo", userInfo); // 打印用户信息, 便于后续debug
  if (userInfo.user === undefined) await userStore.logout(true);

  // 字典值打印
  const dictStore = useDictStoreWithOut();
  await dictStore.setDictMap();
  console.warn("dictStore.dictMap", dictStore.dictMap);

  // 创建Vue虚拟Dom实例
  const app = createApp(App);

  // 初始化项目资源
  app.use(store);
  app.use(i18n);
  app.use(Antd);
  setTimeout(() => clearObsoleteStorage(), 16);

  // 设置自定义指令 v-auth
  app.directive("auth", { mounted: isAuth }); // v-auth
  setupLoadingDirective(app); // v-loading

  // 权限
  const permissionStore = usePermissionStoreWithOut();
  permissionStore.changePermissionCode(userInfo.permissions); // 将缓存中的userInfo下的permission数组置入permissionStore
  const appStore = useAppStore();
  appStore.setProjectConfig({ permissionMode: PermissionModeEnum.BACK }); // 设置全局权限校验模式(API用)

  app.mount("#app");
};

initializationDataScreen();

// // 测试权限点
// const { hasPermission } = usePermission();
// if (!hasPermission("ecs-interface:rmg-setting")) {
//   alert("没rmg设置权限(ecs-interface:rmg-setting)!");
// }

// // 打印全局参数文件输入
// const el = document.createElement("pre");
// el.innerHTML = JSON.stringify(window["__PRODUCTION__YUDAO_ADMIN__CONF__"], null, 2);
// document.body.appendChild(el);
