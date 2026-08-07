import { EQUIPNAME_ID } from "./202507011445_EQUIPNAME_ID.json";

import { IGVMap } from "@2dmapv2/data/";

// 左下角坐标值小, 右上角坐标值大

export const handleData_IGV = () => {
  EQUIPNAME_ID.forEach((item) => {
    if (item.EQUIP_NAME.startsWith("D")) {
      IGVMap.set(item.EQUIP_NAME, {
        deviceAlias: item.EQUIP_NAME,
        deviceName: item.EQUIP_NAME,
        information: item,
      });
    }
  });
};
