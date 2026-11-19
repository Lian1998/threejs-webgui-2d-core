/**
 *  将css按style文件的形式写入htmlHeader下
 * @param {string} name 标签attributes名
 * @param {Map<string, string>} records 文件内容记录
 * @param filter 过滤规则
 * @param mapping 映射规则
 */
export const injectRootCssVars = (name: string, records: Map<string, string>, filter: (key: string, value: string) => boolean = undefined, mapping: (key: string, value: string) => [string, string] = undefined) => {
  let styleEl = document.head.querySelector(`style[name="${name}"]`);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.setAttribute("name", name);
    document.head.appendChild(styleEl);
  }
  let cssText = ":root {";
  for (const [key, value] of records) {
    let csskv = [key, value];
    if (filter && !filter(key, value)) continue;
    if (mapping) csskv = mapping(key, value);
    cssText += `${csskv[0]}: ${csskv[1]};`;
  }
  cssText += "}";
  styleEl.innerHTML = cssText;
};
