import * as THREE from "three";
import { WithClassInstanceMap } from "@source/core/Mixins/ClassInstanceMap";

type TEventMap = {
  resize: { type: "resize"; message: { viewportElement: HTMLElement; width: number; height: number } };
};

/**
 * ViewportResizeDispatcher:
 * 注册viewport视口变化的回调函数(且注册时刻即触发一次)
 * [window.ResizeObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
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
   * 当视口窗口被重置大小时出发函数
   * @param listener
   */
  addResizeEventListener(listener: THREE.EventListener<TEventMap["resize"], "resize", this>): void {
    this.addEventListener("resize", listener);

    this.dispatchEvent({
      type: "resize",
      message: { viewportElement: this.viewportElement, width: this.width, height: this.height },
    });
  }
}
