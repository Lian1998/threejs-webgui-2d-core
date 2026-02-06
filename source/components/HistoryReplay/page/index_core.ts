import { SocketioMainModule } from "@2dmapv2/classes/SocketioHelper";
import { socketioMainModule } from "@2dmapv2/classes/SocketioHelper";
import { getTimeStampForSocketReq } from "@2dmapv2/classes/SocketioHelper";
import dayjs from "dayjs";

import { reactive } from "vue";
import { historyReplayDefine_doms } from "./define_doms";
import { historyReplayDefine_layers } from "./define_layers";
import { _socketioMainModule } from "./define_infocards";
import { historyReplayDefine_infoCards } from "./define_infocards";
import { historyReplayDefine_socketioSubModules } from "./define_socketioSubModules";

import { timePicked, timePickedClear } from "./index_ui";
import { sliderMin } from "./index_ui";
import { sliderMax } from "./index_ui";
import { sliderValue } from "./index_ui";
import { xSpeed } from "./index_ui";
import { importBtnLoading } from "./index_ui";
import { exportBtnLoading } from "./index_ui";
import { on_calculateMarks } from "./index_ui";
import { on_sliderTrackAddChange } from "./index_ui";

import { default as pako } from "pako";
import * as msgpack from "@msgpack/msgpack";

// 帧数据
type TickResponse = Partial<{
  data: { itemName: string | "historyReplayTickHeartbeat" | "historyReplayTickEnd"; itemValue: any }[];
  timestamp: number;
  dbTimestamp: number;
}>;

// 帧数据容器
export const iticksMap = new Map<number, TickResponse[]>();
export const ticksMap = new Map<number, TickResponse[]>();
export const dbticksMap = new Map<number, TickResponse[]>();

// 提示词
const MESSAGE_NEED_WAIT = "请等待服务器推送数据";
const MESSAGE_FINISHED = "历史回放已结束";
const MESSAGE_0TICK = "当前选择时间段内UA无信息推送";
const MESSAGE_ERRORFILE = "文件格式损坏";

// 状态
let _ticksMapLastkey = undefined; // 当前已加载的最新tick对应的时间戳key(算进度条百分比)
const dbTicksRecord: Record<number, boolean> = {}; // 记录请求过的db信息时间戳
export const historyReplayStatus = reactive({
  pickTimeConfirmed: false, // 是否确认选择的时间段
  initializedUA: false, // 是否UA已经完成初始化
  finishedUA: false, // 是否所有数据已经请求完毕
  playing: false, // 是否正在播放
});

