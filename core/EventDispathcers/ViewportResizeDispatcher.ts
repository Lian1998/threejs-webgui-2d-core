import * as THREE from "three";
import { WithClassInstanceMap } from "@core/Mixins/ClassInstanceMap";

type TEventMap = {
  resize: {
    type: "resize";
    message: {
      viewportElement: HTMLElement;
      width: number;
      height: number;
      rwidth: number;
      rheight: number;
    };
  };
};

/**
 * ViewportResizeDispatcher: 用于监听某个视口大小的变化更新
 * [window.ResizeObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
 */
export class ViewportResizeDispatcher extends WithClassInstanceMap(THREE.EventDispatcher<TEventMap>) {
  viewportElement: TEventMap["resize"]["message"]["viewportElement"] = undefined;
  message: TEventMap["resize"]["message"] = {
    viewportElement: undefined,
    width: 0.0,
    height: 0.0,
    rwidth: 0.0,
    rheight: 0.0,
  };

  constructor(viewportElement: HTMLElement) {
    super();

    this.message.viewportElement = viewportElement;
    this.viewportElement = viewportElement;

    // https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver
    const resizeObserver = new window.ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect; // 将需要的属性注册到类内部进行缓存
      this.message.width = width;
      this.message.height = height;
      const dpr = window.devicePixelRatio;
      this.message.rwidth = Math.floor(width * dpr);
      this.message.rheight = Math.floor(height * dpr);

      // 这里手动触发一次对所有监听回调函数触发
      this.dispatchEvent({ type: "resize", message: this.message });
    });
    resizeObserver.observe(viewportElement);
  }

  /**
   * 注册对于视口发生变化的监听回调函数
   * @param listener
   */
  addResizeEventListener(listener: THREE.EventListener<TEventMap["resize"], "resize", this>): void {
    this.addEventListener("resize", listener);

    try {
      this.dispatchEvent({ type: "resize", message: this.message });
    } catch (err) {}
  }
}
