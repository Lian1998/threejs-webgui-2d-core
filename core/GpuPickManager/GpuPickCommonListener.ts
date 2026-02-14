import * as THREE from "three";

import { WithClassInstanceMap } from "@core/Mixins/ClassInstanceMap";
import { GpuPickManager } from "@core/GpuPickManager";
import { GpuPickFeature } from "@core/GpuPickManager";
import throttle from "@libs/lodash/src/throttle";

/**
 * GpuPickCommonListener
 *
 * 负责将鼠标事件 (移动 / 单击 / 双击) 转换为对 GpuPickManager 的拾取调用,
 * 并负责触发对应 GpuPickFeature 的回调 (onMovein/onMoveout/onSelected/onCancelSelected/onDoubleClicked)
 *
 * 设计要点:
 * 1. 通过读取渲染到离屏 pick buffer 的像素来确定当前鼠标所在的 feature;
 * 2. 使用 ResizeObserver 监听 canvas 大小和位移变更 (更可靠的元素尺寸检测);
 * 3. 对检测函数做节流 (throttle) 以减少频繁的 GPU 读像素开销;
 *
 * 使用:
 * const listener = new GpuPickCommonListener(renderer, scene, camera);
 */
export class GpuPickCommonListener extends WithClassInstanceMap(Object) {
  viewportElement: HTMLDivElement = undefined;
  private resizeObserver: ResizeObserver = undefined;
  manager: GpuPickManager = undefined;
  renderer: THREE.WebGLRenderer = undefined;
  scene: THREE.Scene | THREE.Group = undefined;
  camera: THREE.Camera = undefined;

  /** mousePosition 存储局部 canvas 坐标 (x, y) 和 canvas 左上角的 client 坐标 (clientX, clientY) */
  mousePosition = { x: 0.0, y: 0.0, clientX: 0.0, clientY: 0.0 };

  constructor(...params: Parameters<GpuPickCommonListener["register"]>) {
    super();
    this.register(...params);
  }

  /**
   * 注册绑定的内容与 observer
   * @param renderer THREE.WebGLRenderer
   * @param scene THREE.Scene
   * @param camera THREE.Camera
   */
  register(renderer: THREE.WebGLRenderer, scene: THREE.Scene | THREE.Group, camera: THREE.Camera) {
    if (!this.manager) this.manager = new GpuPickManager();
    this.dispose();

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    if (!(renderer.domElement && this.renderer.domElement.parentElement)) throw new Error("在注册 GpuPickCommonListener 时请为WebGLRenderer绑定一个容器");
    const viewportElement = this.renderer.domElement.parentElement as HTMLDivElement;
    this.viewportElement = viewportElement;
    this._onDomResize();
    this.resizeObserver = new ResizeObserver(() => this.onDomResize());
    this.resizeObserver.observe(this.viewportElement);

    this.viewportElement.addEventListener("mousemove", this.onDomMousemove);
    this.viewportElement.addEventListener("click", this.onDomClick);
    this.viewportElement.addEventListener("dblclick", this.onDomDoubleClick);
  }

  /** 释放绑定的事件与 observer */
  dispose() {
    if (this.viewportElement) {
      try {
        this.viewportElement.removeEventListener("mousemove", this.onDomMousemove);
        this.viewportElement.removeEventListener("click", this.onDomClick);
        this.viewportElement.removeEventListener("dblclick", this.onDomDoubleClick);
      } catch (e) {}

      if (this.resizeObserver) {
        try {
          this.resizeObserver.unobserve(this.viewportElement);
        } catch (e) {}
        this.resizeObserver.disconnect();
        this.resizeObserver = undefined;
      }
    }
  }

  private inspected: Record<string, GpuPickFeature> = { featurePointer: undefined, lastMoveinFeaturePointer: undefined, lastSelectedFeaturePointer: undefined };

