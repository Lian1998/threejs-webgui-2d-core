import * as THREE from "three";
import { trans2PickBufferMaterial } from "./trans2PickBufferMaterial";
import { GpuPickFeature } from "./index";
import { DEBUG_PICK_BUFFER_FRAME } from "./index";
import { DEBUG_PICK_BUFFER_RENDER_PERFORMANCE } from "./index";
import { channel } from "./debug/";

declare type MeshLike = THREE.Mesh | THREE.InstancedMesh;

/**
 * GpuPickCore 是一个基于 GPU 离屏渲染(RenderTarget)颜色编码 实现的 Three.js 物体拾取管理器;
 * **其核心思路是: 将每个已注册的 MeshLike 映射为唯一的颜色值, 通过渲染到专用缓冲区并读取像素颜色, 从而反向解析得到被点击的对象;**
 *
 * > 该类打造适用于需要高性能, 支持复杂材质与实例化网格(InstancedMesh)的场景拾取; 支持 Mesh 与 InstancedMesh; 可用于复杂 shader / 自定义材质场景; 基于颜色编码, 理论支持 16,777,215 个对象;
 *
 * 说明：
 * - 每个注册对象 (Mesh / InstancedMesh) 会被分配连续的 pickid (从 1 开始, 0 表示未命中)
 * - 对于普通 Mesh：为该 Mesh 分配一个 pickid (对应单一 feature)
 * - 对于 InstancedMesh：为每个实例分配连续 id, 并在 geometry 中设置 aPickColor 属性
 *
 * 使用约定：
 * - 在注册前 mesh 必须有 geometry 和 material (且 material 不能是数组)
 * - trans2PickBufferMaterial 必须能将原始材质转换为仅输出 pick color 的材质
 */
export class GpuPickManager {
  static PickBufferLayer = 31;
  static readonly className = "GpuPickManager";
  static positiveMap: Map<number, MeshLike> = new Map(); // pickid => MeshLike
  static negativeMap: WeakMap<MeshLike, number> = new WeakMap(); // MeshLike => pickid
  static featureDataMap: WeakMap<MeshLike, ReturnType<typeof this._generateFeatureData>> = new WeakMap(); // MeshLike => Feature
  static maxId = 0;
  renderer: THREE.WebGLRenderer = undefined;
  renderTarget: THREE.WebGLRenderTarget = undefined;
  rendererStatus = { size: new THREE.Vector2(1.0, 1.0), dpr: 0.0 };

  /**
   * 生成注册后mesh其相关的Feature的相关指针
   * @param count 如果单渲染材质绑定多个feature, 锁定feature数量
   */
  private static _generateFeatureData = (
    count: number,
  ): {
    type: THREE.Mesh["type"] | THREE.InstancedMesh["type"];
    feature: GpuPickFeature;
    features: GpuPickFeature[];
    originMaterial: THREE.Material;
    pickBufferMaterial: THREE.Material;
    uniforms: { uPickColor: { value: THREE.Color } };
    attributes: { aPickColor: THREE.BufferAttribute };
  } => {
    return {
      type: undefined,
      originMaterial: undefined,
      pickBufferMaterial: undefined,
      uniforms: { uPickColor: { value: undefined } },
      attributes: { aPickColor: undefined },
      feature: undefined,
      features: new Array(count),
    };
  };

  private static _allocIdRange(n: number) {
    const pickid = Math.max(1, this.maxId + 1);
    this.maxId = pickid + n - 1;
    return pickid;
  }

