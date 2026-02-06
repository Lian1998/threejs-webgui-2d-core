import { ticksMap } from "./index_core";
import { iticksMap } from "./index_core";
import { dbticksMap } from "./index_core";
import { dispatchResponsesBatch } from "./index_core";

import { SocketioMainModule } from "@2dmapv2/classes/SocketioHelper";
import { sliderValue } from "./index_ui";

import { socketioSubModule_infocard_igv } from "@2dmapv2/data/initWebSocketData";
import { socketioSubModule_infocard_qc } from "@2dmapv2/data/initWebSocketData";
import { socketioSubModule_infocard_yc } from "@2dmapv2/data/initWebSocketData";

export const _socketioMainModule = new SocketioMainModule({ autoConnect: false, autoListenMessageReal: false });

/** 设置InfoCard对应的SocketioSubModule子模块 */
export const historyReplayDefine_infoCards = () => {
  // 1. dispose掉所有当前已存在的弹窗订阅

  // prettier-ignore
  const need = [
    socketioSubModule_infocard_igv,
    socketioSubModule_infocard_qc,
    socketioSubModule_infocard_yc,
  ];
  need.forEach((item) => item.dispose());

  // 2. 给 igv qc 弹窗的 subModule 换 新mainModule
  // 3. 每次触发 subModule.subReal 函数时, 从 databaseInformations 中取数据, 并且通过 dispatchResponsesBatch 向 新 mainModule 发送
  need.forEach((socketioSubModule) => {
    socketioSubModule.socketioMainModule = _socketioMainModule;
    socketioSubModule.afterSubReal = afterInfoCardSubReal;
  });
};

const afterInfoCardSubReal = (points: string[]) => {
  console.warn("历史回放拦截弹窗订阅事件", points);
  const _sliderValue = sliderValue.value;

  // 打开弹窗时查询一下所有历史帧(比如 IGV的箱信息 和 QC的吊具信息 两者推送数据的逻辑有别)

  const beforeTicksResponses = []; // 存储找到此下一帧前的所有历史数据
  for (const [key, value] of iticksMap) beforeTicksResponses.push(...value); // 初始化阶段数据
  // 找到当前时间戳对应的下一帧数据, 顺便统计所有播放过的内容
  let nextTickItem = undefined;
  const mapIter = ticksMap.entries();
  do {
    const tickItem = mapIter.next().value;
    if (!tickItem) continue;
    const timeStamp = tickItem[0];
    const responses = tickItem[1];
    beforeTicksResponses.push(...responses);
    if (timeStamp > _sliderValue) nextTickItem = tickItem; // 找到对应的下一帧数据
  } while (!nextTickItem);
  if (beforeTicksResponses.length) {
    dispatchResponsesBatch(_socketioMainModule, beforeTicksResponses); // 播放所有已经播放过的内容
  }

  // 找到当前进度条向前最近一次请求的任务信息
  let smallestGap = undefined; // 当前进度条前, 距离最近的db信息请求时刻
  let smallestGap_responses = undefined; // 对应的报文数组
  for (const [key, value] of dbticksMap) {
    let gap = _sliderValue - key;
    if (gap < 0) continue; // 如果请求时刻在当前时刻右边那么直接不做统计

    if (!smallestGap) {
      smallestGap = gap;
      smallestGap_responses = value;
      continue;
    }

    if (smallestGap > gap) {
      smallestGap = gap;
      smallestGap_responses = value;
    }
  }
  if (smallestGap) {
    dispatchResponsesBatch(_socketioMainModule, smallestGap_responses);
  }

  return true;
};
