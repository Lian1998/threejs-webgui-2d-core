import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import inmapColorConfig_javascriptObject from "./inMapColorConfig";

import { DEFAULT_COLOR } from "./inMapColorConfig";
import { recuringConfig } from "./utils";
import { getRootCssVariables } from "./utils";
import { MAP2JSON } from "./utils";

import { map } from "@2dmapv2/inMap/index";

import defaultColorConfig_light from "./default.light.json?raw";
import defaultColorConfig_dark from "./default.dark.json?raw";

let rootCSS_context; // rootCSS上下文
export const CONFIG_STRING_MAP = new Map(); // 配置点与颜色字符串的映射
export const CONFIG_FILL_MAP = new Map<string, Fill>(); // 配置点与Openlayers的Fill对象的映射
export const CONFIG_STROKE_MAP = new Map<string, Stroke>(); // 配置点与颜色字符串的映射
export const LS_PREFIX = "2dmapv2:colorconfig:";

/**
 * 根据配置点, 返回配置的颜色16进制字符串
 * 如果没有定义所访问的配置点, 那么会抛出警告并且返回默认色(Unity粉红)
 * @param name
 * @returns
 */
export const getColorString = (name: string) => {
  const colorString = CONFIG_STRING_MAP.get(name);
  if (!colorString) {
    console.warn(`无法在颜色内存配置Map中获取配置点 ${name} 所定义的颜色`);
    return DEFAULT_COLOR;
  }
  return colorString;
};

/**
 * 根据配置点, 返回openlayers的Fill对象;
 * openlayers通过给Feature的Style提供Fill对象来获取部分的渲染状态(FrameState);
 * 目的是通过利用缓存的机制来减少生成对象的量以减少内存抖动;
 * @param name 配置点
 * @param namedManagement 默认(不传)配置点作为主键, 传ture配置点对应颜色作为主键, 传false直接将name作为主键
 * @returns {Fill}
 */
export const getColorFill = (name: string, namedManagement?: boolean): Fill => {
  let key = name;
  if (namedManagement === undefined) key = name;
  else if (namedManagement === true) key = getColorString(name);
  else key = name;

  let colorString = name;
  if (namedManagement === undefined) colorString = getColorString(name);
  else if (namedManagement === true) colorString = getColorString(name);
  else colorString = name;

  if (!CONFIG_FILL_MAP.get(key)) {
    const fill = new Fill({ color: colorString });
    CONFIG_FILL_MAP.set(key, fill);
  }
  const fill = CONFIG_FILL_MAP.get(key);
  return fill;
};

/**
 * 根据配置点, 返回openlayers的Stroke对象;
 * openlayers通过给Feature的Style提供Fill对象来获取部分的渲染状态(FrameState);
 * 目的是通过利用缓存的机制来减少生成对象的量以减少内存抖动;
 * @param name 配置点
 * @param namedManagement 是使用配置点作为key还是以配置点查询出的颜色作为key
 * @returns {Fill}
 */
export const getColorStroke = (name: string, namedManagement?: boolean): Stroke => {
  let key = name;
  if (namedManagement === undefined) key = name;
  else if (namedManagement === true) key = getColorString(name);
  else key = name;

  let colorString = name;
  if (namedManagement === undefined) colorString = getColorString(name);
  else if (namedManagement === true) colorString = getColorString(name);
  else colorString = name;

  if (!CONFIG_STROKE_MAP.get(key)) {
    const stroke = new Stroke({ color: colorString });
    CONFIG_STROKE_MAP.set(key, stroke);
  }
  const stroke = CONFIG_STROKE_MAP.get(key);
  return stroke;
};

/**
 * 当 inmapColor 发生更新:
 * 1. 对比新老值, 将新值设置到内存中
 * 2. 找到配置点对应的Fill对象, 将Fill对象更新
 * 3. 遍历当前渲染上下文中定义的所有layers标记changed, 并且手动调用渲染函数刷新一帧
 * @param key 配置点
 * @param value 更新后的值
 * @returns
 */
export const when_inmapcolor_updated = (key: string, value: string) => {
  // 对比新老值, 将新值设置到内存中
  if (CONFIG_STRING_MAP.get(key) === value) return;
  CONFIG_STRING_MAP.set(key, value);

  // 找到配置点对应的Fill对象, 将Fill对象更新
  getColorFill(key).setColor(value);

  // 遍历当前渲染上下文中定义的所有layers标记changed, 并且手动调用渲染函数刷新一帧
  if (!map) return;
  const layers = map.getAllLayers();
  if (!Array.isArray(layers)) return;
  layers.forEach((layer) => {
    if (layer.get("layername")) layer.changed();
  });
  map.renderSync();
};