  constructor() {
    this.renderTarget = new THREE.WebGLRenderTarget(this.rendererStatus.size.width, this.rendererStatus.size.height, {
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

  /**
   * 注册一个需要拾取的 meshLike
   * @param {MeshLike} meshLike 需要被注册的 meshLike
   * @param {GpuPickFeature | GpuPickFeature[]} feature 该 meshLike 对应的 Feature 类
   * @returns 起始pickid
   */
  static register(meshLike: MeshLike, feature: GpuPickFeature | GpuPickFeature[]): number {
    if (!meshLike) return 0;
    if (!((meshLike as THREE.Mesh).isMesh || (meshLike as THREE.InstancedMesh).isInstancedMesh)) throw new Error("GpuPickManager 目前仅支持 Mesh 和 InstancedMesh");
    if (GpuPickManager.negativeMap.has(meshLike)) return GpuPickManager.negativeMap.get(meshLike); // 如果已经注册过了

    let count = 1;
    if ((meshLike as THREE.InstancedMesh).isInstancedMesh) count = (meshLike as THREE.InstancedMesh).count;
    const pickid = this._allocIdRange(count); // 内存分配指针空间起点

    GpuPickManager.featureDataMap.set(meshLike, GpuPickManager._generateFeatureData(count));
    const featureData = GpuPickManager.featureDataMap.get(meshLike);
    if (Array.isArray(meshLike.material)) throw new Error("GpuPickManager 无法注册绑定多个材质的网格");
    featureData.originMaterial = meshLike.material; // 缓存初始材质
    if (!featureData.originMaterial) throw new Error("GpuPickManager 注册前请绑定网格的材质"); // 在注册object3d到此类时必须保证其拥有基础材质

    meshLike.layers.enable(GpuPickManager.PickBufferLayer);
    featureData.type = meshLike.type;

    // Mesh
    if ((meshLike as THREE.Mesh).isMesh) {
      // 生成 uniforms.uPickColor
      const pickColorArr = encodeIdToRGB(pickid); // 将id转化成颜色数组
      featureData.uniforms.uPickColor.value = new THREE.Color();
      featureData.uniforms.uPickColor.value.setRGB(pickColorArr[0], pickColorArr[1], pickColorArr[2]); // 缓存颜色需要在编译阶段将此Color传递给shader对象
      featureData.feature = feature as GpuPickFeature;
    }

    // InstancedMesh
    else if ((meshLike as THREE.InstancedMesh).isInstancedMesh) {
      // 生成 attributes.aPickColor
      const aPickColorArray = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const _pickid = pickid + i;
        const pickColorArr = encodeIdToRGB(_pickid);
        const offset = i * 3;
        aPickColorArray[offset] = pickColorArr[0];
        aPickColorArray[offset + 1] = pickColorArr[1];
        aPickColorArray[offset + 2] = pickColorArr[2];
      }
      featureData.attributes.aPickColor = new THREE.BufferAttribute(aPickColorArray, 3);
      if (!meshLike.geometry) throw new Error("GpuPickManager 注册 InstancedMesh 时缺少 geometry");
      meshLike.geometry.setAttribute("aPickColor", featureData.attributes.aPickColor);
      if (!Array.isArray(feature) || count !== (feature as GpuPickFeature[]).length) throw new Error("GpuPickManager 注册 InstancedMesh 时请绑定 count 数量对应的 Feature 数组");
      featureData.features.length = 0;
      featureData.features.push(...(feature as GpuPickFeature[]));
    }

    // 克隆材质并转换为 pickBuffer 材质
    const material = featureData.originMaterial as THREE.Material;
    const pickBufferMaterial = material.clone();
    trans2PickBufferMaterial(meshLike, material, pickBufferMaterial);
    featureData.pickBufferMaterial = pickBufferMaterial;

    // 设置Map
    GpuPickManager.positiveMap.set(pickid, meshLike);
    GpuPickManager.negativeMap.set(meshLike, pickid);

    return pickid;
  }

  /**
   * 注销一个需要拾取的图元
   * @param {MeshLike} meshLike 需要被注销的object3d
   */
  static unregister(meshLike: MeshLike) {
    const pickid = GpuPickManager.negativeMap.get(meshLike);
    if (!pickid) return;

    meshLike.layers.disable(GpuPickManager.PickBufferLayer);

    GpuPickManager.negativeMap.delete(meshLike);
    GpuPickManager.positiveMap.delete(pickid);
    GpuPickManager.featureDataMap.delete(meshLike);
  }

  /**
   * 渲染PickBuffer
   * @param {THREE.WebGLRenderer} renderer 渲染器
   * @param {THREE.Scene | THREE.Group} scene 场景
   * @param {THREE.Camera} camera 相机
   */
  rendPickBuffer(renderer: THREE.WebGLRenderer, scene: THREE.Scene | THREE.Group, camera: THREE.Camera) {
    DEBUG_PICK_BUFFER_RENDER_PERFORMANCE && console.time(`GPUPickManager.pick render pickBuffer`);

    this.renderer = renderer;
    const size = this.rendererStatus.size;
    renderer.getSize(size); //
    this.rendererStatus.dpr = renderer.getPixelRatio();
    const dpr = this.rendererStatus.dpr;
    this.renderTarget.setSize(size.width * dpr, size.height * dpr);

    this._saveState(); // 保存渲染器状态
    this._swapMaterials(); // 切换材质并渲染pickBuffer
    const prevMask = camera.layers.mask;
    camera.layers.set(GpuPickManager.PickBufferLayer); // 切换相机状态

    // 切换渲染器状态为pickBuffer渲染状态
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0.0); // 设置清空颜色为透明色, 对应映射id的0
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    DEBUG_PICK_BUFFER_FRAME && this._sendDebugFrame();
    this.renderer.setRenderTarget(null);

    camera.layers.mask = prevMask; // 恢复相机状态
    this._restoreMaterial(); // 恢复材质
    this._restoreState(); // 恢复渲染器状态

    DEBUG_PICK_BUFFER_RENDER_PERFORMANCE && console.timeEnd(`GPUPickManager.pick render pickBuffer`);
  }

  private _pixelBuffer = new Uint8Array(4);

  /**
   * 尝试从PickBuffer拾取出注册的信息
   * @param clickX 光标在视图canvas中的x坐标
   * @param clickY 光标在视图canvas中的y坐标
   * @returns
   */
  readPickBuffer({ x, y }) {
    const dpr = this.rendererStatus.dpr || 1.0;
    const width = this.rendererStatus.size.width;
    const height = this.rendererStatus.size.height;
    const xp = Math.floor(x * dpr);
    const yp = Math.floor((this.rendererStatus.size.height - y) * dpr); // flip y for WebGL coords
    const xpp = Math.max(Math.min(width - 1, xp), 1);
    const ypp = Math.max(Math.min(height - 1, yp), 1);

    const pixel = this._pixelBuffer;
    try {
      this.renderer.readRenderTargetPixels(this.renderTarget, xpp, ypp, 1, 1, pixel);
    } catch (e) {
      // 若 readRenderTargetPixels 抛错(某些平台可能不支持), 返回未命中
      return { pickid: 0, meshLike: undefined, featureData: undefined, exactFeature: undefined };
    }

    // 拾取提取的颜色转化为id
    const _colors = Array.from(pixel);
    const pickid = decodeRGBToId(_colors);

    const meshLike = GpuPickManager.positiveMap.get(pickid);
    const featureData = GpuPickManager.featureDataMap.get(meshLike);
    let exactFeature = featureData?.feature;
    if (meshLike && (meshLike as THREE.InstancedMesh).isInstancedMesh) {
      const pickid_start = GpuPickManager.negativeMap.get(meshLike) || 0;
      exactFeature = featureData?.features[pickid - pickid_start];
    }

    return { pickid, meshLike, featureData, exactFeature };
  }

  /////////////////// 渲染器状态保存/恢复 //////////////////

  private _prevState: Record<string, any> = {
    outputColorSpace: THREE.LinearSRGBColorSpace,
    toneMapping: THREE.NoToneMapping,
    autoClear: true,
    clearColor: new THREE.Color(),
    clearAlpha: 1.0,
  };

  private _saveState() {
    this._prevState.outputColorSpace = this.renderer.outputColorSpace;
    this._prevState.toneMapping = this.renderer.toneMapping;
    this._prevState.autoClear = this.renderer.autoClear;
    this.renderer.getClearColor(this._prevState.clearColor);
    this._prevState.clearAlpha = this.renderer.getClearAlpha();
  }

  private _restoreState() {
    this.renderer.outputColorSpace = this._prevState.outputColorSpace;
    this.renderer.toneMapping = this._prevState.toneMapping;
    this.renderer.autoClear = this._prevState.autoClear;
    this.renderer.setClearColor(this._prevState.clearColor, this._prevState.clearAlpha);
  }

  /////////////////// 材质替换/恢复 //////////////////

  private _swapMaterials() {
    for (const [, meshLike] of GpuPickManager.positiveMap) {
      const featureData = GpuPickManager.featureDataMap.get(meshLike);
      meshLike.material = featureData.pickBufferMaterial;
    }
  }

  private _restoreMaterial() {
    for (const [, meshLike] of GpuPickManager.positiveMap) {
      const featureData = GpuPickManager.featureDataMap.get(meshLike);
      meshLike.material = featureData.originMaterial;
    }
  }

  /////////////////// 调试 //////////////////

  /** 向brodcastChannel发送一帧消息 */
  private async _sendDebugFrame() {
    const dpr = this.rendererStatus.dpr;
    const width = this.rendererStatus.size.width * dpr;
    const height = this.rendererStatus.size.height * dpr;
    const buffer = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, width, height, buffer);
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const bitmap = await createImageBitmap(imageData, { colorSpaceConversion: "none", imageOrientation: "flipY", premultiplyAlpha: "none" });
    channel.postMessage({ type: "frame", width, height, bitmap });
  }
}

/** 数字转换为RGB */
const encodeIdToRGB = (id: number) => {
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  return [r, g, b];
};

/** RGB转换为数字 */
const decodeRGBToId = ([r, g, b, a]: number[]) => {
  return (r | (g << 8) | (b << 16)) >>> 0; // 返回非负整数
};

/** 数字转换为RGBA */
const encodeIdToRGBA = (id: number) => {
  // id: 1..2^24-1 (0 is reserved for "no hit")
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  const a = ((id >>> 24) & 0xff) / 255;
  return [r, g, b, a];
};

/** RGBA转换为数字 */
const decodeRGBAToId = ([r, g, b, a]: number[]) => {
  return r | (g << 8) | (b << 16) | (a << 24); // 1..2^24-1
};
