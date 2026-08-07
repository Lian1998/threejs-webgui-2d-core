import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    // { title: "类型", value: "数值", isTableTitle: true },
    { title: "任务ID", classify: "AscTaskInfo", subject: "orderId", value: "" },
    { title: "任务类型", classify: "AscTaskInfo", subject: "moveKind", value: "" },
    { title: "指令状态", classify: "AscTaskInfo", subject: "commandStatus", value: "" },
    { title: "指令ID", classify: "AscTaskInfo", subject: "commandId", value: "" },
    { title: "指令状态", classify: "AscTaskInfo", subject: "orderStatus", value: "" },
    { title: "任务箱Wi号", classify: "AscTaskInfo", subject: "containerWiRef", value: "" },
    { title: "任务箱编号", classify: "AscTaskInfo", subject: "containerId", value: "" },
    { title: "箱尺寸", classify: "AscTaskInfo", subject: "containerLength", value: "" },
    { title: "起始位置", classify: "AscTaskInfo", subject: "originSlot", value: "" },
    { title: "目的位置", classify: "AscTaskInfo", subject: "destinationSlot", value: "" },
    { title: "目标载具ID", classify: "AscTaskInfo", subject: "destVehicleId", value: "" },
    { title: "当前贝位", classify: "AscTaskInfo", subject: "currentBay", value: "" },
    { title: "载具类型", classify: "AscTaskInfo", subject: "vehicleType", value: "" },
    { title: "载具ID", classify: "AscTaskInfo", subject: "vehicleId", value: "" },
    { title: "更新时间", classify: "AscTaskInfo", subject: "update", value: "" },
  ];
};