/**
 * 当 onmapColor 发生更新, 需要改变css
 * 1. 对比新老值, 将新值设置到内存中
 * 2. 将值通过JavaScript设置到rootCSS中
 * @param key 配置点
 * @param value 更新后的值
 */
export const when_onmapcolor_updated = (key: string, value: string) => {
  rootCSS_context.style.setProperty(key, value);
  CONFIG_STRING_MAP.set(key, value);
};

/** 当 VARS 开头的变量发生更新 */
export const when_vars_updated = (key: string, value: string) => {
  when_inmapcolor_updated(key, value);
  const onmapKey = "--" + key.split(".").join("-");
  when_onmapcolor_updated(onmapKey, value);
};

/** 将对应key的LocalStorage应用到当前配置 */
export const readLocalStorage = (key: string) => {
  const jsonString = window.localStorage.getItem(`${LS_PREFIX}${key}`);
  try {
    if (!jsonString) return;
    const jsObject = JSON.parse(jsonString);
    Object.keys(jsObject).forEach((key) => {
      const value = jsObject[key];
      // 判断颜色是否有更新
      if (CONFIG_STRING_MAP.get(key) === value) return;
      // @ts-ignore
      if (key.startsWith("--")) rootCSS_context.style.setProperty(key, value);
      else getColorFill(key).setColor(value);
      // 设置新颜色到内存
      CONFIG_STRING_MAP.set(key, value);
    });
  } catch (err) {
    console.error(err);
  }
  try {
    if (!map) return;
    const layers = map.getAllLayers();
    if (!Array.isArray(layers)) return;
    layers.forEach((layer) => {
      if (layer.get("layername")) layer.changed();
    });
    map.renderSync();
  } catch (err) {
    console.error(err);
  }
};

/** 将当前颜色配置存储到LocalStorage */
export const updateLocalStorage = () => {
  const jsonString = MAP2JSON(CONFIG_STRING_MAP);
  window.localStorage.setItem(`${LS_PREFIX}local`, jsonString);
};

/** 清除LocalStorage 中的本地颜色配置 */
export const clearLocalStorage = () => {
  window.localStorage.removeItem(`${LS_PREFIX}local`);
};

// 先对所有的内容进行预处理
export const initColorConfig = () => {
  rootCSS_context = document.querySelector<HTMLElement>(":root");

  // 统计ONMAP颜色配置
  const rootCSS_javascriptObject = getRootCssVariables();
  recuringConfig(CONFIG_STRING_MAP, rootCSS_javascriptObject); // 将 rootCSS_javascriptObject 作为配置项读取

  // 统计inMap颜色配置
  recuringConfig(CONFIG_STRING_MAP, inmapColorConfig_javascriptObject); // 将 inmapColorConfig_javascriptObject 作为配置项读取

  // 把当前发布定义的主题色存储到localStorage中
  window.localStorage.setItem(`${LS_PREFIX}default_light`, defaultColorConfig_light);
  window.localStorage.setItem(`${LS_PREFIX}default_dark`, defaultColorConfig_dark);

  // 读当前配置
  const jsonString = window.localStorage.getItem(`${LS_PREFIX}local`);
  const json = JSON.parse(jsonString) ?? {};
  // 如果localStorage中存在已存配置并且指定了风格, 则替换为最新的风格化颜色配置字符串
  if (json["NAME"] == "light") window.localStorage.setItem(`${LS_PREFIX}local`, defaultColorConfig_light);
  else if (json["NAME"] == "dark") window.localStorage.setItem(`${LS_PREFIX}local`, defaultColorConfig_dark);

  // 看看是否有存储过本地配色
  readLocalStorage("local");

  // 打印当前颜色配置
  console.warn("当前使用的色彩配置", CONFIG_STRING_MAP); // , MAP2JSON(CONFIG_STRING_MAP)

  // 如果是图注内容, 需要同时标定css和openlayer
  CONFIG_STRING_MAP.forEach((value, key) => {
    if (key.startsWith("--VARS")) {
      rootCSS_context.style.setProperty(key, value);
      CONFIG_STRING_MAP.set(key, value);
    }
  });
};
