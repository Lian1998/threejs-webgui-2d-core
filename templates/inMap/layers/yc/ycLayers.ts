import { ycLayer } from "@2dmapv2/inMap/";
import { ycTrolleyLayer } from "@2dmapv2/inMap/";

import { YCMap } from "@2dmapv2/data/";
import { YCInstance } from "@2dmapv2/classes/deviceInOpenlayers/YCInstance";

import { socketioSubModule_map as socketioHelper } from "@2dmapv2/data/";

/** 场桥相关图层初始化 */
export const initLayer = () => {
  ycLayer.set("selectable", true);
  ycLayer.set("resizeable", true);

  ycTrolleyLayer.set("resizeable", true);

  const YCInstancesMap = new Map<string, YCInstance>();

  YCMap.forEach((value, id) => {
    const ycInstance = new YCInstance(value.deviceAlias);
    YCInstancesMap.set(id, ycInstance);

    socketioHelper.registerListener<{ value: 22000; code: "DC01" }>(`DF.YC.${id}.ASCGantryCurPos`, (itemValue) => {
      // console.log(`DF.YC.${id}.ASCGantryCurPos`, itemValue);
      ycInstance.setGantryPosition(itemValue.value);
    });

    socketioHelper.registerListener<{ value: 22000; code: "DC01" }>(`DF.YC.${id}.ASCTrolleyCurPos`, (itemValue) => {
      ycInstance.setTrolleyPosition("mt", itemValue.value);
    });

    socketioHelper.registerListener<{ value: 1; code: "R601" }>(`DF.YC.${id}.ASCSpreaderSizeStatus`, (itemValue) => {
      // if (id === "R616") console.log(`DF.YC.${id}.ASCSpreaderSizeStatus`, itemValue);
      ycInstance.setContainers("mt", undefined, itemValue.value, undefined);
    });

    socketioHelper.registerListener<{ value: 2; code: "R601" }>(`DF.YC.${id}.ASCSpreaderTwistStatus`, (itemValue) => {
      // if (id === "R616") console.log(`DF.YC.${id}.ASCSpreaderTwistStatus`, itemValue);
      ycInstance.setContainers("mt", itemValue.value, undefined, undefined);
    });

    socketioHelper.registerListener<{
      cheId: "R602";
      orderId: "638862933203364875";
      commandId: "638862933203364875";
      orderStatus: "WORKING";
      commandStatus: "WORKING";
      update: "2025-06-23 09:53:31";
      containerWiRef: "5832698884867";
      moveKind: "LOAD";
      containerId: "HMMU6746770";
      destVehicleId: "D005";
      containerLength: "12192";
      originSlot: "YARD.61A.016.06.04";
      destinationSlot: "VESSEL.HMIR0014W.082.14.72";
      currentBay: "016";
      vehicleType: "IGV";
      vehicleId: "D005";
    }>(`DF.YC.${id}.AscTaskInfo`, (itemValue) => {
      // console.log(`DF.YC.${id}.AscTaskInfo`, itemValue);
      if (!itemValue) return;
      const moveKind = itemValue.moveKind;
      if (!moveKind) return;
      ycInstance.setContainers("mt", undefined, undefined, moveKind);
    });

    // prettier-ignore
    socketioHelper.subReal(undefined, 
      `DF.YC.${id}.ASCGantryCurPos`,
      `DF.YC.${id}.ASCTrolleyCurPos`,
      `DF.YC.${id}.ASCSpreaderSizeStatus`,
      `DF.YC.${id}.ASCSpreaderTwistStatus`,
      `DF.YC.${id}.AscTaskInfo`,
    );
  });

  window["YCInstancesMap"] = YCInstancesMap;
  // window.YCInstancesMap.get("R602").setContainers("mt", 1, 3, "卸船")
};
