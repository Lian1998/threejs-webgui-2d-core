import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "装卸类型", subject: "moveKind", value: "" }, // 1
    { title: "主小车调度层", subject: "mtschd", value: "" },
    { title: "主小车执行层", subject: "mt", value: "" },
    { title: "门架小车调度层", subject: "ptschd", value: "" },
    { title: "门架小车执行层", subject: "pt", value: "" },
  ];
};