/** 向Java后端(对UA)发起历史回放订阅  */
export const historyReplaySub = () => {
  // 转换为开始和结束的时间戳
  const startTimeStamp = timePicked.value[0].toDate().getTime();
  const endTimeStamp = timePicked.value[1].toDate().getTime();
  const lengthTimeStamp = endTimeStamp - startTimeStamp; // 总时长
  _ticksMapLastkey = startTimeStamp; // 初始化记载key

  // 初始化UI
  historyReplayDefine_doms(); // 去除UI
  historyReplayDefine_layers(); // 去除Openlayers层
  historyReplayDefine_socketioSubModules(); // 去除多余的订阅

  // 清屏点位
  clearHistories();

  // 记录全局的历史回放状态
  window["WEBGUI_HistoryReplay"] = true;

  // 注册阻塞
  let timeStamp_sequence_first = undefined; // 客户端的本地时间(回放事件第一帧代表UA初始化完毕)
  socketioMainModule.beforeDispatch = (response: TickResponse) => {
    const timeStamp = response.timestamp; // UA信息时间戳
    const dbTimestamp = response.dbTimestamp; // db信息时间戳

    // 如果是db信息时间戳
    if (dbTimestamp) handleDBTick(dbTimestamp, response);
    // 如果是UA信息时间戳
    else if (timeStamp) {
      const timeStamp_sequence = timeStamp - startTimeStamp; // tick时间(相对于回放开始时间)
      // 如果此事件发生在回放开始之前, 那么直接播放
      if (timeStamp_sequence <= 0) {
        if (!iticksMap.get(timeStamp)) iticksMap.set(timeStamp, []);
        iticksMap.get(timeStamp).push(response);
        return false;
      }
      // 如果此事件发生在回放开始之后, 那么记录到tick事件表
      else {
        // 第一帧(非历史)回放数据
        if (timeStamp_sequence_first === undefined) {
          timeStamp_sequence_first = Date.now();
          historyReplayStatus.initializedUA = true;
          console.warn("历史数据初始化完成, 后端开始传输回放数据");
        }

        if (!ticksMap.get(timeStamp)) ticksMap.set(timeStamp, []);
        ticksMap.get(timeStamp).push(response); // 存放到放送帧容器
        _ticksMapLastkey = timeStamp; // 记录记载key
        on_sliderTrackAddChange((timeStamp - startTimeStamp) / lengthTimeStamp); // 更新加载进度条

        // 后端大概是每30s推送(一批)60s内的数据
        // 心跳格式 { "id": "20250415101531263105", "event": "messageReal", "data": [{ "itemName": "historyReplayTickHeartbeat"}] }
        // 最后一分钟查询格式 { "id": "20250415101531263105", "event": "messageReal", "data": [{ "itemName": "historyReplayTickEnd"}] }
        if (response.data[0].itemName === "historyReplayTickEnd") {
          historyReplayStatus.finishedUA = true;
          _ticksMapLastkey = endTimeStamp; // 记录记载key
          on_sliderTrackAddChange(1.0);
        }
      }
    }

    return true; // 默认阻塞时间分发
  };

  // 历史回放请求
  const _startTimeSocket = dayjs(startTimeStamp).format("YYYY-MM-DD HH:mm:ss"); // 后端接收的时间模板 2025-04-01 14:29:29
  const _endTimeSocket = dayjs(endTimeStamp).format("YYYY-MM-DD HH:mm:ss");
  socketioMainModule.socket.emit("subReal", { id: getTimeStampForSocketReq(), event: "subHistory", data: [_startTimeSocket, _endTimeSocket, "1"] }); // prettier-ignore

  // 初始化InfoCard
  historyReplayDefine_infoCards();
};

/** 向Java后端(对DB)历史数据查询  */
export const historyDBSub = (dbTimestamp: number) => {
  // 如果这个时间点已经请求过db信息
  if (dbTicksRecord[dbTimestamp]) {
    const responses = dbticksMap.get(dbTimestamp);
    if (Array.isArray(responses)) {
      setTimeout(() => dispatchResponsesBatch(_socketioMainModule, responses), 2000);
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        dispatchMapDBTick(response);
      }
    }
    return;
  }
  dbTicksRecord[dbTimestamp] = true; // 记录当前时刻的db请求记录
  const _date = dayjs(dbTimestamp).format("YYYY-MM-DD HH:mm:ss");
  socketioMainModule.socket.emit("reqHisDbData", {
    id: getTimeStampForSocketReq(),
    event: "reqHisDbData",
    data: [_date],
  });
};

/** 处理推送过来的db信息 */
const handleDBTick = (dbTimestamp: number, response: TickResponse) => {
  dispatchMapDBTick(response);

  // 如果是普通弹窗信息, 那么点击弹窗后再通过_socketioMainModule进行转发
  if (!dbticksMap.get(dbTimestamp)) {
    dbticksMap.set(dbTimestamp, []);

    // 如果是第一次获取这个timeStamp的信息, 那么设置一个异步回调, 在第一帧推送的两秒后转发一遍所有的信息给_socketioMainModule
    // 将两秒内的数据推送到InfoCard对应的mainModule
    setTimeout(() => dispatchResponsesBatch(_socketioMainModule, dbticksMap.get(dbTimestamp)), 2000);
  }
  dbticksMap.get(dbTimestamp).push(response); // 存放到db帧容器
};

