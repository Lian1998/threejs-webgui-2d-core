import { bollards } from "./lz.json";

import { BollardMap } from "@2dmapv2/data/";

// 左下角坐标值小, 右上角坐标值大

export const handleData_LZ = () => {
  bollards.forEach((item) => {
    BollardMap.set(item.system_no, {
      deviceAlias: item.system_no,
      deviceName: item.system_no,
      information: item,
    });
  });
};
