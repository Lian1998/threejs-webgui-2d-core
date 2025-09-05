import * as THREE from "three";
import { WithClassInstanceMap } from "./Mixins/ClassInstanceMap";

type TEventMap = {
  resize: { type: "resize"; message: { viewportElement: HTMLElement; width: number; height: number } };
};

/**
 * [window.ResizeObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
 * 注册viewport视口变化的回调函数(注册时刻即触发一次)
 */
export class ViewportResizeDispatcher extends WithClassInstanceMap(THREE.EventDispatcher<TEventMap>) {
  viewportElement: HTMLElement;
  width: number;
  height: number;

  constructor(viewportElement: HTMLElement) {
    super();

    this.viewportElement = viewportElement;

    // 在初始化阶段就会立刻触发一次
    const resizeObserver = new window.ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect; // 将需要的属性注册到类内部进行缓存
      this.width = width;
      this.height = height;
      this.dispatchEvent({
        type: "resize",
        message: { viewportElement: this.viewportElement, width: this.width, height: this.height },
      });
    });
    resizeObserver.observe(viewportElement);
  }

  /**
   * 需要重写一下此函数, 在注册回到函数的时刻立刻进行调用
   * @param type 事件类型
   * @param listener 事件回调
   */
  override addEventListener<T extends Extract<keyof TEventMap, string>>(type: T, listener: THREE.EventListener<TEventMap[T], T, this>): void {
    if (this["_listeners"] === undefined) this["_listeners"] = {};

    const listeners = this["_listeners"];

    if (listeners[type] === undefined) {
      listeners[type] = [];
    }

    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);

      if (type === "resize") {
        this.dispatchEvent({
          type: "resize",
          message: { viewportElement: this.viewportElement, width: this.width, height: this.height },
        });
      }
    }
  }
}