/** 处理推送过来的db信息 db信息中需要直接绘制到底图的部分 */
const dispatchMapDBTick = (response: TickResponse) => {
  // 如果是 DF.BlockArea,QcContainer,AhtRealStatus 那么需要绘制到底图
  let flag = false;
  if (!response || !Array.isArray(response.data)) return;
  for (let i = 0; i < response.data.length; i++) {
    const dataItem = response.data[i];
    const itemName = dataItem.itemName;
    if (flag === true) continue;
    if (itemName === "DF.BlockArea") flag = true;
    else if (itemName.endsWith("QcContainer")) flag = true;
    else if (itemName.endsWith("AhtRealStatus")) flag = true;
  }

  if (flag) dispatchResponsesBatch(socketioMainModule, [response]);
};

/** 异步函数睡x毫秒 */
const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/** 把所有订阅的点置空消息并且自己发送给自己一次 */
const clearHistories = () => {
  for (const [key, pointMapping] of socketioMainModule.mapping) {
    const event = pointMapping.event;
    for (let i = 0; i < pointMapping.eventTargets.length; i++) {
      const eventTarget = pointMapping.eventTargets[i];

      // 如果接收过数据, 并且数据是数组类型
      if (event.detail.value !== undefined) {
        if (Array.isArray(event.detail.value)) {
          event.detail.value = [];
          eventTarget.dispatchEvent(event);
          continue;
        }
      }
      event.detail.value = undefined; // 默认发送undefined
      eventTarget.dispatchEvent(event);
      continue;
    }
  }
};

// 播放事件uuid及此事件的状态
export const _historyReplayStartC: {
  eventLastKey: number;
  eventMap: Map<number, { playingStatus: boolean; intervalEvent: number }>;
} = {
  eventLastKey: undefined,
  eventMap: new Map(),
};

