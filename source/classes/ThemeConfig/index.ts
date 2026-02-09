import { items as ITEMS_DEV } from "./items.js";

import { utils_RootCss2Obj } from "./utils";
import { utils_ObjMegre2Map } from "./utils";
import { utils_Map2Json } from "./utils";

export class ThemeConfig {
  static #instance: ThemeConfig;
  public static get instance(): ThemeConfig {
    if (!ThemeConfig.#instance) {
      ThemeConfig.#instance = new ThemeConfig();
    }
    return ThemeConfig.#instance;
  }

  static itemsMap = new Map();

  /** 初始化颜色配置管理器 */
  async initialization() {
    const rootCssObj = utils_RootCss2Obj();

    // 1. RootCss中的变量颜色存一份到键值表中, 项目先加载全局css变量, 在javascript颜色管理器中可以使用这些变量
    utils_ObjMegre2Map(ThemeConfig.itemsMap, rootCssObj);

    // 2. dev环境下所有配置项
    utils_ObjMegre2Map(ThemeConfig.itemsMap, ITEMS_DEV, false);

    // 3. 主题环境下所有配置项覆盖
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    let targetConfiguration = undefined;
    if (isDark) targetConfiguration = (await import("@source/themes/dark/inMap.json")).default;
    else targetConfiguration = (await import("@source/themes/light/inMap.json")).default;

    Object.keys(targetConfiguration).forEach((key) => {
      const value = targetConfiguration[key];
      if (ThemeConfig.itemsMap.get(key) === value) return;
      ThemeConfig.itemsMap.set(key, value);
    });

    // 4. 写出 --VARS 特殊变量到 RootCss
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-theme-vars", "true");
    let cssText = ":root {";
    ThemeConfig.itemsMap.forEach((value, key) => {
      if (key.startsWith("VARS.")) cssText += `--${key.split(".").join("-")}: ${value};`;
    });
    cssText += "}";
    styleEl.innerHTML = cssText;
    document.head.appendChild(styleEl);

    console.warn("当前使用的色彩配置", ThemeConfig.itemsMap);
  }

  static aEl: HTMLAnchorElement = undefined;
  /** 导出一份配置模板 */
  downloadItemsTemplate() {
    const map = new Map();
    utils_ObjMegre2Map(map, ITEMS_DEV, false);
    const jsonStr = utils_Map2Json(map);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (!ThemeConfig.aEl) ThemeConfig.aEl = document.createElement("a");
    ThemeConfig.aEl.href = url;
    ThemeConfig.aEl.download = "inMap.json";
    ThemeConfig.aEl.click();
    URL.revokeObjectURL(url);
  }
}

import * as THREE from "three";
import tinycolor from "tinycolor2";

const threejsColorMap = new Map<string, THREE.Color>();
export const useThreejsColor = (key: string) => {
  if (!threejsColorMap.get(key)) {
    const { r, g, b } = tinycolor(ThemeConfig.itemsMap.get(key)).toRgb();
    threejsColorMap.set(key, new THREE.Color(r / 255.0, g / 255.0, b / 255.0));
  }
  return threejsColorMap.get(key);
};

const threejsAlphaMap = new Map<string, { value: number }>();
export const useThreejsAlpha = (key: string) => {
  if (!threejsAlphaMap.get(key)) {
    threejsAlphaMap.set(key, { value: tinycolor(ThemeConfig.itemsMap.get(key)).getAlpha() });
  }
  return threejsAlphaMap.get(key);
};
