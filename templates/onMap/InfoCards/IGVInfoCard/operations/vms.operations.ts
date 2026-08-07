////////////////////////////////////////////////////////////
//
// VMS车队管理相关操作接口
//
////////////////////////////////////////////////////////////

import { axiosInstance } from "./index";

/**
 * IGV与车队: 移出车队/加入车队
 * @param value Switch值
 */
export const switchEnableIGVEvent = (value: boolean, cheId: number) => {
  return axiosInstance.post({
    url: "/ecs-interface/vms-operational-control/setEnableIgv",
    data: { cheId: cheId, enable: value },
  });
};

/**
 * IGV是否暂停: 取消暂停/暂停
 * @param value Switch值
 */
export const switchPauseStatusEvent = (value: boolean, cheId: number) => {
  return axiosInstance.post({
    url: "/ecs-interface/vms-operational-control/setPauseStatus",
    data: { cheId: cheId, pauseStatus: value ? "0" : "1" },
  });
};

/**
 * IGV控制模式: 手动控制/人工介入
 * @param value Switch值
 */
export const switchControlModeEvent = (value: boolean, cheId: number) => {
  return axiosInstance.post({
    url: "/ecs-interface/vms-operational-control/setControlMode",
    data: { cheId: cheId, controlMode: value ? "1" : "0" },
  });
};

/**
 * IGV是否可以被调度: 不可调度/可被调度
 * @param value Switch值
 */
export const switchAvl4tosEvent = (value: boolean, cheId: number) => {
  return axiosInstance.post({
    url: "ecs-interface/vms-operational-control/setAvl4tos",
    data: { cheId: cheId, avl4tos: value },
  });
};

const cancelJobConfig = {
  url: "ecs-interface/vms-operational-control/cancelJob",
  data: { cheId: 0, cancelType: "0" },
  // 终止人工任务: "0", 终止TOS任务: "1"
};

/** 终止人工任务 */
export const cancelJob_MANUAL = (cheId: number) => {
  cancelJobConfig.data.cheId = cheId;
  cancelJobConfig.data.cancelType = "0";
  return axiosInstance.request(cancelJobConfig);
};

/** 终止TOS任务 */
export const cancelJob_TOS = (cheId: number) => {
  cancelJobConfig.data.cheId = cheId;
  cancelJobConfig.data.cancelType = "1";
  return axiosInstance.request(cancelJobConfig);
};

const resetOperationConfig = {
  url: "ecs-interface/vms-operational-control/resetOperation",
  data: { cheId: 0, commandType: "" },
  // 重发: Resend, 复位故障:Reset, 复位指令:ResetCmd, 强制复位指令:ForceResetCmd
};

/** 复位故障 */
export const resetFault = (cheId: number) => {
  resetOperationConfig.data.cheId = cheId;
  resetOperationConfig.data.commandType = "Reset";
  return axiosInstance.request(resetOperationConfig);
};

/** 重发 */
export const resend = (cheId: number) => {
  resetOperationConfig.data.cheId = cheId;
  resetOperationConfig.data.commandType = "Resend";
  return axiosInstance.request(resetOperationConfig);
};

/** 复位指令 */
export const resetCommand = (cheId: number) => {
  resetOperationConfig.data.cheId = cheId;
  resetOperationConfig.data.commandType = "ResetCmd";
  return axiosInstance.request(resetOperationConfig);
};

/** 强制复位指令 */
export const resetCommand_Force = (cheId: number) => {
  resetOperationConfig.data.cheId = cheId;
  resetOperationConfig.data.commandType = "ForceResetCmd";
  return axiosInstance.request(resetOperationConfig);
};

const clearAndRemoveConfig = {
  url: "ecs-interface/vms-operational-control/clearAndRemove",
  data: { cheId: 0, cancelType: "0" },
  // 清除路径: "0", 强制移除车队: 1
};

/** 清除路径 */
export const cleanRoutes = (cheId: number) => {
  clearAndRemoveConfig.data.cheId = cheId;
  clearAndRemoveConfig.data.cancelType = "0";
  return axiosInstance.request(clearAndRemoveConfig);
};

/** 强制移除车队 */
export const removeAHTSForce = (cheId: number) => {
  clearAndRemoveConfig.data.cheId = cheId;
  clearAndRemoveConfig.data.cancelType = "1";
  return axiosInstance.request(clearAndRemoveConfig);
};
