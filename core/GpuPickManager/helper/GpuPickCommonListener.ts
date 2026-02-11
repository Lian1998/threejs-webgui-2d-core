import { WithClassInstanceMap } from "@core/Mixins/ClassInstanceMap";
import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager";
import { GpuPickFeature } from "@core/GpuPickManager";
import throttle from "@libs/lodash/src/throttle";

/**
 * GpuPick在Threejs二维渲染中的常规绑定工具, 帮助进行逻辑事件管理
 */
export class GpuPickCommonListener extends WithClassInstanceMap(Object) {
  picker: GpuPickManager;
  scene: THREE.Object3D;
  camera: THREE.Camera;

  mousePosition = { x: 0.0, y: 0.0, clientX: 0.0, clientY: 0.0 };

  /**
   * 注册绑定的内容
   * @param picker GpuPickManager
   * @param scene THREE.Scene
   * @param camera THREE.Camera
   */
  register(picker: GpuPickManager, scene: THREE.Object3D = undefined, camera: THREE.Camera = undefined) {
    if (picker && picker.renderer && picker.renderer.domElement) {
      const oldDomElement = picker.renderer.domElement.parentElement; // OrbitControl会拦canvas的PoinerDown事件以阻止冒泡
      if (oldDomElement) {
        oldDomElement.removeEventListener("click", this.onDomClick);
        oldDomElement.removeEventListener("dblclick", this.onDomDoubleClick);
        oldDomElement.removeEventListener("mousemove", this.onDomMousemove);
      }
    }

    this.picker = picker;
    this.scene = scene;
    this.camera = camera;
    if (picker && picker.renderer && picker.renderer.domElement) {
      const newDomElement = picker.renderer.domElement.parentElement;
      const { x, y } = newDomElement.getBoundingClientRect();
      this.mousePosition.clientX = x;
      this.mousePosition.clientY = y;
      newDomElement.addEventListener("click", this.onDomClick);
      newDomElement.addEventListener("dblclick", this.onDomDoubleClick);
      newDomElement.addEventListener("mousemove", this.onDomMousemove);
    }
  }

  /**
   * 帮助从GpuPickFeature中调用对应的回调函数
   * @param feature GpuPickFeature
   * @param callback keyof GpuPickFeature
   */
  callFunction(feature: GpuPickFeature, callback: keyof GpuPickFeature) {
    const fn = feature?.[callback];
    typeof fn === "function" && fn.call(feature);
  }

  constructor(...params: Parameters<GpuPickCommonListener["register"]>) {
    super();
    this.register(...params);
  }

  inspected: Record<string, GpuPickFeature> = { featurePointer: undefined, lastMoveinFeaturePointer: undefined, lastSelectedFeaturePointer: undefined };
  _detect = () => {
    const { scene, camera, mousePosition, inspected } = this;
    const { pickid, object3d } = this.picker.pick(scene, camera, mousePosition.x, mousePosition.y);

    let feature = undefined;
    feature = object3d?.userData?.[GpuPickManager.className]?.feature;

    inspected.featurePointer = feature;

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
      this.callFunction(inspected.lastMoveinFeaturePointer, "onMoveout");
      inspected.lastMoveinFeaturePointer = undefined;
    }
    if (moveInFlag) {
      inspected.lastMoveinFeaturePointer = inspected.featurePointer;
      this.callFunction(inspected.lastMoveinFeaturePointer, "onMovein");
    }
  };
  onDetect = throttle(this._detect, 240, { trailing: true });

  singleClick = () => {
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
        this.callFunction(inspected.lastSelectedFeaturePointer, "onCancelSelected"); // 触发 cancelSelected
        inspected.lastSelectedFeaturePointer = undefined;
      }
    }

    // 新选中的
    this.callFunction(inspected.featurePointer, "onSelected");
    inspected.lastSelectedFeaturePointer = inspected.featurePointer;
  };

  ////////////////////////////////////// 监听DOM //////////////////////////////////////

  onDomMousemove = (e: MouseEvent) => {
    this.mousePosition.x = e.clientX - this.mousePosition.clientX;
    this.mousePosition.y = e.clientY - this.mousePosition.clientY;
    this.onDetect();
  };

  _clickEvent = undefined;

  onDomClick = (e: MouseEvent) => {
    if (this._clickEvent) {
      window.clearTimeout(this._clickEvent);
      this._clickEvent = undefined;
    }
    this._clickEvent = window.setTimeout(this.singleClick, 120);
  };

  onDomDoubleClick = (e: MouseEvent) => {
    window.clearTimeout(this._clickEvent);
    const { inspected } = this;
    this.callFunction(inspected.featurePointer, "onDoubleClicked");
  };
}
