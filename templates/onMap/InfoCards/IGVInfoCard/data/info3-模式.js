import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "控制模式", value: "" },
    { title: "允许调度", value: "" },
  ];
};
