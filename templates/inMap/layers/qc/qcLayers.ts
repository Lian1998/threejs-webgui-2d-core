import { qcLayer } from "@2dmapv2/inMap/";
import { qcTrolleyLayer } from "@2dmapv2/inMap/";

import { QCMap } from "@2dmapv2/data/";
import { QCInstance } from "@2dmapv2/classes/deviceInOpenlayers/QCInstance";

import { socketioSubModule_map as socketioHelper } from "@2dmapv2/data/";

/** 岸桥相关图层初始化 */
export const initLayer = () => {
  // @ts-ignore
  qcLayer.renderBuffer_ = 2000;

  qcLayer.set("selectable", true);
  qcLayer.set("resizeable", true);

  qcTrolleyLayer.set("resizeable", true);

  // if (!QCMap.size) {
  //   QCMap.set("QC071", { deviceAlias: "QC071", deviceName: "QC071", deviceType: "QC" });
  // }

  const QCInstancesMap = new Map<string, QCInstance>();

  QCMap.forEach((value, id) => {
    const qcInstance = new QCInstance(value.deviceAlias);
    QCInstancesMap.set(id, qcInstance);

    socketioHelper.registerListener<{ value: 22000; code: "DC01" }>(`DF.QC.${id}.QCGantryPos`, (itemValue) => {
      // console.log(`DF.QC.${id}.QCGantryPos`, itemValue);
      try {
        qcInstance.setGantryPosition(itemValue.value);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 11775; code: "DC01" }>(`DF.QC.${id}.QCMtTrolleyPos`, (itemValue) => {
      try {
        qcInstance.setTrolleyPosition("mtws", itemValue.value);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 920; code: "DC01" }>(`DF.QC.${id}.QCPtTrolleyPos`, (itemValue) => {
      try {
        qcInstance.setTrolleyPosition("pt", itemValue.value);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 2; code: "DC01" }>(`DF.QC.${id}.QCMtWsSprdTwist`, (itemValue) => {
      try {
        qcInstance.setContainers("mtws", itemValue.value, undefined, undefined);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 2; code: "DC04" }>(`DF.QC.${id}.QCPtSprdTwist`, (itemValue) => {
      try {
        qcInstance.setContainers("pt", itemValue.value, undefined, undefined);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 1; code: "DC01" }>(`DF.QC.${id}.QCMtWsSprdSize`, (itemValue) => {
      try {
        qcInstance.setContainers("mtws", undefined, itemValue.value, undefined);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 2; code: "DC04" }>(`DF.QC.${id}.QCPtSprdSize`, (itemValue) => {
      try {
        qcInstance.setContainers("pt", undefined, itemValue.value, undefined);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 1; code: "DC01" }>(`DF.QC.${id}.QCPfWsPadSize`, (itemValue) => {
      try {
        qcInstance.setContainers("pfws", 1, itemValue.value, undefined);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 1; code: "DC01" }>(`DF.QC.${id}.QCPfLsPadSize`, (itemValue) => {
      try {
        qcInstance.setContainers("pfls", 1, itemValue.value, undefined);
      } catch (err) {}
    });

    socketioHelper.registerListener<{ value: 1; code: "DC01" }>(`DF.QC.${id}.QCPfLsPadSize`, (itemValue) => {
      try {
        qcInstance.setContainers("pfls", 1, itemValue.value, undefined);
      } catch (err) {}
    });

    socketioHelper.registerListener<
      {
        name: "PT_L" | "PT_R" | "MT_WS_L" | "MT_WS_R" | "MT_LS_L" | "MT_LS_R" | "PF_LS_L" | "PF_LS_R" | "PF_WS_L" | "PF_WS_R";
        value: Partial<{
          containerHeightCm: number; // 259;
          containerId: string; // "cid179423258";
          containerLengthCm: number; // 610;
          containerPosition: string; // "中间";
          containerSize: number; // "20";
          containerType: string; // "干货箱";
          containerWeightKg: number; // 20061;
          doorDirection: string; // "高桩";
          moveKind: string; // "卸船";
          moveStage: string; // "作业中";
          pointOfWork: string; // "QC082";
          qcId: string; // "QC082";
        }>;
      }[]
    >(`DF.QC.${id}.QcContainer`, (itemValue) => {
      if (Array.isArray(itemValue)) {
        for (let i = 0; i < itemValue.length; i++) {
          const dataItem = itemValue[i];
          if (!dataItem) continue;
          const name = dataItem.name;
          if (!dataItem.value) continue;
          const moveKind = dataItem.value.moveKind;
          if (!moveKind) continue;
          const name_ = name.split("_").join("");
          const key = name_.slice(0, name_.length - 1).toLowerCase();
          qcInstance.setContainers(key, undefined, undefined, moveKind);
        }
      }
    });

    // prettier-ignore
    socketioHelper.subReal(undefined,
      `DF.QC.${id}.QCGantryPos`,
      `DF.QC.${id}.QCMtTrolleyPos`,
      `DF.QC.${id}.QCPtTrolleyPos`,
      `DF.QC.${id}.QCMtWsSprdTwist`,
      `DF.QC.${id}.QCPtSprdTwist`,
      `DF.QC.${id}.QCMtWsSprdSize`,
      `DF.QC.${id}.QCPtSprdSize`,
      `DF.QC.${id}.QCPfWsPadSize`,
      `DF.QC.${id}.QCPfLsPadSize`,
      `DF.QC.${id}.QcContainer`,
    );
  });

  window["QCInstancesMap"] = QCInstancesMap;
  // window.QCInstancesMap.get("DC01").setGantryPosition(22000);
  // window.QCInstancesMap.get("DC01").setTrolleyPosition("pt", 26000);
  // window.QCInstancesMap.get("DC01").setContainers("pt", 1, 3, "卸船");
  // window.QCInstancesMap.get("DC02").setContainers("pt", 2, undefined, undefined)
  // window.QCInstancesMap.get("DC02").setContainers("pt", 1, undefined, undefined)
};