  private _onDetect = () => {
    const { scene, camera, mousePosition, inspected } = this;

    this.manager.rendPickBuffer(this.renderer, scene, camera);
    const { pickid, meshLike, featureData, exactFeature } = this.manager.readPickBuffer({ x: mousePosition.x, y: mousePosition.y });

    inspected.featurePointer = exactFeature;

    let moveInFlag = false;
    let moveOutFlag = false;

    // 拾取到
    if (inspected.featurePointer) {
      if (inspected.lastMoveinFeaturePointer) {
        // 新的和旧的不一样
        if (inspected.lastMoveinFeaturePointer !== inspected.featurePointer) {
          moveInFlag = true;
          moveOutFlag = true;
        }
      }
      // 旧的为空
      else if (inspected.lastMoveinFeaturePointer === undefined) {
        moveInFlag = true;
      }
    }
    // 没有拾取到, 以前是有的
    else if (inspected.featurePointer === undefined) {
      if (inspected.lastMoveinFeaturePointer) {
        moveOutFlag = true;
      }
    }

    if (moveOutFlag) {
      GpuPickCommonListener.callFeatureFunction(inspected.lastMoveinFeaturePointer, "onMoveout");
      inspected.lastMoveinFeaturePointer = undefined;
    }
    if (moveInFlag) {
      inspected.lastMoveinFeaturePointer = inspected.featurePointer;
      GpuPickCommonListener.callFeatureFunction(inspected.lastMoveinFeaturePointer, "onMovein");
    }
  };

  private onDetect = throttle(this._onDetect, 128, { leading: false, trailing: true });

  private singleClick = () => {
    const { inspected } = this;
    // 旧选中的
    if (inspected.lastSelectedFeaturePointer) {
      let cancelSelectedFlag = false;
      if (inspected.featurePointer && inspected.lastSelectedFeaturePointer !== inspected.featurePointer) {
        cancelSelectedFlag = true; // 点了新的
      } else if (inspected.featurePointer === undefined) {
        cancelSelectedFlag = true; // 点了空的
      }
      if (cancelSelectedFlag) {
        GpuPickCommonListener.callFeatureFunction(inspected.lastSelectedFeaturePointer, "onCancelSelected"); // 触发 cancelSelected
        inspected.lastSelectedFeaturePointer = undefined;
      }
    }

    // 触发新选中回调 (允许 featurePointer 为 undefined, callFeatureFunction 会安全处理)
    GpuPickCommonListener.callFeatureFunction(inspected.featurePointer, "onSelected");
    inspected.lastSelectedFeaturePointer = inspected.featurePointer;
  };

  ////////////////////////////////////// 监听DOM //////////////////////////////////////

  private _onDomResize = () => {
    const { x, y } = this.viewportElement.getBoundingClientRect();
    this.mousePosition.clientX = x;
    this.mousePosition.clientY = y;
  };

  private onDomResize = throttle(this._onDomResize, 128, { leading: false, trailing: true });

  private onDomMousemove = (e: MouseEvent) => {
    // 计算局部 canvas 坐标 (相对于 canvas 左上角)
    this.mousePosition.x = e.clientX - this.mousePosition.clientX;
    this.mousePosition.y = e.clientY - this.mousePosition.clientY;
    this.onDetect();
  };

  private _clickEvent = undefined;

  private onDomClick = (e: MouseEvent) => {
    if (this._clickEvent) {
      window.clearTimeout(this._clickEvent);
      this._clickEvent = undefined;
    }
    this._clickEvent = window.setTimeout(this.singleClick, 120);
  };

  private onDomDoubleClick = (e: MouseEvent) => {
    window.clearTimeout(this._clickEvent);
    const { inspected } = this;
    GpuPickCommonListener.callFeatureFunction(inspected.featurePointer, "onDoubleClicked");
  };

  ////////////////////////////////////// 工具 //////////////////////////////////////

  /**
   * 帮助从GpuPickFeature中调用对应的回调函数
   * @param feature GpuPickFeature
   * @param callback keyof GpuPickFeature
   */
  private static callFeatureFunction(feature: GpuPickFeature, callback: keyof GpuPickFeature) {
    const fn = feature?.[callback];
    typeof fn === "function" && fn.call(feature);
  }
}
