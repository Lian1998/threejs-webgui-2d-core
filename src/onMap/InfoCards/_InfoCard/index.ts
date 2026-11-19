import InfoCard from "./index.vue";

export default InfoCard;

export const context = {
  /** 用于记录所有弹窗实例当前的zIndex */
  no: 100,

  /** 上一次点击的弹窗组件的根节点 */
  lastElement: undefined,
};
