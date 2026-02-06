import { Manager } from "socket.io-client";
import { getAppEnvConfig } from "@/utils/env";
import dayjs from "dayjs";

/**
 * 生成X位随机数
 * @param digits 位数
 * @returns {number} 随机数
 */
export const generateRandomNumber = (digits: number): number => {
  const min = Math.pow(10, digits - 1); // 计算最小值
  const max = Math.pow(10, digits) - 1; // 计算最大值
  return Math.floor(Math.random() * (max - min + 1)) + min; // 生成随机数并返回
};

/**
 * 生成当前后端封装 SocketIO 的请求标记戳
 * {年4}{月2}{日2}{时2}{分2}{秒2}{毫秒3}{随机数3}
 * 此时间戳主要用于socketIO的调试
 * @returns
 */
export const getTimeStampForSocketReq = () => {
  // 2024-03-11 14:22:50
  // `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  // 2023  06  26  08  43  14  192  989
  // 年    月   日  时  分  秒  毫秒 随机数(3位)

  const dayjsObject = dayjs(Date.now());
  const year = dayjsObject.year();
  const month = dayjsObject.month();
  const day = dayjsObject.day();
  const hours = dayjsObject.hour();
  const minutes = dayjsObject.minute();
  const seconds = dayjsObject.second();
  const milliseconds = dayjsObject.millisecond();
  const randomNumber = generateRandomNumber(3) + "";

  const currentDateTimeString = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}` + randomNumber;
  return currentDateTimeString;
};

/** 点位所对应的事件与其所有订阅点的映射 */
type PointMapping = { event: CustomEvent; eventTargets: EventTarget[] };

/** 观察者子模块的回调函数(主模块调用) */
type SubModuleCallbackWrapped = (event: CustomEvent) => void;

/** 观察者子模块的回调函数(子模块注册) */
type SubModuleCallback<T> = (itemValue: T, response?: any) => void;

// 初始化SocketIO
const viteEnvs = getAppEnvConfig();
const manager = new Manager(viteEnvs.VITE_GLOB_MAP_WS_BASE_URL, {
  autoConnect: true, // 是否自动连接
  reconnectionAttempts: 3, // 重新连接尝试次数
  reconnectionDelayMax: 10000, // 重新连接延迟时间（毫秒）
  reconnection: true, // 是否自动重新连接
  transports: ["websocket"], // 协议
});

/**
 * 主模块
 * 1. 管理socketIO实例
 * 2. 管理所有子模块<=>订阅点映射
 * 3. 监听"messageReal"时按订阅事件点发出对应的自定义事件
 */
export class SocketioMainModule {
  static manager = manager;
  static defaultOption = { autoConnect: true, autoListenMessageReal: true };

  mapping: Map<string, PointMapping> = new Map();
  socket = undefined;
  beforeDispatch: (response: any) => boolean = undefined; // 当消息从后端发送到主模块,主模块准备遍历订阅事件并分发前调用
  beforeWrapperCall: (event: CustomEvent) => void = undefined; // (订阅事件分发时)在执行注册的监听器前执行
  afterWrapperCall: (event: CustomEvent) => void = undefined; // (订阅事件分发时)在执行注册的监听器后执行

  constructor(option?: typeof SocketioMainModule.defaultOption) {
    const _defaultOption = JSON.parse(JSON.stringify(SocketioMainModule.defaultOption));
    const optionsMerged = Object.assign(_defaultOption, option ?? {});
    // console.log("optionsMerged", optionsMerged);
    if (optionsMerged.autoConnect) this.connect();
    if (optionsMerged.autoListenMessageReal) this.listenMessageReal();
  }

  /** 客户端 SocketIOManager 建立连接 */
  connect() {
    if (!this.socket) {
      this.socket = SocketioMainModule.manager.socket("/");
      this.socket.on("connect", () => console.log("Data socket connected!"));
      this.socket.on("reconnect", () => console.error("Data socket reconnect!"));
      this.socket.on("connect_error", () => console.error("Data socket connect error!"));
      this.socket.on("disconnect", () => {
        console.error("Data socket disconnect!");
        window.alert("实时推送端口已断开, 请刷新页面后重试~");
        window.location.reload();
      });
      this.socket.open();
    }
  }

  /** 监听 messageReal 事件 */
  listenMessageReal() {
    // 收到响应订阅的消息时 找到所有订阅此点的事件, 修改其details信息, 并进行分发
    this.socket.on("messageReal", async (response: any) => {
      if (!Array.isArray(response.data)) return;
      if (this.beforeDispatch && this.beforeDispatch(response)) return; // 是否被回调阻塞
      for (let i = 0; i < response.data.length; i++) {
        const element = response.data[i];
        const itemName = element["itemName"];
        const itemValue = element["itemValue"];
        const pointMapping = this.mapping.get(itemName);
        if (pointMapping) {
          pointMapping.event.detail.value = itemValue;
          pointMapping.event.detail.response = response;
          for (let j = 0; j < pointMapping.eventTargets.length; j++) {
            const eventTarget = pointMapping.eventTargets[j];
            eventTarget.dispatchEvent(pointMapping.event);
          }
        }
      }
    });
  }
}

/**
 * 子模块可以生成多个实例(在多个jsModule中使用同一个子模块实例)
 * 1. 针对单个事件点订阅 注册回调函数
 * 2. 子模块在注销时
 *      1. 清除对订阅点监听的多个回调
 *      2. 并且遍历一遍主模块, 如果存在没有子模块订阅的订阅点那么对该订阅点做出取消订阅的动作
 */
class SocketioSubModule extends EventTarget {
  scope: SocketioSubModule = undefined;
  socketioMainModule: SocketioMainModule = undefined;
  mapping: Map<string, SubModuleCallbackWrapped[]> = undefined;
  afterSubReal: (points: string[]) => boolean;

  constructor(socketioMainModule: SocketioMainModule) {
    super();
    this.scope = this;
    this.socketioMainModule = socketioMainModule;
    this.mapping = new Map();
  }

  /** 注册对某个事件的监听函数 */
  registerListener<T>(point: string, callback: SubModuleCallback<T>) {
    const pointMapping = this.socketioMainModule.mapping.get(point);
    // 如果主模块没有注册过这个事件点
    if (!pointMapping) {
      this.socketioMainModule.mapping.set(point, {
        event: new CustomEvent(point, { detail: { value: undefined } }),
        eventTargets: [this.scope],
      });
    }
    // 如果主模块注册过这个事件点
    else {
      if (!pointMapping.eventTargets.includes(this.scope)) {
        pointMapping.eventTargets.push(this.scope);
      }
    }

    const callbackWrapped = this.generateCallBackMapper(callback); // 生成调用栈回调函数
    const eventTargets = this.mapping.get(point);
    // 如果子模块没有订阅过这个事件点
    if (!eventTargets) this.mapping.set(point, [callbackWrapped]);
    // 如果子模块订阅过这个事件点
    else eventTargets.push(callbackWrapped);

    this.addEventListener(point, callbackWrapped);
  }

  /** 发出订阅事件 */
  subReal(requestId: string, ...points: string[]) {
    if (this.socketioMainModule.socket) {
      if (!points.length) return;
      if (!requestId) requestId = getTimeStampForSocketReq();
      this.socketioMainModule.socket.emit("subReal", { id: requestId, event: "subReal", data: [...points] });
    }
    if (this.afterSubReal) this.afterSubReal(points);
  }

  /** 解除子模块订阅 */
  dispose() {
    const needDispose = [];
    this.mapping.forEach((value, key) => {
      // 注销所有的回调事件
      for (let i = 0; i < value.length; i++) {
        const callbackWrapped = value[i];
        this.removeEventListener(key, callbackWrapped);
      }

      // 判断是否需要发出解除订阅事件
      const pointMapping = this.socketioMainModule.mapping.get(key);
      if (!pointMapping) return;
      // 如果当前子模块是最后一个订阅此点的子模块
      if (pointMapping.eventTargets.length === 1 && pointMapping.eventTargets.includes(this.scope)) {
        this.socketioMainModule.mapping.delete(key);
        // 发出解除订阅事件
        needDispose.push(key);
      }
      // 如果当前模块并不是最后一个订阅此点的子模块
      else {
        const index = pointMapping.eventTargets.findIndex((item) => item == this.scope);
        if (index !== -1) pointMapping.eventTargets.splice(index, 1);
      }
    });

    console.warn("需要解除订阅的点", needDispose);

    if (this.socketioMainModule.socket) {
      if (!needDispose.length) return;
      this.socketioMainModule.socket.emit("unsubReal", { event: "unsubReal", data: needDispose });
    }
  }

  /** 生成具有切片回调函数的调用栈 */
  generateCallBackMapper<T>(callback: SubModuleCallback<T>) {
    return async (event: CustomEvent) => {
      const beforeWrapperCall = this.socketioMainModule.beforeWrapperCall;
      if (beforeWrapperCall) beforeWrapperCall(event);

      const itemValue = event.detail.value;
      const response = event.detail.response;
      callback(itemValue, response);

      const afterWrapperCall = this.socketioMainModule.afterWrapperCall;
      if (afterWrapperCall) afterWrapperCall(event);
    };
  }
}

export const socketioMainModule = new SocketioMainModule();
export { SocketioSubModule };
