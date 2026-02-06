import { socketioSubModule_datascreen } from "@2dmapv2/data/initWebSocketData";
import { socketioSubModule_datascreen_vesselVisitStatistics } from "@2dmapv2/data/initWebSocketData";
import { socketioSubModule_statustables } from "@2dmapv2/data/initWebSocketData";
import { socketioSubModule_infocard_container } from "@2dmapv2/data/initWebSocketData";

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