/** 播放历史回放 */
export const historyReplayStart = async (uuid: number) => {
  // 将此次点击播t放事件状态 抽象成对象 记录到容器
  const _uuid = uuid;
  const _c = { playingStatus: true, intervalEvent: undefined };
  _historyReplayStartC.eventLastKey = _uuid;
  _historyReplayStartC.eventMap.set(_uuid, _c);

  try {
    // 在每次点Play时判断是否当前时间已经超出了结束时间
    const endTimeStamp = timePicked.value[1].toDate().getTime();
    if (sliderValue.value >= endTimeStamp) throw new Error(MESSAGE_FINISHED); // 如果当前的滑动时间 >= 结束时间

    // 整理 initTicksResponses(初始帧数)
    const initTicksResponses = []; // 用于播放的容器
    for (const [key, value] of iticksMap) initTicksResponses.push(...value); // 初始化阶段数据
    // 找到当前时间戳对应的下一帧数据, 顺便统计所有播放过的内容
    let nextTickItem = undefined;
    if (ticksMap.size <= 0) throw new Error(MESSAGE_NEED_WAIT);
    const ticksIter = ticksMap.entries();
    do {
      const tickItem = ticksIter.next().value;
      if (!tickItem) throw new Error(MESSAGE_NEED_WAIT);
      initTicksResponses.push(...tickItem[1]);
      if (tickItem[0] >= sliderValue.value) {
        nextTickItem = tickItem; // 找到对应的下一帧数据
        console.warn("历史回放播放首帧数据", nextTickItem[0], `data length: ${nextTickItem[1].length}`);
      }
    } while (!nextTickItem);
    dispatchResponsesBatch(socketioMainModule, initTicksResponses); // 播放所有已经播放过的内容
    if (!nextTickItem) throw new Error(MESSAGE_0TICK); // 如果找不到下一帧数据, 可能是由于选择的时间段内UA压根没有事件统计

    // 时间轴运行
    const _xSpeed = xSpeed.value;
    const _xSpeed_time_step = 500.0 / (8.0 / 1.0);
    if (!_c.intervalEvent) {
      let intervalBefore = Date.now();
      _c.intervalEvent = window.setInterval(() => {
        try {
          if (_c.playingStatus === false) return;
          if (!historyReplayStatus.finishedUA && sliderValue.value >= _ticksMapLastkey) throw new Error(MESSAGE_NEED_WAIT);

          const now = Date.now();
          const intervalGap = now - intervalBefore - _xSpeed_time_step;
          intervalBefore = now;
          sliderValue.value += (intervalGap + _xSpeed_time_step) * _xSpeed;
          // 如果是时间轴走完了
          if (sliderValue.value >= endTimeStamp) {
            sliderValue.value = endTimeStamp;
            throw new Error(MESSAGE_FINISHED);
          }
        } catch (err) {
          historyReplayStop(uuid);
          if (err.message) alert(err.message);
          return;
        }
      }, _xSpeed_time_step);
    }

    // 整理 accumilatedTicksResponses(累计帧)
    const accumilatedTicksResponses = [];
    const _xSpeed_tick_step_ = 500.0 / (8.0 / _xSpeed); // 刷新画面的时间间隔 1(62.5) 2(125.0) 4(250.0) 8(500.0)
    const _xSpeed_tick_step = _xSpeed_tick_step_ < 200.0 ? 200.0 : _xSpeed_tick_step_;
    do {
      // 由初始化Tick加载的规则可知, 这里这个条件恒成立 nextTickItem[0] >= sliderValue.value
      if (nextTickItem[0] <= sliderValue.value + _xSpeed_tick_step) {
        accumilatedTicksResponses.push(...nextTickItem[1]); // 上次迭代留下的响应体
        let _nextTickItem = nextTickItem; // 将下一间隔播放范围内的所有帧查出来
        do {
          _nextTickItem = ticksIter.next().value;
          if (!_nextTickItem) throw new Error(MESSAGE_NEED_WAIT);
          accumilatedTicksResponses.push(..._nextTickItem[1]);
          nextTickItem = _nextTickItem;
          if (nextTickItem[0] > sliderValue.value + _xSpeed_tick_step) _nextTickItem = undefined;
        } while (_nextTickItem);

        const sleepBefore = Date.now();
        await sleep(_xSpeed_tick_step); // 等待时间进入下一次迭代
        if (_c.playingStatus === false) return;
        const sleepGap = Date.now() - sleepBefore - _xSpeed_tick_step;
        sliderValue.value += sleepGap * _xSpeed;

        console.log("TickPush", sliderValue.value, `data length: ${accumilatedTicksResponses.length}`);
        dispatchResponsesBatch(socketioMainModule, accumilatedTicksResponses); // 播放统计的tick
        accumilatedTicksResponses.length = 0;
      }
      // 如果下一帧的播放时间超出了播放间隔
      else if (nextTickItem[0] > sliderValue.value + _xSpeed_tick_step) {
        const sleepTime = sliderValue.value - nextTickItem[0];
        await sleep(sleepTime); // 等待时间进入下一次迭代
        if (_c.playingStatus === false) return;
      }
    } while (nextTickItem);

    // 如果do while走完了 说明demo正常播放完毕
    historyReplayStop(uuid);
  } catch (err) {
    historyReplayStop(uuid);
    if (err.message) alert(err.message);
    return;
  }
};
/** 暂停历史回放 */
export const historyReplayStop = (uuid: number) => {
  const _uuid = uuid;
  const _c = _historyReplayStartC.eventMap.get(_uuid);
  _c.playingStatus = false; // 设置此次点击状态为暂停
  // 如果当前时间轴事件还没有被注销那么注销一下时间轴推进事件
  if (_c.intervalEvent) {
    window.clearInterval(_c.intervalEvent);
    _c.intervalEvent = undefined;
  }

  // 此次点击是最后一次点击 且当前UI为 播放状态 那么 把当前UI改为暂停状态
  if (_historyReplayStartC.eventLastKey === _uuid) {
    if (historyReplayStatus.playing === true) {
      historyReplayStatus.playing = false;
    }
  }
};

