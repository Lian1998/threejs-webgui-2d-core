/**
 * 递归传入的值, 将其转化为配置点
 * @param {*} targetMap 存储目标
 * @param {*} targetObject 需要转化的JavascriptObject目标
 * @param {*} prefixs 累积的前缀小字符串
 */
export const recuringConfig = (targetMap, targetObject, depth = 0, prefixes = []) => {
  const keys = Object.keys(targetObject);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/splice#%E5%88%A0%E9%99%A4%E4%BB%8E%E7%B4%A2%E5%BC%95_2_%E5%BC%80%E5%A7%8B%E7%9A%84%E6%89%80%E6%9C%89%E5%85%83%E7%B4%A0
    prefixes.splice(depth);
    prefixes.push(key);
    const value = targetObject[key];

    // 如果其还是对象, 那么递归处理
    if (typeof value === "object") {
      recuringConfig(targetMap, value, depth + 1, prefixes);
    }
    // 如果遍历到底了, 那么需要存储该点
    else {
      const configKey = prefixes.join(".");
      const cssKey = prefixes.join("-");
      if (prefixes[0] === "VARS") targetMap.set("--" + cssKey, value);
      targetMap.set(configKey, value);
    }
  }
};

/**
 * 遍历CSS层级样式定义表, 找出所有的--开头的CSS变量, 将其转化为一个JavascriptObject
 * @param {*} styleSheets
 * @returns
 */
export const getRootCssVariables = (styleSheets = document.styleSheets) => {
  const computedCss = window.getComputedStyle(document.documentElement);
  const rootCssObject = {};
  // loop each stylesheet
  for (var i = 0; i < styleSheets.length; i++) {
    // loop stylesheet's cssRules
    try {
      // try/catch used because 'hasOwnProperty' doesn't work
      for (var j = 0; j < styleSheets[i].cssRules.length; j++) {
        try {
          // loop stylesheet's cssRules' style (property names)
          for (var k = 0; k < styleSheets[i].cssRules[j].style.length; k++) {
            const name = styleSheets[i].cssRules[j].style[k];
            // test name for css variable signiture and uniqueness
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

/** 将Map类型数据转化为将JSON字符串 */
export const MAP2JSON = (targetMap) => {
  const jsObject = {};
  targetMap.forEach((value, key) => {
    jsObject[key] = value;
  });
  try {
    return JSON.stringify(jsObject);
  } catch (err) {
    console.error(err);
  }
};
