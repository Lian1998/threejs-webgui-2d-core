import { quayLayer } from "@2dmapv2/inMap/index";
import { vesselLayer } from "@2dmapv2/inMap/index";
import { bollardIdLayer } from "@2dmapv2/inMap/index";
import { bollardIdEvenLayer } from "@2dmapv2/inMap/index";
import { yardBaseLayer } from "@2dmapv2/inMap/index";
import { yardContainersLayer } from "@2dmapv2/inMap/index";
import { yardDoorsLayer } from "@2dmapv2/inMap/index";
import { yardBayBlockLayer } from "@2dmapv2/inMap/index";
import { rechLaneLayer } from "@2dmapv2/inMap/index";
import { pbLaneLayer } from "@2dmapv2/inMap/index";
import { mtLaneLayer } from "@2dmapv2/inMap/index";
import { qctpLaneLayer } from "@2dmapv2/inMap/index";
import { igvLockLayer } from "@2dmapv2/inMap/index";
import { igvRouteLayer } from "@2dmapv2/inMap/index";
import { igvBlockLayer } from "@2dmapv2/inMap/index";
import { igvBlockLayer9 } from "@2dmapv2/inMap/index";
import { igvLayer } from "@2dmapv2/inMap/index";
import { igvInventoryLayer } from "@2dmapv2/inMap/index";
import { igvPredefineBlockLayer } from "@2dmapv2/inMap/index";
import { ycInventoryLayer } from "@2dmapv2/inMap/index";
import { ycLayer } from "@2dmapv2/inMap/index";
import { ycTrolleyLayer } from "@2dmapv2/inMap/index";
import { qcInventoryLayer } from "@2dmapv2/inMap/index";
import { qcTrolleyLayer } from "@2dmapv2/inMap/index";
import { qcLayer } from "@2dmapv2/inMap/index";
import { qcCycleInfoLayer } from "@2dmapv2/inMap/index";
import { deviceStatusLayer } from "@2dmapv2/inMap/index";
import { igvLabelLayer } from "@2dmapv2/inMap/index";
import { igvIdLayer } from "@2dmapv2/inMap/index";
import { igvInfoLayer } from "@2dmapv2/inMap/index";
import { igvWorkingInfoLayer } from "@2dmapv2/inMap/index";
import { truckWorkingInfoLayer } from "@2dmapv2/inMap/index";
import { yardTruckInfoLayer } from "@2dmapv2/inMap/index";
import { infoLayer } from "@2dmapv2/inMap/index";
import { signalRangeLayer } from "@2dmapv2/inMap/index";
import { yardIdLayer } from "@2dmapv2/inMap/index";
import { yardBayIdLayer } from "@2dmapv2/inMap/index";

import { map } from "@2dmapv2/inMap/index";

/** 设置需要隐藏的Openlayers层 */
export const historyReplayDefine_layers = () => {
  igvIdLayer.setVisible(true);

  yardContainersLayer.setVisible(false);
  yardDoorsLayer.setVisible(false);
  yardBayBlockLayer.setVisible(false);
  rechLaneLayer.setVisible(false);
  mtLaneLayer.setVisible(false);
  qctpLaneLayer.setVisible(false);
  igvBlockLayer9.setVisible(false);
  igvPredefineBlockLayer.setVisible(false);
  qcCycleInfoLayer.setVisible(false);
  deviceStatusLayer.setVisible(false);
  igvLabelLayer.setVisible(false);
  igvWorkingInfoLayer.setVisible(false);
  truckWorkingInfoLayer.setVisible(false);
  yardTruckInfoLayer.setVisible(false);
  infoLayer.setVisible(false);
  signalRangeLayer.setVisible(false);

  setTimeout(() => {
    map.removeLayer(yardContainersLayer);
    map.removeLayer(yardDoorsLayer);
    map.removeLayer(yardBayBlockLayer);
    map.removeLayer(rechLaneLayer);
    map.removeLayer(mtLaneLayer);
    map.removeLayer(qctpLaneLayer);
    map.removeLayer(igvBlockLayer9);
    map.removeLayer(igvPredefineBlockLayer);
    map.removeLayer(qcCycleInfoLayer);
    map.removeLayer(deviceStatusLayer);
    map.removeLayer(igvLabelLayer);
    map.removeLayer(igvWorkingInfoLayer);
    map.removeLayer(truckWorkingInfoLayer);
    map.removeLayer(yardTruckInfoLayer);
    map.removeLayer(infoLayer);
    map.removeLayer(signalRangeLayer);

    setTimeout(() => {
      yardContainersLayer.dispose();
      yardDoorsLayer.dispose();
      yardBayBlockLayer.dispose();
      rechLaneLayer.dispose();
      mtLaneLayer.dispose();
      qctpLaneLayer.dispose();
      igvBlockLayer9.dispose();
      igvPredefineBlockLayer.dispose();
      qcCycleInfoLayer.dispose();
      deviceStatusLayer.dispose();
      igvLabelLayer.dispose();
      igvWorkingInfoLayer.dispose();
      truckWorkingInfoLayer.dispose();
      yardTruckInfoLayer.dispose();
      infoLayer.dispose();
      signalRangeLayer.dispose();
    });
  }, 0);
};