const _dispatchResponsesBatchC = new Set([]); // (减少批量分发时间时产生的宏任务)提升性能的缓存
/** 分发响应体 (减少批量分发时间时产生的宏任务)提升性能的缓存 */
export const dispatchResponsesBatch = (mainModule: SocketioMainModule, responses: TickResponse[]) => {
  // 1. 清理缓存容器中的CustromEvent
  _dispatchResponsesBatchC.clear();

  // 2. 将socketioMainModule中所有的已订阅点取出来, 并将影响到的CustomEvent存入缓存容器
  if (!Array.isArray(responses)) return;
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (!Array.isArray(response.data)) return;
    for (let j = 0; j < response.data.length; j++) {
      const element = response.data[j];
      const itemName = element["itemName"];
      const itemValue = element["itemValue"];
      const pointMapping = mainModule.mapping.get(itemName);
      if (pointMapping) {
        pointMapping.event.detail.value = itemValue;
        pointMapping.event.detail.response = response;
        _dispatchResponsesBatchC.add(pointMapping); // 这里不需要判断是否已经加入过容器, 因为Set是直接通过指针进行设置的
      }
    }
  }

  // 3. 遍历分发缓存容器中的CustromEvent
  for (const pointMapping of _dispatchResponsesBatchC) {
    for (let i = 0; i < pointMapping.eventTargets.length; i++) {
      const eventTarget = pointMapping.eventTargets[i];
      eventTarget.dispatchEvent(pointMapping.event);
    }
  }

  // 4. 遍历分发弹窗主模块相关的订阅点
  if (mainModule !== _socketioMainModule) dispatchResponsesBatch(_socketioMainModule, responses);
};

//////////////////////// 上传下载 ////////////////////////

