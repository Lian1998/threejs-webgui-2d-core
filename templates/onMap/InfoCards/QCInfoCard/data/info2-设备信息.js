import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "通信状态", value: "" }, // 1
    { title: "设备模式", value: "" },
    { title: "贝位信息", value: "" },
    { title: "大车锚定", value: "" },
    { title: "小车锚定", value: "" },
    { title: "绑扎状态", value: "" }, // 6
    { title: "紧停状态", value: "" },
    { title: "ECS故障", value: "" },
    { title: "大车位置(m)", value: "" },
    { title: "主小车位置(m)", value: "" },
    { title: "主小车起升(m)", value: "" },
    { title: "门架小车位置(m)", value: "" },
    { title: "门架小车起升(m)", value: "" }, // 11
  ];
};
