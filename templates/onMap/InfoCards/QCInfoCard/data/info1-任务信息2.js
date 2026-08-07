import { useI18n } from "@/hooks/web/useI18n";

export default () => {
  const { t } = useI18n();

  return [
    { title: "类型", value: ["高位任务", "低位任务"], isTableTitle: true },
    { title: "任务编号", subject: "orderId", value: ["", ""] },
    { title: "索引ID", subject: "referenceId", value: ["", ""] }, //
    { title: "任务状态", subject: "orderStatus", value: ["", ""] },
    { title: "任务类型", subject: "moveKind", value: ["", ""] }, //
    { title: "命令ID", subject: "commandId", value: ["", ""] }, //
    { title: "命令状态", subject: "commandStatus", value: ["", ""] }, //
    { title: "作业船舶", subject: "vesselName", value: ["", ""] }, //
    { title: "作业车道", subject: "workLane", value: ["", ""] },
    { title: "锁定IGV编号", subject: "ahtId", value: ["", ""] },
    { title: "允许传输", subject: "transferAllowed", value: ["", ""] },
    { title: "工作队列", subject: "workQueue", value: ["", ""] }, //
    { title: "箱编号", subject: "containerId", value: ["", ""] },
    { title: "箱类型", subject: "containerType", value: ["", ""] },
    { title: "箱尺寸", subject: "containerSize", value: ["", ""] }, //
    { title: "箱门方向", subject: "doorDirectionAtQc", value: ["", ""] }, //
    { title: "箱位置", subject: "containerPosition", value: ["", ""] }, //
    { title: "抓箱位置", subject: "containerOrigLocation", value: ["", ""] }, //
    { title: "箱之前位置", subject: "containerLastLocation", value: ["", ""] }, //
    { title: "放箱位置", subject: "containerCurrLocation", value: ["", ""] }, //
    { title: "更新时间", subject: "orderUpdated", value: ["", ""] },
    { title: "创建时间", subject: "orderCreated", value: ["", ""] },
  ];
};
