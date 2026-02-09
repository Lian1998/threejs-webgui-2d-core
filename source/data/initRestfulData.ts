import { QCMSMap } from ".";
import { VMSMap } from ".";
import { BMSMap } from ".";

/** 初始化所有地图加载需要的Restful接口 */
export const initRestfulData = async () => {
  return new Promise((resolve) => {
    Promise.allSettled([
      // getBollardDefList().then((response) => {
      //   if (!Array.isArray(response)) return;
      //   response.forEach((item) => {
      //     BollardMap.set(item.bollardNo, item);
      //   });
      // }),
      // getBayDefList().then((response) => {
      //   if (!Array.isArray(response)) return;
      //   response.forEach((item) => {
      //     BayMap.set(`${item.yard}_${item.bayNo}`, item);
      //   });
      // }),
      // getPredefineIGVBlockArea().then((response: MapTypeV<typeof IGVPredefineBlockMap>[]) => {
      //   if (!Array.isArray(response)) return;
      //   response.forEach((item) => {
      //     IGVPredefineBlockMap.set(item.areaName, item);
      //   });
      // }),
      // getPowerLevel().then((res) => {
      //   IGV_POWER_LEVEL.red = res.red;
      //   IGV_POWER_LEVEL.orange = res.orange;
      //   IGV_POWER_LEVEL.yellow = res.yellow;
      //   IGV_POWER_LEVEL.green = res.green;
      // }),
    ]).finally(() => {
      resolve(undefined);
    });
  }).finally(() => {});
};
