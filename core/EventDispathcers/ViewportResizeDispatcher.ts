import * as THREE from "three";
import { WithClassInstanceMap } from "@core/Mixins/";
import { MapControls } from "three/addons/controls/MapControls.js";

type Viewport = {
  id: string;
  rect: { x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number; size: THREE.Vector2 };
  camera: THREE.OrthographicCamera;
  controls?: MapControls;
  scene?: THREE.Scene;
};

/** resize事件 */
type TEventMap = {
  resize: {
    type: "resize";
    message: Viewport["rect"];
  };
};

/**
 * ViewportResizeDispatcher: 用于监听某个视口(在外部css驱动下)大小的变化更新
 *
 * **为什么需要此类?**
 * 假设将threejs的renderer.domElement手动挂载到div.container下, 再用css控制div.container下的这个canvas撑满div.container
 * 当div.container容器大小改变时, renderer.size并不会跟着容器的大小改变而改变, 意味着WebGLRenderer的size必须**手动地显式设置**
 *
 * 支持的特性:
 * 1. 使用 addResizeEventListener 注册监听后会立马调用一次注册的回调函数
 * 2. 回调函数中会暴露当前 viewportElementSize 和 rendererSize
 *
 * [window.ResizeObserver-MDN文档链接](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
 */
export class ViewportResizeDispatcher extends WithClassInstanceMap(THREE.EventDispatcher<TEventMap>) implements Viewport {
  id = THREE.MathUtils.generateUUID();
  rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, size: new THREE.Vector2(0, 0) };
  camera!: THREE.OrthographicCamera;
  controls?: MapControls;
  scene?: THREE.Scene;

  viewportElement?: HTMLDivElement = undefined;
  renderer: THREE.WebGLRenderer = undefined;
  private resizeObserver: ResizeObserver = undefined;

  constructor(...params: Parameters<ViewportResizeDispatcher["register"]>) {
    super();
    this.register(...params);
  }

  /**
   * 注册绑定的内容与 observer
   * @param renderer THREE.WebGLRenderer
   */
  register(renderer: THREE.WebGLRenderer) {
    this.dispose();

    this.renderer = renderer;

    const viewportElement = renderer.domElement.parentElement as HTMLDivElement;
    if (!viewportElement) throw new Error("在注册 ViewportResizeDispatcher 时, 没有找到对应的 viewportElement 容器");
    this.viewportElement = viewportElement;

    // https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver
    const resizeObserver = new window.ResizeObserver((entries) => {
      const { x, y, width, height, top, right, bottom, left } = entries[0].contentRect; // 将需要的属性注册到类内部进行缓存
      Object.assign(this.rect, { x, y, width, height, top, right, bottom, left }); // 更新一下当前的状态
      this.rect.size.set(width, height);
      this.renderer.setSize(width, height, false);
      this.dispatchEvent({ type: "resize", message: this.rect }); // 触发一次对所有监听回调函数触发
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
    listener({ type: "resize", message: this.rect, target: this });
  }
}
