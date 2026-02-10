import { CopyFilled } from "@ant-design/icons-vue";
import { ITEMS_DEV } from "./ColorItems";
import type { ITEMS_DEV_KEY } from "./ColorItems";
import { injectRootCssVars } from "@source/themes/injectRootCss";

export class ColorPaletteManager {
  static #instance: ColorPaletteManager;
  public static get instance(): ColorPaletteManager {
    if (!ColorPaletteManager.#instance) {
      ColorPaletteManager.#instance = new ColorPaletteManager();
    }
    return ColorPaletteManager.#instance;
  }

  /** 当前内存中的颜色配置 */
  static itemsMap = new Map<ITEMS_DEV_KEY, string>();

  /** 初始化颜色配置管理器 */
  async initialization() {
    const rootCssObj = utils_RootCss2Obj();

    // 1. RootCss中的变量颜色存一份到键值表中, 项目先加载全局css变量, 在javascript颜色管理器中可以使用这些变量
    utils_ObjMegre2Map(ColorPaletteManager.itemsMap, rootCssObj);

    // 2. dev环境下所有配置项
    utils_ObjMegre2Map(ColorPaletteManager.itemsMap, ITEMS_DEV, false);

    // 3. 主题环境下所有配置项覆盖
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    let targetConfiguration = undefined;
    if (isDark) targetConfiguration = (await import("@source/themes/dark/inMap.json")).default;
    else targetConfiguration = (await import("@source/themes/light/inMap.json")).default;

    Object.keys(targetConfiguration).forEach((key: ITEMS_DEV_KEY) => {
      const value = targetConfiguration[key];
      if (ColorPaletteManager.itemsMap.get(key) === value) return;
      ColorPaletteManager.itemsMap.set(key, value);
    });

    // 4. 写出 --VARS 特殊变量到 RootCss
    injectRootCssVars(
      "inmap-color-palette",
      ColorPaletteManager.itemsMap,
      (key) => key.startsWith("VARS."),
      (key, value) => [`--${key.split(".").join("-")}`, value],
    );

    console.warn("当前使用的色彩配置", ColorPaletteManager.itemsMap);
  }

  static aEl: HTMLAnchorElement = undefined;
  /** 导出一份配置模板 */
  downloadItemsTemplate() {
    const map = new Map();
    utils_ObjMegre2Map(map, ITEMS_DEV, false);
    const jsonStr = utils_Map2Json(map);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (!ColorPaletteManager.aEl) ColorPaletteManager.aEl = document.createElement("a");
    ColorPaletteManager.aEl.href = url;
    ColorPaletteManager.aEl.download = "inMap.json";
    ColorPaletteManager.aEl.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * 遍历CSS层级样式定义表, 找出所有的--开头的CSS变量, 将其转化为一个JavascriptObject
 * @param styleSheets
 * @returns
 */
export const utils_RootCss2Obj = (styleSheets: StyleSheetList = document.styleSheets) => {
  const computedCss = window.getComputedStyle(document.documentElement);
  const rootCssObject = {};
  for (var i = 0; i < styleSheets.length; i++) {
    try {
      for (var j = 0; j < styleSheets[i].cssRules.length; j++) {
        try {
          for (var k = 0; k < styleSheets[i].cssRules[j]["style"].length; k++) {
            const name = styleSheets[i].cssRules[j]["style"][k];
            if (name.startsWith("--") && !name.includes("shadow")) {
              rootCssObject[name] = computedCss.getPropertyValue(name);
            }
          }
        } catch (error) {}
      }
    } catch (error) {}
  }
  return rootCssObject;
};

/**
 * 递归传入的targetObject, 将其录入配置点
 * @param targetMap 存储目标
 * @param targetObject 需要转化的JavascriptObject目标
 * @param prefixs 累积的前缀小字符串
 */
export const utils_ObjMegre2Map = (targetMap: Map<string, string>, targetObject: Record<string, any>, expandVARS = true, depth = 0, prefixes = []) => {
  const keys = Object.keys(targetObject);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/splice#%E5%88%A0%E9%99%A4%E4%BB%8E%E7%B4%A2%E5%BC%95_2_%E5%BC%80%E5%A7%8B%E7%9A%84%E6%89%80%E6%9C%89%E5%85%83%E7%B4%A0
    prefixes.splice(depth);
    prefixes.push(key);
    const value = targetObject[key];

    // 如果其还是对象, 那么递归处理
    if (typeof value === "object") {
      utils_ObjMegre2Map(targetMap, value, expandVARS, depth + 1, prefixes);
    }
    // 如果遍历到底了, 那么需要存储该点
    else {
      const configKey = prefixes.join(".");
      targetMap.set(configKey, value);
      if (expandVARS && prefixes[0] === "VARS") targetMap.set("--" + prefixes.join("-"), value);
    }
  }
};

/**
 * 将 targetMap 转化为JSON字符串
 * @param targetMap
 * @returns {string} JSON字符串
 */
export const utils_Map2Json = (targetMap: Map<string, string>): string => {
  const jsObject = {};
  targetMap.forEach((value, key) => (jsObject[key] = value));
  try {
    return JSON.stringify(jsObject, undefined, 2);
  } catch (err) {
    console.error(err);
  }
};
