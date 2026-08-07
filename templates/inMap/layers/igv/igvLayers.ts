import { igvLayer } from "@2dmapv2/inMap/index";
import { igvIdLayer } from "@2dmapv2/inMap/index";
import { igvRouteLayer } from "@2dmapv2/inMap/";

import { IGVMap } from "@2dmapv2/data/";
import { IGVInstance } from "@2dmapv2/classes/deviceInOpenlayers/IGVInstance";
import { isIGVId } from "@2dmapv2/inMap/projectUtils";

import { socketioSubModule_map as socketioHelper } from "@2dmapv2/data/";

const getRotation = (heading: number) => {
  if (heading > 0) heading = 360.0 - heading;
  else heading = -heading;
  return (heading * Math.PI) / 180.0;
};

/**
 * IGV 小车相关图层
 * igvLayer 小车图元
 * igvRouteLayer 小车轨迹图元
 *
 * initDevice => VMS 数据库IGV列表
 * DF.VMS.*.AhtRealStatus IGV实时状态 x, y, rotation
 * DF.VMS.AhtStatus IGV实时状态 ahtFleet
 */
export const initLayer = () => {
  igvLayer.set("selectable", true);
  igvLayer.set("resizeable", true);

  igvIdLayer.set("selectable", true);
  igvRouteLayer.set("selectable", true);

  const IGVInstanceMap = new Map<string, IGVInstance>();
  IGVMap.forEach((value, id) => {
    const igvInstance = new IGVInstance(value.deviceAlias);
    IGVInstanceMap.set(id, igvInstance);

    socketioHelper.registerListener<{
      cheId: "D002";
      containerId1: "HAMU3553025";
      containerDoorDirection1: null;
      containerSize1: "40";
      containerLengthCm1: 12192;
      containerHeightCm1: 2896;
      containerWeightKg1: 11890;
      containerPosition1: "UNKNOWN";
      containerType1: "GP";
      pointOfWork1: "DC01";
      moveKind1: "LOAD";
      moveStage1: "COMPLETE";
      containerId2: null;
      containerDoorDirection2: null;
      containerSize2: null;
      containerLengthCm2: null;
      containerHeightCm2: null;
      containerWeightKg2: null;
      containerPosition2: null;
      containerType2: null;
      pointOfWork2: null;
      moveKind2: null;
      moveStage2: null;
      originSlot1: "YARD.61B.094.01.02";
      destSlot1: "VESSEL.HMIR0014W.086.13.80";
      originSlot2: null;
      destSlot2: null;
    }>(`DF.AGV.${id}.ContainerInventory`, (itemValue) => {
      // console.log(`DF.AGV.${id}.ContainerInventory`, itemValue);
      const _itemValue = itemValue ?? {};
      // _itemValue.containerSize1 = 20;
      // _itemValue.containerSize2 = 20;
      igvInstance.setContainersInformationAndView(_itemValue);
    });

    socketioHelper.registerListener<{
      points: Array2<number>[];
      currentIndex: number;
    }>(`DF.AGV.${id}.AGVRoute`, (itemValue) => {
      // console.log(`DF.AGV.${id}.AGVRoute`, itemValue);
      try {
        igvInstance.setRoutePoints(itemValue.points, itemValue.currentIndex);
      } catch (err) {}
    });

    socketioHelper.registerListener<Array4<Array2<number>>[]>(`DF.AGV.${id}.AGVLockArea`, (itemValue) => {
      // console.log(`DF.AGV.${id}.AGVLockArea`, itemValue);
      try {
        igvInstance.setLockAreaPoints(itemValue);
      } catch (err) {}
    });

    // prettier-ignore
    socketioHelper.subReal(undefined,
      `DF.AGV.${id}.AGVRealStatus`,
      `DF.AGV.${id}.ContainerInventory`,
      `DF.AGV.${id}.AGVRoute`,
      `DF.AGV.${id}.AGVLockArea`,
    );
  });

  socketioHelper.registerListener<
    {
      itemName: string; // "T072";
      itemValue: {
        code: string; // "T072";
        x: number; // 0;
        y: number; // 0;
        heading: number; // 0;
        updated: number; // 1782454840091;
      };
      operation: "upsert" | "delete";
    }[]
  >(`DF.AGV.ALL.AGVRealStatus`, (itemValue) => {
    for (let i = 0; i < itemValue.length; i++) {
      const element = itemValue[i];

      // IGV
      if (!isIGVId(element.itemName)) continue;
      const igvInstance = IGVInstanceMap.get(element.itemName);
      if (!igvInstance) continue;
      // console.log(element.itemName, element.itemValue);
      if (element.itemName === "T001") console.log(element.itemName, element.itemValue);

      const { x, y, heading } = element.itemValue;

      if (x !== undefined && y !== undefined) {
        igvInstance.setPosition(x, y);
      }

      if (heading !== undefined) {
        igvInstance.setRotation(getRotation(heading / 100.0));
      }
    }
  });
  socketioHelper.subReal(undefined, `DF.AGV.ALL.AGVRealStatus`);
};
