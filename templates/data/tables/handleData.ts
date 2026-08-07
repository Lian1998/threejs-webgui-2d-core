import { T_BMS_BLOCK_CONFIG } from "./202507011444_T_BMS_BLOCK_CONFIG.json";
import { T_BMS_GANTRY_MAP } from "./202512180942_T_BMS_GANTRY_MAP.json";
import { T_BMS_TROLLEY_MAP } from "./202507011444_T_BMS_TROLLEY_MAP.json";

import { BlockMap } from "@2dmapv2/data/index";
import { BayMap } from "@2dmapv2/data/index";
import { LaneMap } from "@2dmapv2/data/index";

// 左下角坐标值小, 右上角坐标值大

// prettier-ignore
export const BLOCK_DEFS: Record<
  string,
  Partial<{
    min: Array2<number>; // 当前cad最小坐标
    max: Array2<number>; // 当前cad最大坐标
    offset: Array2<number>, // 人为偏移量(叠加贝位和列位后)
    doubleSide: boolean; // 是否双侧都有工作车道
    landIncreCol: boolean; // 列号是否陆侧开始递增
    railPitch: number; // 轨道间
    crossStreet: string // 过街参考
  }>
> = {
  "61A": { min: [484912.1429455905, 2493563.291445755], max: [485272.47707693407, 2493597.026947407], doubleSide: false, railPitch: 34, },
  "62A": { min: [485329.64771131775, 2493563.291445755], max: [485792.44618206855, 2493597.026947407], doubleSide: false, railPitch: 34, },
  "61B": { min: [484912.18141531025, 2493503.057974093], max: [485272.57232268195, 2493540.2169831204], landIncreCol: false },
  "62B": { min: [485313.447582285, 2493503.057974093], max: [485821.40175688174, 2493540.2169831204], landIncreCol: false },
  "61C": { min: [484912.1955934124, 2493445.7055759523], max: [485272.52973841515, 2493482.6246718215] },
  "62C": { min: [485312.79084384884, 2493445.7055759523], max: [485851.32881228416, 2493482.6246718215] },
  "61D": { min: [484912.2103763843, 2493389.4691796973], max: [485272.44769141084, 2493426.4656958184], landIncreCol: false },
  "62D": { min: [485345.03658324695, 2493389.4691796973], max: [485851.3187473355, 2493426.4656958184], landIncreCol: false },
  "61E": { min: [484912.133871726, 2493332.030245872], max: [485272.445070649, 2493368.9569095005] },
  "62E": { min: [485316.29722316907, 2493332.030245872], max: [485851.731425976, 2493368.9569095005] },
  "61F": { min: [484911.92650098825, 2493273.9810681553], max: [485273.00931553345, 2493312.9647507323], offset:[0.0, 2.0], landIncreCol: false, crossStreet: "62F", railPitch: 39, },
  "62F": { min: [485304.0310031441, 2493273.9810681553], max: [485865.33753298695, 2493312.9647507323], offset:[0.0, 2.0], landIncreCol: false, railPitch: 39, },
  "61G": { min: [484955.0501152823, 2493227.8568314323], max: [485135.17884391634, 2493249.3134815837], railPitch: 21, },
};
const keys = Object.keys(BLOCK_DEFS);
for (let i = 0; i < keys.length; i++) {
  const key = keys[i];
  BLOCK_DEFS[key] = Object.assign({
    offset: [0.0, 0.0],
    doubleSide: true,
    landIncreCol: true,
    railPitch: 37,
  },BLOCK_DEFS[key]); // prettier-ignore
}