const fileInputEl = document.createElement("input");
fileInputEl.type = "file";
const aEl = document.createElement("a");
type TICKFILE_STRUCT = {
  startTimeStamp: number;
  startTime: string;
  endTimeStamp: number;
  endTime: string;
  iticks: Array2<any>[];
  ticks: Array2<any>[];
};
/** 从文件中读取Ticks */
export const on_tickFileImport = () => {
  // 设置input回调事件
  fileInputEl.onchange = (event: InputEvent) => {
    importBtnLoading.value = true;

    const file = event["target"]["files"][0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      // 解析文件
      let struct = undefined;
      try {
        const buffer = e.target.result as ArrayBuffer;
        const compressedBuffer = new Uint8Array(buffer) as Uint8Array;
        const decompressed = pako.inflate(compressedBuffer) as Uint8Array;
        struct = msgpack.decode(decompressed);
        if (!struct["startTimeStamp"] || !struct["startTime"]) throw new Error(MESSAGE_ERRORFILE);
        if (!struct["endTimeStamp"] || !struct["endTime"]) throw new Error(MESSAGE_ERRORFILE);
        if (!struct["iticks"] || !struct["ticks"]) throw new Error(MESSAGE_ERRORFILE);
      } catch (err) {
        alert(err.message);
      } finally {
        importBtnLoading.value = false;
      }

      // 通知服务器, 需要关闭正常推流
      socketioMainModule.socket.emit("subReal", { id: getTimeStampForSocketReq(), event: "subHistory", data: [] });

      // 初始化帧
      iticksMap.clear(); // UA初始化帧
      struct.iticks.map((item: Array2<any>) => iticksMap.set(item[0], item[1]));
      ticksMap.clear(); // UA放送帧
      struct.ticks.map((item: Array2<any>) => ticksMap.set(item[0], item[1]));

      // 初始化UI
      historyReplayDefine_doms(); // 去除UI
      historyReplayDefine_layers(); // 去除Openlayers层
      historyReplayDefine_socketioSubModules(); // 去除多余的订阅
      timePickedClear();
      timePicked.value[0] = dayjs(struct.startTimeStamp); // 时间选择器 开始时间
      timePicked.value[1] = dayjs(struct.endTimeStamp); // 时间选择器 结束时间
      sliderMin.value = struct.startTimeStamp; // 滑动条 开始时间
      sliderMax.value = struct.endTimeStamp; // 滑动条 结束时间
      sliderValue.value = struct.startTimeStamp; // 滑动条 当前时间
      on_calculateMarks(struct.startTimeStamp, struct.endTimeStamp); // 滑动条 计算marks
      _ticksMapLastkey = struct.endTimeStamp; // 初始化记载key
      on_sliderTrackAddChange(1.0); // 滑动条 设置加载进度

      // 初始化状态
      historyReplayStatus.pickTimeConfirmed = true; // 状态 已选择时间
      historyReplayStatus.initializedUA = true; // 状态 已初始化UA
      historyReplayStatus.finishedUA = true; // 状态 已经完成UA放送帧请求

      // 清屏点位
      clearHistories();

      // 记录全局的历史回放状态
      window["WEBGUI_HistoryReplay"] = true;

      // 注册阻塞
      socketioMainModule.beforeDispatch = (response) => {
        const dbTimestamp = response["dbTimestamp"]; // db信息时间戳
        if (dbTimestamp) handleDBTick(dbTimestamp, response);
        return true;
      };

      // 放送到播放帧
      setTimeout(() => {
        const initTicksResponses = []; // 存储找到此下一帧前的所有历史数据
        for (const [key, value] of iticksMap) initTicksResponses.push(...value); // 初始化阶段数据
        dispatchResponsesBatch(socketioMainModule, initTicksResponses);

        // 初始化InfoCard
        historyReplayDefine_infoCards();
      }, 0);
    };
    reader.readAsArrayBuffer(file); // 读取为二进制缓冲
  };
  fileInputEl.click(); // 模拟dom点击
};
/** 导出Ticks到文件并提供下载 */
export const on_tickFileExport = () => {
  try {
    const struct: TICKFILE_STRUCT = {
      startTimeStamp: timePicked.value[0].toDate().getTime(),
      startTime: timePicked.value[0].format("YYYY-MM-DD HH:mm:ss"),
      endTimeStamp: timePicked.value[1].toDate().getTime(),
      endTime: timePicked.value[1].format("YYYY-MM-DD HH:mm:ss"),
      iticks: Array.from(iticksMap.entries()),
      ticks: Array.from(ticksMap.entries()),
    };
    const encoded = msgpack.encode(struct) as Uint8Array;
    const compressed = pako.deflate(encoded) as Uint8Array;
    const blob = new Blob([compressed], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    aEl.href = url;
    aEl.download = `aimp.qinzhou.${struct.startTime}_${struct.endTime}.v1ticks`; // 自定义下载的文件名
    aEl.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.msg);
  } finally {
    exportBtnLoading.value = false;
  }
};

//////////////////////// 暴露API /////////////////////////

/** 查看帧数据信息 */
window["historyReplayPeek"] = () => {
  if (historyReplayStatus.pickTimeConfirmed) {
    console.warn("历史回放三个容器状态");
    console.warn("iticksMap", iticksMap);
    console.warn("ticksMap", ticksMap);
    console.warn("dbticksMap", dbticksMap);
  }
};

/** 查找帧数据信息 */
window["historyReplayQuery"] = (subject: string, startTime: string, endTime: string) => {
  const _results = [];
  const _startTimeStamp = dayjs(startTime).toDate().getTime();
  const _endTimeStamp = dayjs(endTime).toDate().getTime();

  for (const [key, value] of ticksMap) {
    if (key < _startTimeStamp) continue;
    if (key > _endTimeStamp) continue;

    for (let i = 0; i < value.length; i++) {
      const response = value[i];
      let flag = false;
      for (let j = 0; j < response.data.length; j++) {
        const dataItem = response.data[j];
        if (dataItem.itemName === subject) flag = true;
      }
      if (flag) _results.push(response);
    }
  }
  console.warn("historyReplayQuery", _results);
};

// historyReplayPeek()
// historyReplayQuery("DF.VMS.V005.AhtRealStatus", "2025-06-24 13:38:54", "2025-06-24 13:39:10");
