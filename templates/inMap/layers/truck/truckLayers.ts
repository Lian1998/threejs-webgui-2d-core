import { igvLayer } from "@2dmapv2/inMap/index";
import { igvIdLayer } from "@2dmapv2/inMap/index";
import { igvRouteLayer } from "@2dmapv2/inMap/";

import { TRUCKMap } from "@2dmapv2/data/";
import { IGVInstance as TRUCKInstance } from "@2dmapv2/classes/deviceInOpenlayers/TruckInstance";

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

  const TRUCKInstanceMap = new Map<string, TRUCKInstance>();
  TRUCKMap.forEach((value, id) => {
    const truckInstance = new TRUCKInstance(value.deviceAlias);
    TRUCKInstanceMap.set(id, truckInstance);

    // operation 为 delete 删除集卡
    socketioHelper.registerListener<{ code: "D005"; x: 467315.82; y: 2499678.24; heading: 0; updated: 1750393952108 }>(`DF.AGV.${id}.AGVRealStatus`, (itemValue) => {
      // itemValue = { code: "T201", x: 300.0, y: 300.0, heading: 0, updated: 1750393952108 }; // 测试集卡
      // console.log(`DF.AGV.${id}.AGVRealStatus`, itemValue);

      if (itemValue && itemValue.x !== undefined && itemValue.y !== undefined) {
        truckInstance.setPosition(itemValue.x, itemValue.y);
      }

      if (itemValue && itemValue.heading !== undefined) {
        truckInstance.setRotation(getRotation(itemValue.heading / 100.0));
      }
    });

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
      truckInstance.setContainersInformationAndView(_itemValue);
    });

    socketioHelper.registerListener<{
      points: Array2<number>[];
      currentIndex: number;
    }>(`DF.AGV.${id}.AGVRoute`, (itemValue) => {
      // console.log(`DF.AGV.${id}.AGVRoute`, itemValue);
      try {
        truckInstance.setRoutePoints(itemValue.points, itemValue.currentIndex);
      } catch (err) {}
    });

    socketioHelper.registerListener<Array4<Array2<number>>[]>(`DF.AGV.${id}.AGVLockArea`, (itemValue) => {
      // console.log(`DF.AGV.${id}.AGVLockArea`, itemValue);
      try {
        truckInstance.setLockAreaPoints(itemValue);
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
};
