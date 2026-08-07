import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "任务编号", subject: "commandIds", value: "" }, // 1
    { title: "吊具类型", subject: "deviceType", value: "" },
    { title: "命令编号", subject: "jobId", value: "" },
    { title: "任务类型", subject: "jobType", value: "" },
    { title: "任务状态", subject: "jobState", value: "" },
    { title: "更新时间", subject: "updateTime", value: "" }, // 6
  ];
};
