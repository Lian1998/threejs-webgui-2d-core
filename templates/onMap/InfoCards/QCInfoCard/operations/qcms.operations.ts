import { axiosInstance } from "@2dmapv2/data/initRestfulData";

/** 请求更新某个岸桥的详细配置信息 */
export function setQcmsConfig(data: { qcId: string | number; setKey: string; setValue: string | number }) {
  return axiosInstance.post({
    url: `/ecs-interface/qcms-operational-control/qcmsConfigSystemSet`,
    data: data,
  });
}

/** 请求更新某个岸桥的详细配置信息 - 循环方向 */
export function setQcmsConfig_CycleDirection(data: { qcName: string; cycle: string }) {
  return axiosInstance.post({
    url: `/ecs-interface/qcms-operational-control/qcCycleSystemSet`,
    data: data,
  });
}

/** 请求更新某个岸桥的详细配置信息 - QC可用状态 */
export function setQcmsConfig_QCStatus(data: { qcName: string; enable: string }) {
  return axiosInstance.post({
    method: "POST",
    url: `/ecs-interface/qcms-operational-control/qcStatusSystemSet`,
    data: data,
  });
}

/** 请求获取某个岸桥的详细配置信息 */
export function getQcmsConfig(params: { qcId: string | number }) {
  // /app-api/ecs-interface/qcms-operational-control/selectQcServiceCfgById
  return axiosInstance.get({
    url: `/ecs-interface/qcms-operational-control/selectQcServiceCfgById`,
    params: params,
  });
}
