import { DOMElements } from "@2dmapv2/onMap/index";

/** 设置需要隐藏的Dom元素层 */
export const historyReplayDefine_doms = () => {
  if (DOMElements.header) DOMElements.header.style.display = "none";
  if (DOMElements.modeSwitch) DOMElements.modeSwitch.style.display = "none";
  if (DOMElements.layerControls) DOMElements.layerControls.style.display = "none";
  if (DOMElements.siderLeft) DOMElements.siderLeft.style.display = "none";
  if (DOMElements.siderRight) DOMElements.siderRight.style.display = "none";
  if (DOMElements.functionalcontrols) DOMElements.functionalcontrols.style.display = "none";
  if (DOMElements.statusTables) DOMElements.statusTables.style.display = "none";
};
