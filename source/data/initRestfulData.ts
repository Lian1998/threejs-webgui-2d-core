import { ASCMap } from ".";
import { STSMap } from ".";
import { AGVMap } from ".";
import { YardMap } from ".";
import { PreDefBlockMap } from ".";

import { handleYardData } from "@source/data/handleYardData";

/** 初始化所有地图加载需要的Restful接口 */
export const initRestfulData = async () => {
  return new Promise((resolve) => {
    Promise.all([
      // 设备列表
      fetch("/restful-qinzhou/initDevice.json")
        .then((response) => response.json())
        .then((data) => {
          console.warn("initDevice", data);

          // STS
          for (const itemValue of data[0].itemValue) STSMap.set(itemValue.cheId, itemValue);

          // AGV
          for (const itemValue of data[1].itemValue) AGVMap.set(itemValue.cheId, itemValue);

          // ASC
          for (const itemValue of data[2].itemValue) ASCMap.set(itemValue.cheId, { cheId: itemValue.cheId, positions: new Array(2) });

          return data;
        }),

      // 预定义禁行区
      fetch("/restful-qinzhou/preDefBlockList.json")
        .then((response) => response.json())
        .then((data) => {
          console.warn("preDefBlockList", data);

          for (const element of data) {
            PreDefBlockMap.set(element.areaName, element);
          }

          return data;
        }),
    ])
      .then((responses) => {
        handleYardData();

        // ASC 初始化设备位置(随机)
        const initDeviceResponse = responses[0];
        for (const itemValue of initDeviceResponse[2].itemValue) {
          const yardNo = `B${itemValue.cheId.slice(2, 4)}`; // 根据YC的名字计算出所在的堆场, 从而计算出设备的坐标
          const yardItem = YardMap.get(yardNo);
          const startZ = yardItem.defs.min[1];
          const endZ = yardItem.defs.max[1];
          const centerX = (yardItem.defs.min[0] + yardItem.defs.max[0]) / 2;
          const inBlockSeq = Number.parseInt(itemValue.cheId.slice(4));
          const centerZ = (startZ + endZ) / 2.0 + Math.random() * ((endZ - startZ) / 2.0) * (inBlockSeq - 1.5) * 2.0; // 这里用随机值

          const ascItem = ASCMap.get(itemValue.cheId);
          ascItem.positions[0] = centerX;
          ascItem.positions[1] = centerZ;
        }
      })
      .finally(() => {
        resolve(undefined);
      });
  });
};
