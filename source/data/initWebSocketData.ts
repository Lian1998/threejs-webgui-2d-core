import { socketioMainModule } from "@source/classes/SocketioHelper";
import { SocketioSubModule } from "@source/classes/SocketioHelper";
import { getTimeStampForSocketReq } from "@source/classes/SocketioHelper";

export const socketioSubModule_map = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_datascreen = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_datascreen_vesselVisitStatistics = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_statustables = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_igv = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_qc = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_yc = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_container = new SocketioSubModule(socketioMainModule);

/** 初始化所有地图加载需要的Socket接口 */
export const initWebSocketData = async () => {
  return new Promise((resolve, reject) => resolve(true));
};

export { socketioMainModule };
