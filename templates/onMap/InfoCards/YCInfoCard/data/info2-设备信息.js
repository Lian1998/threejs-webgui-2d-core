import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "操作模式", classify: "AscStatus", subject: "operationStatus", value: "" },
    { title: "工作状态", classify: "AscStatus", subject: "workStatus", value: "" },
    { title: "执行状态", classify: "AscStatus", subject: "executionStatus", value: "" },
    { title: "逻辑位置", classify: "AscStatus", subject: "location", value: "" },
    { title: "当前贝位", classify: "AscStatus", subject: "currentBay", value: "" },
    { title: "大车位置(m)", subject: "大车位置(m)", value: "" },
    { title: "小车位置(m)", subject: "小车位置(m)", value: "" },
    { title: "小车起升(m)", subject: "小车起升(m)", value: "" },
  ];
};
