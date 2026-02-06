import { T_BMS_BLOCK_CONFIG } from "./202509101002_T_BMS_BLOCK_CONFIG.json";
import { T_BMS_GANTRY_MAP } from "./202601270914_T_BMS_GANTRY_MAP.json";
import { T_BMS_TROLLEY_MAP } from "./202509101003_T_BMS_TROLLEY_MAP.json";

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
    crossStreet: string // 过街参考
  }>
> = {
  "AA": { min: [756.1427674529414, 1294.7248345062474], max: [1024.0465757563065, 1335.2113689080998],  },
  "BA": { min: [1113.6939847050753, 1295.1924960351355], max: [1415.8645591867778, 1335.1439286848056],  },
  "CA": { min: [1472.629728325415, 1294.3787851904115], max: [1785.3623317347117, 1335.5574182239359] },

  "AB": { min: [756.5298394590395, 1238.3637648137606], max: [1056.3947280043412, 1278.1138197450473] },
  "BB": { min: [1140.4481138577414, 1238.1716945221947], max: [1414.2631624737694, 1278.2596296607749] },
  "CB": { min: [1472.5862014187774, 1238.160553269921], max: [1785.5164956015055, 1278.416298665018] },

  "AC": { min: [756.5627659810391, 1175.9803654050743], max: [1030.589577865051, 1216.400946788496] },
  "BC": { min: [1114.3916383877895, 1176.202356806149], max: [1414.4734683755598, 1216.2609927517865] },
  "CC": { min: [1472.592454721707, 1176.2231217187912], max: [1785.488085241935, 1216.2006840636043] },

  "AD": { min: [756.4261605163105, 1107.0282442874518], max: [1056.6024334927952, 1147.0660940926505] },
  "BD": { min: [1114.4712254305205, 1107.1316689358089], max: [1414.488866475545, 1147.2250163201252] },
  "CD": { min: [1472.3576771674248, 1107.085792989649], max: [1785.6036500445011, 1147.311304164574], },

  "AE": { min: [756.6528800308236, 1050.0064546421888], max: [1056.5626549881983, 1090.1150214781937], },
  "BE": { min: [1114.6407536254267, 1049.9967178039292], max: [1414.4170924354332, 1090.1692531451934], },
  "CE": { min: [1498.4506499437366, 1050.3356495710239], max: [1785.725326739455, 1090.2933928166751], },
  
  "AF": { min: [756.6060389746422, 987.8817336674133], max: [1056.4914332853405, 1028.0501628332502], },
  "BF": { min: [1114.3408501340198, 988.0461650257248], max: [1388.671276842548, 1028.2359139116172], },
  "CF": { min: [1472.4875115054283, 988.0430740633469], max: [1785.5387101397655, 1028.2928160906838], },
  
  "AG": { min: [756.3285269627223, 931.105050005389], max: [1057.6175028006378, 971.2697256928319], crossStreet: "AG"},
  "BG": { min: [1113.3935375506094, 931.0615383173792], max: [1415.5801444306048, 971.1694874093847], crossStreet: "AG" },
  "CG": { min: [1518.8349515164484, 931.3069292122193], max: [1785.714356547564, 971.2104069086179], crossStreet: "AG" },
  
  "AH": { min: [756.423108212417, 874.2744414276236], max: [1057.6075978258386, 914.2983789374213], crossStreet: "AH" },
  "BH": { min: [1141.0125349774391, 874.0891567302046], max: [1415.4160784186884, 913.9901960060554], crossStreet: "AH" },
  "CH": { min: [1471.3962127030231, 874.4599889188648], max: [1785.5812119503769, 914.2775234144117], crossStreet: "AH" },
  
  "AI": { min: [795.2940097805492, 811.9241128420466], max: [1031.036170612144, 851.699519844528], crossStreet: "AI" },
  "BI": { min: [1113.1228844348861, 811.9241128420468], max: [1415.4437086146904, 852.1718422822986], crossStreet: "AI" },
  "CI": { min: [1471.2352405730849, 811.7106524004641], max: [1785.8386504906946, 852.5150113877764], crossStreet: "AI" },
  
  "AJ": { min: [755.8709562509783, 742.026105537291], max: [1057.6766872462433, 782.3047667092475], crossStreet: "AJ" },
  "BJ": { min: [1113.2103941205237, 741.6632402528912], max: [1415.197621664037, 782.3047667092469], crossStreet: "AJ" },
  "CJ": { min: [1471.094305019555, 741.8446645896369], max: [1785.7663048810216, 782.1041792150138], crossStreet: "AJ" },
  
  "AK": { min: [756.5158676312667, 685.2115906124079], max: [1057.5703638903358, 725.3633565139082], crossStreet: "AK" },
  "BK": { min: [1113.590566342807, 685.0965505648888], max: [1415.6663726457684, 725.1334550581232], crossStreet: "AK" },
  "CK": { min: [1471.5843546680887, 684.9688522589316], max: [1785.6392890217035, 725.2141958744846], crossStreet: "AK" },

  "AL": { min: [756.5416060816382, 622.8866757410312], max: [1057.7013746722348, 663.3578879897075], crossStreet: "AL" },
  "BL": { min: [1113.465873363133, 623.0569947638005], max: [1415.8317392681101, 663.2152723452621], crossStreet: "AL" },
  "CL": { min: [1471.4430599999334, 623.1528726958994], max: [1785.5846979668272, 663.1659114070535], crossStreet: "AL" },
};

