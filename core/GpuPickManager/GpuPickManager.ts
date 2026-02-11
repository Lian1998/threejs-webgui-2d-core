import * as THREE from "three";

import { encodeIdToRGB } from "./pickid";
import { decodeRGBToId } from "./pickid";

import { trans2PickBufferMaterial } from "./trans2PickBufferMaterial";

import { channel } from "./debug/";

import { WithClassInstanceMap } from "@core/Mixins/ClassInstanceMap";
/**
 * GpuPickManager 是一个基于 GPU 离屏渲染(RenderTarget)颜色编码 实现的 Three.js 物体拾取管理器;
 * **其核心思想是: 将每个已注册的 Object3D 映射为唯一的颜色值, 通过渲染到专用缓冲区并读取像素颜色, 从而反向解析得到被点击的对象;**
 * > 该类适用于需要高性能, 支持复杂材质与实例化网格(InstancedMesh)的场景拾取;
 *
 * 1. 支持 Mesh 与 InstancedMesh;
 * 2. 可用于复杂 shader / 自定义材质场景;
 * 3. 基于颜色编码, 理论支持 16,777,215 个对象;
 */
export class GpuPickManager extends WithClassInstanceMap(Object) {
  static readonly className = "GpuPickManager";
  renderer: THREE.WebGLRenderer;
  PositiveMap: Map<number, THREE.Object3D> = new Map(); // pickid => object3d
  NegativeMap: WeakMap<THREE.Object3D, number> = new WeakMap(); // object3d => pickid
  rt: THREE.WebGLRenderTarget;

