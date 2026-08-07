import { useI18n } from "@/hooks/web/useI18n";

// {
//     cheId: "D001";
//     displayName: "D001";
//     orderId: null;
//     commandId: null;
//     status: null;
//     orderType: null;
//     workQueue: null;
//     moveKind: null;
//     containerId1: "EGHU3262286";
//     containerId2: null;
//     containerType1: null;
//     containerType2: null;
//     containerSize: null;
//     measuredWeightKg1: null;
//     measuredWeightKg2: null;
//     doorDirectionOnAht1: null;
//     doorDirectionOnAht2: null;
//     referenceId1: null;
//     referenceId2: null;
//     plannedDestination: null;
//     temporaryDestination: null;
//     jobPos: null;
//     pta: null;
//     timeClaimYardEntry: null;
//     timeAtDestination: null;
//     vesselName: null;
//     orderCreated: null;
//     orderUpdated: null;
// }

// { title: "类型", value: "数值", isTableTitle: true },
// { title: "任务编号", subject: "orderId", value: "" },
// { title: "指令Id", subject: "commandId", value: "" },
// { title: "执行状态", subject: "status", value: "" },
// { title: "任务类型", subject: "orderType", value: "" },
// { title: "工作队列", subject: "workQueue", value: "" },
// { title: "任务类型", subject: "moveKind", value: "" },
// { title: "箱号1", subject: "containerId1", value: "" },
// { title: "箱号2", subject: "containerId2", value: "" },
// { title: "任务箱1类型", subject: "containerType1", value: "" },
// { title: "任务箱2类型", subject: "containerType2", value: "" },
// { title: "任务箱尺寸", subject: "containerSize", value: "" },
// { title: "任务箱1重", subject: "measuredWeightKg1", value: "" },
// { title: "任务箱2重", subject: "measuredWeightKg2", value: "" },
// { title: "任务箱1箱门方向", subject: "doorDirectionOnAht1", value: "" },
// { title: "任务箱2箱门方向", subject: "doorDirectionOnAht2", value: "" },
// { title: "索引ID1", subject: "referenceId1", value: "" },
// { title: "索引ID2", subject: "referenceId2", value: "" },
// { title: "目标位置", subject: "plannedDestination", value: "" },
// { title: "临时目标位置", subject: "temporaryDestination", value: "" },
// { title: "作业箱位", subject: "jobPos", value: "" },
// { title: "计划到达时间", classify: "time", subject: "pta", value: "" },
// { title: "进入堆场时间", classify: "time", subject: "timeClaimYardEntry", value: "" },
// { title: "进入目标位置时间", subject: "timeAtDestination", value: "" },
// { title: "作业船舶", subject: "vesselName", value: "" },
// { title: "任务创建时间", classify: "time", subject: "orderCreated", value: "" },
// { title: "任务更新时间", classify: "time", subject: "orderUpdated", value: "" },
export default () => {
  const { t } = useI18n();

  return [
    // { title: "", subject: "cheId", value: "" },
    { title: "任务号", subject: "taskId", value: "" },
    { title: "任务状态", subject: "status", value: "" },
    { title: "任务类型", subject: "moveKind", value: "" },
    // { title: "任务类型", subject: "moveKind1", value: "" },
    { title: "指令类型", subject: "orderType", value: "" },
    { title: "Order Request", subject: "orderRequest", value: "" },
    { title: "堆场号", subject: "yardId", value: "" },
    { title: "临时目标位置", subject: "tempDestination", value: "" },
    { title: "目标位置", subject: "planDestination", value: "" },
    { title: "当前位置", subject: "location", value: "" },
    { title: "下一个位置", subject: "nextLocation", value: "" },
    { title: "Work Phase", subject: "workPhase", value: "" },
    { title: "Work Line", subject: "workLine", value: "" },
    { title: "Park Spot", subject: "parkSpot", value: "" },
    { title: "Pre Park Spot", subject: "preParkSpot", value: "" },
    { title: "Park Time", subject: "parkTime", classify: "time", value: "" },
    { title: "作业箱位", subject: "jobPos", value: "" },
    { title: "车头朝向", subject: "ahtHeading", value: "" },
    { title: "WI号", subject: "wi", value: "" },
    { title: "Carry WI", subject: "carryWi", value: "" },
    { title: "Carry Link", subject: "carryLink", value: "" },
    // { title: "WI1", subject: "wi1", value: "" },
    { title: "WI位置", subject: "wiPosAht1", value: "" },
    { title: "集装箱号", subject: "containerId1", value: "" },
    { title: "集装箱尺寸", subject: "containerSize1", value: "" },
    { title: "最近更新时间", subject: "updated", classify: "time", value: "" },
  ];
};
