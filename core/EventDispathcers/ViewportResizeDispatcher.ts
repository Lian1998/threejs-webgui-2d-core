import * as THREE from "three";
import { WithClassInstanceMap } from "@core/Mixins/ClassInstanceMap";

type TEventMap = {
  resize: {
    type: "resize";
    message: {
      viewportElementSize: { width: number; height: number };
      rendererSize: { width: number; height: number };
    };
  };
};

/**
 * ViewportResizeDispatcher: 用于监听某个视口大小的变化更新
 *
 * **为什么需要此类?**
 * 假设将threejs的renderer.domElement手动挂载到div.container下, 再用css控制div.container下的这个canvas撑满div.container
 * 当div.container容器大小改变时, renderer.size并不会跟着容器的大小改变而改变, 意味着WebGLRenderer的size必须**手动地显式设置**
 *
 * 支持的特性:
 * 1. 使用 addResizeEventListener 注册监听后会立马调用一次注册的回调函数
 * 2. 回调函数中会暴露当前 viewportElementSize 和 rendererSize
 *
 * [window.ResizeObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
 */
export class ViewportResizeDispatcher extends WithClassInstanceMap(THREE.EventDispatcher<TEventMap>) {
  renderer: THREE.WebGLRenderer = undefined;
  viewportElement: HTMLDivElement = undefined;
  private resizeObserver: ResizeObserver = undefined;
  message: TEventMap["resize"]["message"] = { viewportElementSize: { width: 0.0, height: 0.0 }, rendererSize: { width: 0.0, height: 0.0 } };

  constructor(...params: Parameters<ViewportResizeDispatcher["register"]>) {
    super();
    this.register(...params);
  }

  private _size = new THREE.Vector2(1.0, 1.0);

  /**
   * 注册绑定的内容与 observer
   * @param renderer THREE.WebGLRenderer
   */
  register(renderer: THREE.WebGLRenderer) {
    this.dispose();

    this.renderer = renderer;

    const viewportElement = renderer.domElement.parentElement as HTMLDivElement;
    if (!viewportElement) throw new Error("在注册 ViewportResizeDispatcher 时请为WebGLRenderer绑定一个容器");
    this.viewportElement = viewportElement;

    // https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver
    const resizeObserver = new window.ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect; // 将需要的属性注册到类内部进行缓存
      this.message.viewportElementSize.width = width;
      this.message.viewportElementSize.height = height;

      this.renderer.setSize(width, height);
      this.renderer.getSize(this._size);
      this.message.rendererSize.width = this._size.width;
      this.message.rendererSize.height = this._size.height;
      this.dispatchEvent({ type: "resize", message: this.message }); // 触发一次对所有监听回调函数触发
    });
    resizeObserver.observe(viewportElement);
    this.resizeObserver = resizeObserver;
  }

  /** 释放绑定的事件与 observer */
  dispose() {
    if (this.viewportElement) {
      if (this.resizeObserver) {
        try {
          this.resizeObserver.unobserve(this.viewportElement);
        } catch (e) {}
        this.resizeObserver.disconnect();
        this.resizeObserver = undefined;
      }
    }
  }

  /**
   * 注册对于视口发生变化的监听回调函数
   * @param listener
   */
  addResizeEventListener(listener: THREE.EventListener<TEventMap["resize"], "resize", this>): void {
    this.addEventListener("resize", listener);
  }
}
