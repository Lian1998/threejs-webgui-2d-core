import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [{ title: "异常ID", value: ["异常描述", "处理方法"], isTableTitle: true }];
};