export const handleData = () => {
  BlockMap.clear();
  BayMap.clear();
  LaneMap.clear();

  // 堆场
  T_BMS_BLOCK_CONFIG.forEach((item) => {
    const key = item.BLOCK_NAME;
    const blockDef = BLOCK_DEFS[key];
    const blockItem: MapTypeV<typeof BlockMap> = {
      deviceAlias: key,
      positions: new Array<number>(4) as Array4<number>,
      bayMap: new Map(),
      laneMap: new Map(),
      information: item,
      defs: blockDef,
    };

    blockItem.positions[0] = blockDef.max[0];
    blockItem.positions[1] = blockDef.max[1];
    blockItem.positions[2] = blockDef.min[0];
    blockItem.positions[3] = blockDef.min[1];
    BlockMap.set(item.BLOCK_NAME, blockItem);
  });

  // 大车工作位
  let LAST_KEY = ""; // 因为导出的时候选用的是 ORDER BY BAY_NO asc ORDEWR BY BAY_TYPE asc, 所以可以知道上id是否与上一个贝重复
  T_BMS_GANTRY_MAP.forEach((item) => {
    const blockItem = BlockMap.get(item.BLOCK_NAME);
    if (!blockItem) return;
    const blockDef = BLOCK_DEFS[item.BLOCK_NAME];
    if (!blockDef) return;

    const key: `${string}_${string}_${string}` = `${item.BLOCK_NAME}_${item.BAY_NO}_${item.BAY_SIZE}`;
    const bayItem: MapTypeV<typeof BayMap> = {
      block_deviceAlias: item.BLOCK_NAME,
      deviceAlias: item.BAY_NO.toString(),
      size: item.BAY_SIZE,
      positions: [blockItem.positions[0] - item.GANTRY_POS / 1000.0, blockItem.positions[3]],
      duplicated: LAST_KEY === `${item.BLOCK_NAME}_${item.BAY_NO}`, // 是否重复
      information: item,
    };

    // 计算位置
    // X轴
    bayItem.positions[0] = blockItem.positions[0] - item.GANTRY_POS / 1000.0;
    // if (!blockDef.crossStreet) {
    //   // 存在问题: 61F/62F存在跨堆场, 坐标设计是61F以62F的起点为起点, 但是现在数据库数据还不对
    //   bayItem.positions[0] = blockItem.positions[0] - item.GANTRY_POS / 1000.0;
    // } else {
    //   const _blockItem = BlockMap.get(blockDef.crossStreet);
    //   bayItem.positions[0] = _blockItem.positions[0] - item.GANTRY_POS / 1000.0;
    // }
    // 偏移量
    bayItem.positions[0] = bayItem.positions[0] + blockDef.offset[0];
    // Y轴
    bayItem.positions[1] = blockItem.positions[3];

    LAST_KEY = `${item.BLOCK_NAME}_${item.BAY_NO}`;
    BayMap.set(key, bayItem);
    blockItem.bayMap.set(key, bayItem);
  });

  // 设置小车工作位
  T_BMS_TROLLEY_MAP.forEach((item) => {
    const blockItem = BlockMap.get(item.BLOCK_NAME);
    if (!blockItem) return;
    const blockDef = BLOCK_DEFS[item.BLOCK_NAME];
    if (!blockDef) return;

    const key: `${string}_${string}` = `${item.BLOCK_NAME}_${item.LANE_NO}`;
    const laneItem: MapTypeV<typeof LaneMap> = {
      block_deviceAlias: item.BLOCK_NAME,
      deviceAlias: item.LANE_NO.toString(),
      positions: [0.0, 0.0], // X, Y
      information: item,
    };

    // 计算位置
    laneItem.positions[0] = blockItem.positions[2];
    // 是否陆侧开始递增
    if (blockDef.landIncreCol) laneItem.positions[1] = blockItem.positions[3] + item.TROLLEY_POS / 1000.0 - 4.5;
    else laneItem.positions[1] = blockItem.positions[1] - item.TROLLEY_POS / 1000.0 + 4.5;
    // 偏移量
    laneItem.positions[1] = laneItem.positions[1] + blockDef.offset[1];

    LaneMap.set(key, laneItem);
    blockItem.laneMap.set(key, laneItem);
  });

  console.warn("堆场绘制数据结构", BlockMap);
};