// 补全自定义对象
const keys = Object.keys(BLOCK_DEFS);
for (let i = 0; i < keys.length; i++) {
  const key = keys[i];
  BLOCK_DEFS[key] = Object.assign({
    offset: [0.0, 0.0],
  }, BLOCK_DEFS[key]); // prettier-ignore
}

export const handleData = () => {
  BlockMap.clear();
  BayMap.clear();
  LaneMap.clear();

  // 堆场
  T_BMS_BLOCK_CONFIG.forEach((item) => {
    const key = item.BLOCK_NAME;
    const blockDef = BLOCK_DEFS[key];
    if (!blockDef) return; // 如果在自定义配置中没有找到堆场,那么不计算到容器中

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
      positions: [0.0, 0.0],
      duplicated: LAST_KEY === `${item.BLOCK_NAME}_${item.BAY_NO}`, // 是否重复
      information: item,
    };

    // 计算位置
    bayItem.positions[0] = (item.GANTRY_POS - 1000000) / 1000.0 + 850;
    bayItem.positions[1] = blockItem.positions[3];

    // // 是否是过街长贝
    // if (!blockDef.crossStreet) bayItem.positions[0] = blockItem.positions[0] - item.GANTRY_POS / 1000.0;
    // else {
    //   const _blockItem = BlockMap.get(blockDef.crossStreet);
    //   bayItem.positions[0] = _blockItem.positions[0] - item.GANTRY_POS / 1000.0;
    // }

    // 偏移量
    bayItem.positions[0] = bayItem.positions[0] + blockDef.offset[0];

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

    if (item["LANE_TYPE"] !== 2) return;
    if (item["T_ISACTIVE"] !== 1) return;

    const key: `${string}_${string}` = `${item.BLOCK_NAME}_${item.LANE_NO}`;
    const laneItem: MapTypeV<typeof LaneMap> = {
      block_deviceAlias: item.BLOCK_NAME,
      deviceAlias: item.LANE_NO.toString(),
      positions: [0.0, 0.0], // X, Y
      information: item,
    };

    // 计算位置
    laneItem.positions[0] = blockItem.positions[2];
    laneItem.positions[1] = blockItem.positions[1] - (item.TROLLEY_POS - 7470) / 1000.0 - 6;

    // // 是否陆侧开始递增
    // if (blockDef.landIncreCol) laneItem.positions[1] = blockItem.positions[3] + item.TROLLEY_POS / 1000.0 - 4.5;
    // else laneItem.positions[1] = blockItem.positions[1] - item.TROLLEY_POS / 1000.0 + 4.5;

    // 偏移量
    laneItem.positions[1] = laneItem.positions[1] + blockDef.offset[1];

    LaneMap.set(key, laneItem);
    blockItem.laneMap.set(key, laneItem);
  });

  console.warn("当前堆场绘制数据结构", BlockMap);
};
