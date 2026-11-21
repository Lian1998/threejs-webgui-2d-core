import { socketioSubModule_datascreen } from "@/data/initWebSocketData";
import { socketioSubModule_datascreen_vesselVisitStatistics } from "@/data/initWebSocketData";
import { socketioSubModule_statustables } from "@/data/initWebSocketData";
import { socketioSubModule_infocard_container } from "@/data/initWebSocketData";

/** 进入历史回放时需要将以下的 socketioSubModule 注销 */
export const historyReplayDefine_socketioSubModules = () => {
  // prettier-ignore
  const need = [
    socketioSubModule_datascreen,
    socketioSubModule_datascreen_vesselVisitStatistics,
    socketioSubModule_statustables,
    socketioSubModule_infocard_container,
  ];

  need.forEach((socketioSubModule) => socketioSubModule.dispose());
};
