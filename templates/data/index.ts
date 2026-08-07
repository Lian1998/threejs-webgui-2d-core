export { socketioMainModule } from "@2dmapv2/classes/SocketioHelper";
export { initWebSocketData, socketioSubModule_map } from "./initWebSocketData";
export { initRestfulData } from "./initRestfulData";

/** 根据郭晴定义的接口返回的基础信息模型 */
type BASIC_INFORMATION = Partial<{
  deviceName: string;
  deviceAlias: string;
  deviceType: string;
  remark1: any;
  remark2: any;
  information: Record<string, any>; // 绑定的表格行对象
}>;

/** 项目IGV容器 */
export const IGVMap = new Map<string, Partial<BASIC_INFORMATION>>();

/** 项目集卡容器 */
export const TRUCKMap = new Map<string, Partial<BASIC_INFORMATION>>();

/** QC设备容器 */
export const QCMap = new Map<string, Partial<BASIC_INFORMATION>>();

/** YC设备容器 */
export const YCMap = new Map<string, Partial<BASIC_INFORMATION>>();

/** 堆场容器 */
export const BlockMap = new Map<
  string,
  BASIC_INFORMATION & {
    bayMap: typeof BayMap;
    laneMap: typeof LaneMap;
    positions: Array4<number>; // XMaxYMax XMinYMin
    defs: Record<string, any>;
  }
>();

/** 贝位容器 */
export const BayMap = new Map<
  `${string}_${string}_${string}`, // block_bay_size
  BASIC_INFORMATION & {
    block_deviceAlias: string;
    size: number;
    duplicated: boolean;
    positions: Array2<number>;
  }
>();

/** 列位容器 */
export const LaneMap = new Map<
  `${string}_${string}`, // block_lane
  BASIC_INFORMATION & {
    block_deviceAlias: string;
    positions: Array2<number>;
  }
>();

/** 揽桩号容器 */
export const BollardMap = new Map<string, BASIC_INFORMATION>();
