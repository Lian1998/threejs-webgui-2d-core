import { QCMap } from "@2dmapv2/data";
import { IGVMap } from "@2dmapv2/data";
import { TRUCKMap } from "@2dmapv2/data";
import { YCMap } from "@2dmapv2/data";
import { BollardMap } from "@2dmapv2/data/";
import { handleData } from "@2dmapv2/data/tables/handleData";
import { handleData_YC } from "@2dmapv2/data/tables/handleData_YC";
import { handleData_LZ } from "@2dmapv2/data/tables/handleData_LZ";
import { isIGVId } from "@2dmapv2/inMap/projectUtils";

import { createAxios } from "@/utils/http/axios";
import { getAppEnvConfig } from "@/utils/env";

const viteEnvs = getAppEnvConfig();

/** 默认的 axiosInstance */
export const axiosInstance = createAxios({
  requestOptions: {
    apiUrl: `${viteEnvs.VITE_GLOB_MAP_RESTFUL_BASE_URL}/admin-api`,
    // successMessageMode: "message",
    errorMessageMode: "message",
    // isReturnNativeResponse: true,
    withToken: true,
    retryRequest: { isOpenRetry: false, count: 0, waitTime: 0 },
  },
});

/** 开启消息提示的 axiosInstance */
export const axiosInstace_messaged = createAxios({
  // authenticationScheme: undefined,
  requestOptions: {
    apiUrl: `${viteEnvs.VITE_GLOB_MAP_RESTFUL_BASE_URL}/admin-api`,
    errorMessageMode: "message",
    successMessageMode: "message",
  },
});

export function ecsSetting(data: any) {
  return axiosInstace_messaged.post({ url: "/ecs-interface/setting", data: data });
}

export const fetchDeviceList = (params) => {
  return axiosInstance.get({ url: `/ecs-interface/device-config/list`, params });
};

/**
 * 在初始化数据阶段, 需要使用Restful接口拉取必要的绘制数据
 * @returns {Promise<boolean>}
 */
export const initRestfulData = async () => {
  return new Promise((resolve) => {
    Promise.allSettled([
      fetchDeviceList({ deviceTypes: "QC" }).then((response) => {
        response.forEach((item: MapTypeV<typeof QCMap>) => {
          QCMap.set(item.deviceAlias, item);
        });
      }),
      fetchDeviceList({ deviceTypes: "AGV" }).then((response) => {
        console.log("AGV response", response);
        response.forEach((item: MapTypeV<typeof QCMap>) => {
          // IGV 从 T001 到 T100, 这个范围内只有IGV, 这个范围外都是集卡
          if (isIGVId(item.deviceAlias)) {
            IGVMap.set(item.deviceAlias, { deviceAlias: item.deviceAlias, deviceName: item.deviceAlias });
          }
        });
      }),
    ])
      .finally(() => {
        handleData();
        handleData_YC();
        handleData_LZ();

        console.warn("IGVMap", IGVMap);
        console.warn("YCMap", YCMap);
        console.warn("BollardMap", BollardMap);
      })
      .then(() => {
        resolve(true);
      });
  }).finally(() => {});
};
