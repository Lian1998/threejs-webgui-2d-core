import { socketioMainModule } from "@2dmapv2/classes/SocketioHelper";
import { SocketioSubModule } from "@2dmapv2/classes/SocketioHelper";
import { getTimeStampForSocketReq } from "@2dmapv2/classes/SocketioHelper";

export const socketioSubModule_map = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_datascreen = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_statustables = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_igv = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_qc_0 = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_qc_1 = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_qc_2 = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_yc = new SocketioSubModule(socketioMainModule);
export const socketioSubModule_infocard_container = new SocketioSubModule(socketioMainModule);

/**
 * 在初始化数据阶段, 需要使用Websocket拉取必要的绘制数据
 * @returns {Promise<boolean>}
 */
export const initWebSocketData = async () => {
  const requestId = getTimeStampForSocketReq();
  socketioMainModule.socket.emit("subReal", { id: requestId, event: "subReal", data: ["initDevice"] });

  return new Promise((resolve, reject) => {
    socketioMainModule.socket.on("initDevice", (response: any) => {
      resolve(true);
    });
  });
};
