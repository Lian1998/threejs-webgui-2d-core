import { T_BMS_DEVICE_CONFIG } from "./202507011444_T_BMS_DEVICE_CONFIG.json";

import { YCMap } from "@2dmapv2/data/";

// 左下角坐标值小, 右上角坐标值大

export const handleData_YC = () => {
  T_BMS_DEVICE_CONFIG.forEach((item) => {
    YCMap.set(item.DEVICE_NAME, {
      deviceAlias: item.DEVICE_NAME,
      deviceName: item.DEVICE_NAME,
      information: item,
    });
  });
};
