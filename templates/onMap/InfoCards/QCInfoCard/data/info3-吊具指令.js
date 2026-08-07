import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "主小车指令类型", value: "" }, // 1
    { title: "主小车指令对象", value: "" },
    { title: "主小车指令状态", value: "" },
    { title: "门架小车指令类型", value: "" },
    { title: "门架小车指令对象", value: "" },
    { title: "门架小车指令状态", value: "" }, // 6
  ];
};
