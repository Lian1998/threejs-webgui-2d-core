import { ref } from "vue";
import { map } from "@2dmapv2/inMap";
import { selectPipeLine } from "@2dmapv2/inMap";
import { getLayerAndFeatureByDeviceID } from "@2dmapv2/inMap/projectUtils";

import { IGVMap } from "@2dmapv2/data";
import { QCMap } from "@2dmapv2/data";
import { YCMap } from "@2dmapv2/data";
import { TRUCKMap } from "@2dmapv2/data/";

export const deviceOptions = ref([]);
export const deviceType = ref("");
export const deviceNo = ref("");

/** 选中设备类型 */
export const onSelectDeviceType = () => {
  deviceOptions.value.length = 0;
  deviceNo.value = "";
  if (deviceType.value === "IGV") {
    IGVMap.forEach((value, key) => {
      deviceOptions.value.push({ value: key, label: key });
    });
  } else if (deviceType.value === "QC") {
    QCMap.forEach((value, key) => {
      deviceOptions.value.push({ value: key, label: key });
    });
  } else if (deviceType.value === "YC") {
    YCMap.forEach((value, key) => {
      deviceOptions.value.push({ value: key, label: key });
    });
  } else if (deviceType.value === "TRUCK") {
    TRUCKMap.forEach((value, key) => {
      deviceOptions.value.push({ value: key, label: key });
    });
  }
};

/** 选中设备编号 */
export const onSelectDevice = () => {
  if (!selectPipeLine) return;
  if (!deviceType.value) return;
  if (!deviceNo.value) return;

  const { layer, foundFeature, recommendZoomLevel } = getLayerAndFeatureByDeviceID(deviceNo.value);
  selectPipeLine.selectAndFocus(foundFeature, recommendZoomLevel);
};