  constructor(renderer: THREE.WebGLRenderer) {
    super();
    this.renderer = renderer;
    this.syncRendererStatus();

    this.rt = new THREE.WebGLRenderTarget(this.rendererStatus.rt.width, this.rendererStatus.rt.height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      samples: 0,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace,
    });
  }

  maxId = 0;
  private _allocIdRange(n: number) {
    const pickid = Math.max(1, this.maxId + 1);
    this.maxId = pickid + n - 1;
    return pickid;
  }

  /**
   * 注册一个需要拾取的图元
   * @param {THREE.Object3D} object3d 需要被注册的object3d
   * @returns pickid
   */
  register(object3d: THREE.Object3D): number {
    if (!object3d) return 0;
    if (this.NegativeMap.has(object3d)) return this.NegativeMap.get(object3d); // 如果已经注册过了

    let count = 1;
    if ((object3d as THREE.InstancedMesh).isInstancedMesh) count = (object3d as THREE.InstancedMesh).count; // 如果是instancedMesh 需要将当前计数一并传入
    const pickid = this._allocIdRange(count); // 对于Mesh来说是pickId, 对于InstancedMesh来说是startCount
    object3d.userData[GpuPickManager.className] = this.genUserData(); // 生成一个userData的数据模型
    const meshLike = object3d as THREE.Mesh | THREE.InstancedMesh;
    const userData = meshLike.userData[GpuPickManager.className] as ReturnType<typeof this.genUserData>;
    userData.originMaterial = meshLike.material; // 缓存初始材质
    if (!userData.originMaterial) throw new Error("GpuPickManager注册前请绑定渲染材质"); // 在注册object3d到此类时必须保证其拥有基础材质

    // Mesh
    if ((meshLike as THREE.Mesh).isMesh) {
      const material = userData.originMaterial as THREE.Material;

      // 生成 Uniforms.uPickColor
      const pickColorArr = encodeIdToRGB(pickid); // 将id转化成颜色数组
      userData.uniforms.uPickColor.value = new THREE.Color();
      userData.uniforms.uPickColor.value.setRGB(pickColorArr[0], pickColorArr[1], pickColorArr[2]); // 缓存颜色需要在编译阶段将此Color传递给shader对象

      const pickBufferMaterial = material.clone();
      trans2PickBufferMaterial(meshLike, material, pickBufferMaterial);
      userData.pickBufferMaterial = pickBufferMaterial;
    }

    // InstancedMesh
    else if ((meshLike as THREE.InstancedMesh).isInstancedMesh) {
    }

    // Others
    else {
      throw new Error("GpuPickManager 仅支持 Mesh 和 InstancedMesh");
    }

    // 设置Map
    this.PositiveMap.set(pickid, object3d);
    this.NegativeMap.set(object3d, pickid);

    return pickid;
  }

  /**
   * 渲染buffer并拾取出定义的物体信息
   * @param {THREE.Object3D} scene SceneGraph
   * @param camera 相机
   * @param clientX 光标在viewport中的x坐标
   * @param clientY 光标在viewport中的y坐标
   * @returns
   */
  pick(scene: THREE.Object3D, camera: THREE.Camera, clientX: number, clientY: number) {
    console.time(`GPUPickManager.pick render pickBuffer`);

    const rect = this.renderer.domElement.getBoundingClientRect();
    const dpr = this.renderer.getPixelRatio();
    const x = Math.floor((clientX - rect.left) * dpr);
    const y = Math.floor((rect.bottom - clientY) * dpr); // flip y for WebGL coords

    this._saveState(); // 保存渲染器状态
    this._swapMaterials(scene); // 切换材质并渲染pickBuffer

    // 切换渲染器状态为pickBuffer渲染状态
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0.0); // 设置清空颜色为透明色, 对应映射id的0
    this.renderer.setRenderTarget(this.rt);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    if (import.meta.env.MODE === "development") this._sendDebugFrame();
    this.renderer.setRenderTarget(null);

    this._restoreMaterial(scene); // 恢复材质
    this._restoreState(); // 恢复渲染器状态

    const pixel = new Uint8Array(1 * 1 * 4);
    this.renderer.readRenderTargetPixels(this.rt, x, y, 1, 1, pixel);

    // 拾取提取的颜色转化为id
    const _colors = Array.from(pixel);
    const pickid = decodeRGBToId(_colors);

    console.timeEnd(`GPUPickManager.pick render pickBuffer`);

    // 通过映射表找到提取的object3d
    return { pickid: pickid, object3d: this.PositiveMap.get(pickid) };
  }

  /////////////////// 视口状态 //////////////////

  rendererStatus = {
    size: new THREE.Vector2(),
    dpr: 0.0,
    rt: { width: 0.0, height: 0.0 },
  };
  /** 重算离线渲染的画布大小  */
  syncRendererStatus(width?: number, height?: number) {
    const size = this.rendererStatus.size;
    if (!this.renderer) throw new Error("请指定 GpuPickManager 的 renderer");
    if (!width || !height) this.renderer.getSize(size);
    else size.set(width, height);
    this.rendererStatus.dpr = this.renderer.getPixelRatio();

    const dpr = this.rendererStatus.dpr;
    this.rendererStatus.rt.width = Math.max(1, Math.floor(size.x * dpr));
    this.rendererStatus.rt.height = Math.max(1, Math.floor(size.y * dpr));
    if (this.rt) this.rt.setSize(this.rendererStatus.rt.width, this.rendererStatus.rt.height);
  }

  /////////////////// 渲染器状态 //////////////////

  private _prevState: Record<string, any> = {
    outputColorSpace: THREE.LinearSRGBColorSpace,
    toneMapping: THREE.NoToneMapping,
    autoClear: true,
    clearColor: new THREE.Color(),
    clearAlpha: 1.0,
  };

  /** 保存渲染器状态 */
  private _saveState() {
    this._prevState.outputColorSpace = this.renderer.outputColorSpace;
    this._prevState.toneMapping = this.renderer.toneMapping;
    this._prevState.autoClear = this.renderer.autoClear;
    this.renderer.getClearColor(this._prevState.clearColor);
    this._prevState.clearAlpha = this.renderer.getClearAlpha();
  }

  /** 恢复渲染器状态 */
  private _restoreState() {
    this.renderer.outputColorSpace = this._prevState.outputColorSpace;
    this.renderer.toneMapping = this._prevState.toneMapping;
    this.renderer.autoClear = this._prevState.autoClear;
    this.renderer.setClearColor(this._prevState.clearColor, this._prevState.clearAlpha);
  }

  /////////////////// 材质替换 //////////////////

  private _originVisibleSet = new Set<THREE.Object3D>();

  /** 生成注册后类的相关信息 */
  private genUserData = (): {
    originMaterial: THREE.Material | THREE.Material[];
    pickBufferMaterial: THREE.Material | THREE.Material[];
    uniforms: { uPickColor: { value: THREE.Color } };
    attributes: { aPickColor: THREE.BufferAttribute };
    feature: any;
    features: any[];
  } => {
    return {
      originMaterial: undefined,
      pickBufferMaterial: undefined,
      uniforms: { uPickColor: { value: undefined } },
      attributes: { aPickColor: undefined },
      feature: undefined,
      features: [],
    };
  };

  /** 遍历场景树将所有注册的物体的材质替换为pickBuffer渲染所需要的材质 */
  private _swapMaterials(root: THREE.Object3D) {
    this._originVisibleSet.clear();
    root.traverseVisible((child) => {
      if (!((child as THREE.Mesh).isMesh || (child as THREE.InstancedMesh).isInstancedMesh)) return;
      const pickid = this.NegativeMap.get(child);
      if (!pickid) {
        this._originVisibleSet.add(child);
        child.visible = false; // 标记为未注册, 不需要渲染到pickBuffer
        return;
      }
      const meshLike = child as THREE.Mesh | THREE.InstancedMesh;
      const userData = meshLike.userData[GpuPickManager.className] as ReturnType<typeof this.genUserData>;
      meshLike.material = userData.pickBufferMaterial;
    });
  }

  /** 遍历场景树将所有注册的物体的材质替换回pickBuffer渲染所需要的材质 */
  private _restoreMaterial(root: THREE.Object3D) {
    root.traverse((child) => {
      if (!((child as THREE.Mesh).isMesh || (child as THREE.InstancedMesh).isInstancedMesh)) return;
      const pickid = this.NegativeMap.get(child);
      if (!pickid) return;
      const meshLike = child as THREE.Mesh | THREE.InstancedMesh;
      const userData = meshLike.userData[GpuPickManager.className] as ReturnType<typeof this.genUserData>;
      meshLike.material = userData.originMaterial;
    });

    for (const child of this._originVisibleSet) {
      child.visible = true; // 如果在上次渲染pickBuffer时被标记为未注册, 恢复其visible状态
    }
  }

  /////////////////// 调试 //////////////////

  /** 向brodcastChannel发送消息 */
  private async _sendDebugFrame() {
    const width = this.rendererStatus.rt.width;
    const height = this.rendererStatus.rt.height;
    const buffer = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(this.rt, 0, 0, width, height, buffer);
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const bitmap = await createImageBitmap(imageData, { colorSpaceConversion: "none", imageOrientation: "flipY", premultiplyAlpha: "none" });
    channel.postMessage({ type: "frame", width, height, bitmap });
  }
}
