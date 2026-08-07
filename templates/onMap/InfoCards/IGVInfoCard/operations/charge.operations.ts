////////////////////////////////////////////////////////////
//
// 充电任务相关操作接口
//
////////////////////////////////////////////////////////////

import { axiosInstance } from "./index";

const chargerCancelJobConfig = {
  url: "/ecs-interface/vms-charger-control/cancelJob",
  data: { cheId: 0, cancelType: "0" },
  // 取消充电任务: "0", 强制结束充电: "1"
};

/** 取消充电任务 */
export const cancelCharger = (cheId: number) => {
  chargerCancelJobConfig.data.cheId = cheId;
  chargerCancelJobConfig.data.cancelType = "0";
  return axiosInstance.post(chargerCancelJobConfig);
};

/** 强制结束充电 */
export const cancelCharger_Force = (cheId: number) => {
  chargerCancelJobConfig.data.cheId = cheId;
  chargerCancelJobConfig.data.cancelType = "1";
  return axiosInstance.post(chargerCancelJobConfig);
};

const setSwitchChargeCoverConfig = {
  url: "/ecs-interface/vms-charger-control/setSwitchChargeCover",
  data: { cheId: 0, switchStatus: "true" },
  // 打开保护罩: "true", 关闭保护罩: "false"
};

/** 打开保护罩 */
export const openChargerCover = (cheId: number) => {
  setSwitchChargeCoverConfig.data.cheId = cheId;
  setSwitchChargeCoverConfig.data.switchStatus = "true";
  return axiosInstance.post(setSwitchChargeCoverConfig);
};

/** 关闭保护罩 */
export const closeChargerCover = (cheId: number) => {
  setSwitchChargeCoverConfig.data.cheId = cheId;
  setSwitchChargeCoverConfig.data.switchStatus = "false";
  return axiosInstance.post(setSwitchChargeCoverConfig);
};
