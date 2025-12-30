import * as THREE from "three";
import { WithClassInstanceMap } from "@core/Mixins/ClassInstanceMap";

type TEventMap = {
  resize: { type: "resize"; message: { viewportElement: HTMLElement; width: number; height: number } };
};

/**
 * ViewportResizeDispatcher: 用于监听某个视口大小的变化更新
 * [window.ResizeObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
 */
export class ViewportResizeDispatcher extends WithClassInstanceMap(THREE.EventDispatcher<TEventMap>) {
  viewportElement: HTMLElement; // 当前监听的视口
  width: number; // 上一次变化记录的宽度
  height: number; // 上一次变化记录的高度

  constructor(viewportElement: HTMLElement) {
    super();

    this.viewportElement = viewportElement;

    // https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver
    const resizeObserver = new window.ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect; // 将需要的属性注册到类内部进行缓存
      this.width = width;
      this.height = height;

      // 这里手动触发一次对所有监听回调函数触发
      this.dispatchEvent({
        type: "resize",
        message: { viewportElement: this.viewportElement, width: this.width, height: this.height },
      });
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
      this.dispatchEvent({
        type: "resize",
        message: { viewportElement: this.viewportElement, width: this.width, height: this.height },
      });
    } catch (err) {}
  }
}
