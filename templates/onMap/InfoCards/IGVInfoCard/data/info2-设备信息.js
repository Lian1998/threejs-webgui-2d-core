import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "电池电量", value: "" },
    { title: "充电状态", value: "" },
    { title: "X坐标(cm)", value: "" },
    { title: "Y坐标(cm)", value: "" },
    { title: "通信状态", value: "" },
    { title: "车头朝向", value: "" },
    { title: "故障状态", value: "" },
  ];
};
