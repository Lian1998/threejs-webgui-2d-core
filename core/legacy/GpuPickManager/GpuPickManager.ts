import * as THREE from "three";
import { GpuPickFeature } from "@core/interfaces/GpuPickFeature";
import { trans2PickBufferMaterial } from "./trans2PickBufferMaterial";
import { DEBUG_PICK_BUFFER_FRAME } from "./index";
import { DEBUG_PICK_BUFFER_RENDER_PERFORMANCE } from "./index";
import { channel } from "./debug/";

export type GpuPickMaterialMode = "uniform" | "attribute";

export interface GpuPickFeatureData {
  meshLike: THREE.MeshLike;
  features: GpuPickFeature[];
  pickIds: number[];
  originMaterial: THREE.Material;
  pickBufferMaterial: THREE.Material;
  mode: GpuPickMaterialMode;
  uniforms: { uPickColor: { value: THREE.Color } };
  attributes: { aPickColor?: THREE.BufferAttribute };
  cleanupAttributeOnUnregister: boolean;
}

export interface GpuPickReadResult {
  pickid: number;
  meshLike: THREE.MeshLike | undefined;
  featureData: GpuPickFeatureData | undefined;
  exactFeature: GpuPickFeature | undefined;
  featureIndex: number;
}

export interface GpuPickRegistrationToken {
  meshLike: THREE.MeshLike;
  pickIds: number[];
  unregister: () => void;
}

/**
 * GpuPickManager
 * - 支持 Mesh(单 feature)
 * - 支持 InstancedMesh(每实例一个 feature)
 * - 支持 MeshBatch(同一 mesh 多个 feature, 通过 aPickColor 按顶点编码)
 */
export class GpuPickManager {
  static PickBufferLayer = 31;
  static readonly className = "GpuPickManager";

  /** pickid => MeshLike (为兼容旧调用保留) */
  static positiveMap: Map<number, THREE.MeshLike> = new Map();
  /** MeshLike => 第一个 pickid (为兼容旧调用保留) */
  static negativeMap: WeakMap<THREE.MeshLike, number> = new WeakMap();
  /** MeshLike => FeatureData */
  static featureDataMap: WeakMap<THREE.MeshLike, GpuPickFeatureData> = new WeakMap();

  private static meshDataMap: WeakMap<THREE.MeshLike, GpuPickFeatureData> = new WeakMap();
  private static registeredMeshes: Set<THREE.MeshLike> = new Set();
  private static pickidFeatureMap: Map<number, { meshLike: THREE.MeshLike; feature: GpuPickFeature; featureIndex: number }> = new Map();

  private static nextPickId = 1;
  private static recycledPickIds: number[] = [];

  renderer: THREE.WebGLRenderer = undefined;
  renderTarget: THREE.WebGLRenderTarget = undefined;
  rendererStatus = { size: new THREE.Vector2(1.0, 1.0), dpr: 1.0 };

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

  /** 兼容旧 API, 返回起始 pickid */
  static register(meshLike: THREE.MeshLike, feature: GpuPickFeature | GpuPickFeature[]): number {
    return this.registerWithToken(meshLike, feature).pickIds[0] ?? 0;
  }

  /** 返回可直接调用的注销 token */
  static registerWithToken(meshLike: THREE.MeshLike, feature: GpuPickFeature | GpuPickFeature[]): GpuPickRegistrationToken {
    if (!meshLike) return { meshLike, pickIds: [], unregister: () => void 0 };

    const existed = this.meshDataMap.get(meshLike);
    if (existed) {
      return { meshLike, pickIds: existed.pickIds.slice(), unregister: () => this.unregister(meshLike) };
    }

    if (!((meshLike as THREE.Mesh).isMesh || (meshLike as THREE.InstancedMesh).isInstancedMesh)) {
      throw new Error("GpuPickManager: currently only supports Mesh and InstancedMesh");
    }
    if (Array.isArray(meshLike.material)) throw new Error("GpuPickManager: cannot register mesh with material array");
    if (!meshLike.material) throw new Error("GpuPickManager: bind material before register");

    if ((meshLike as THREE.InstancedMesh).isInstancedMesh) {
      if (!Array.isArray(feature)) throw new Error("GpuPickManager: InstancedMesh requires feature array");
      const instanced = meshLike as THREE.InstancedMesh;
      if (feature.length !== instanced.count) throw new Error(`GpuPickManager: InstancedMesh feature length ${feature.length} != count ${instanced.count}`);

      const data = this.createFeatureData(meshLike, feature, "attribute");
      const attrArray = new Float32Array(feature.length * 3);
      for (let i = 0; i < feature.length; i++) {
        const [r, g, b] = encodeIdToRGB(data.pickIds[i]);
        const o = i * 3;
        attrArray[o] = r;
        attrArray[o + 1] = g;
        attrArray[o + 2] = b;
      }
      const aPickColor = new THREE.InstancedBufferAttribute(attrArray, 3).setUsage(THREE.DynamicDrawUsage);
      instanced.geometry.setAttribute("aPickColor", aPickColor);
      data.attributes.aPickColor = aPickColor;
      data.cleanupAttributeOnUnregister = true;

      this.finalizeFeatureData(data);
      return { meshLike, pickIds: data.pickIds.slice(), unregister: () => this.unregister(meshLike) };
    }

    if (Array.isArray(feature)) {
      throw new Error("GpuPickManager: Mesh with multiple features should call registerMeshBatch()");
    }

    const data = this.createFeatureData(meshLike, [feature], "uniform");
    const [r, g, b] = encodeIdToRGB(data.pickIds[0]);
    data.uniforms.uPickColor.value.setRGB(r, g, b);

    this.finalizeFeatureData(data);
    return { meshLike, pickIds: data.pickIds.slice(), unregister: () => this.unregister(meshLike) };
  }

  /**
   * 为单个 Mesh 注册多 feature:
   * - featureIndexByVertex 的长度必须等于 geometry.position.count
   * - 每个顶点写入所属 feature 的 pick color
   */
  static registerMeshBatch(meshLike: THREE.Mesh, features: GpuPickFeature[], featureIndexByVertex: ArrayLike<number>): number {
    if (!meshLike) return 0;
    if (!(meshLike as THREE.Mesh).isMesh) throw new Error("GpuPickManager.registerMeshBatch: meshLike must be THREE.Mesh");
    if (!features.length) return 0;
    if (Array.isArray(meshLike.material)) throw new Error("GpuPickManager.registerMeshBatch: material array is not supported");

    const existed = this.meshDataMap.get(meshLike);
    if (existed) return existed.pickIds[0] ?? 0;

    const position = meshLike.geometry?.getAttribute("position");
    if (!position) throw new Error("GpuPickManager.registerMeshBatch: mesh geometry.position is required");
    if (featureIndexByVertex.length !== position.count) {
      throw new Error(`GpuPickManager.registerMeshBatch: featureIndexByVertex.length ${featureIndexByVertex.length} != vertexCount ${position.count}`);
    }

    const data = this.createFeatureData(meshLike, features, "attribute");

    const attrArray = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const featureIndex = featureIndexByVertex[i];
      if (!Number.isInteger(featureIndex) || featureIndex < 0 || featureIndex >= features.length) {
        throw new Error(`GpuPickManager.registerMeshBatch: invalid feature index at vertex ${i}: ${featureIndex}`);
      }
      const [r, g, b] = encodeIdToRGB(data.pickIds[featureIndex]);
      const o = i * 3;
      attrArray[o] = r;
      attrArray[o + 1] = g;
      attrArray[o + 2] = b;
    }

    const aPickColor = new THREE.BufferAttribute(attrArray, 3).setUsage(THREE.DynamicDrawUsage);
    meshLike.geometry.setAttribute("aPickColor", aPickColor);
    data.attributes.aPickColor = aPickColor;
    data.cleanupAttributeOnUnregister = true;

    this.finalizeFeatureData(data);
    return data.pickIds[0] ?? 0;
  }

  /** 注销某个 meshLike 的拾取注册 */
  static unregister(meshLike: THREE.MeshLike) {
    const data = this.meshDataMap.get(meshLike);
    if (!data) return;

    meshLike.layers.disable(GpuPickManager.PickBufferLayer);

    for (const pickid of data.pickIds) {
      this.pickidFeatureMap.delete(pickid);
      this.positiveMap.delete(pickid);
      this.recycledPickIds.push(pickid);
    }

    this.negativeMap.delete(meshLike);
    this.featureDataMap.delete(meshLike);
    this.meshDataMap.delete(meshLike);
    this.registeredMeshes.delete(meshLike);

    if (data.cleanupAttributeOnUnregister) {
      meshLike.geometry?.deleteAttribute("aPickColor");
    }

    if (meshLike.material !== data.originMaterial) {
      meshLike.material = data.originMaterial;
    }
    data.pickBufferMaterial.dispose();
  }

  private static createFeatureData(meshLike: THREE.MeshLike, features: GpuPickFeature[], mode: GpuPickMaterialMode): GpuPickFeatureData {
    const pickIds = features.map(() => this.allocPickId());
    const originMaterial = meshLike.material as THREE.Material;
    const pickBufferMaterial = originMaterial.clone();

    const data: GpuPickFeatureData = {
      meshLike,
      features,
      pickIds,
      originMaterial,
      pickBufferMaterial,
      mode,
      uniforms: { uPickColor: { value: new THREE.Color() } },
      attributes: {},
      cleanupAttributeOnUnregister: false,
    };

    trans2PickBufferMaterial(meshLike, originMaterial, pickBufferMaterial, data);

    return data;
  }

  private static finalizeFeatureData(data: GpuPickFeatureData) {
    const { meshLike, features, pickIds } = data;

    meshLike.layers.enable(GpuPickManager.PickBufferLayer);

    this.meshDataMap.set(meshLike, data);
    this.featureDataMap.set(meshLike, data);
    this.registeredMeshes.add(meshLike);

    const firstPickId = pickIds[0] ?? 0;
    if (firstPickId > 0) this.negativeMap.set(meshLike, firstPickId);

    for (let i = 0; i < pickIds.length; i++) {
      const pickid = pickIds[i];
      const feature = features[i];
      this.pickidFeatureMap.set(pickid, { meshLike, feature, featureIndex: i });
      this.positiveMap.set(pickid, meshLike);
    }
  }

  private static allocPickId(): number {
    const reuse = this.recycledPickIds.pop();
    if (reuse !== undefined) return reuse;
    const id = this.nextPickId++;
    return id;
  }

  /** 渲染 pick buffer */
  rendPickBuffer(renderer: THREE.WebGLRenderer, scene: THREE.Object3D, camera: THREE.Camera) {
    DEBUG_PICK_BUFFER_RENDER_PERFORMANCE && console.time(`GPUPickManager.pick render pickBuffer`);

    this.renderer = renderer;
    const size = this.rendererStatus.size;
    renderer.getSize(size);
    this.rendererStatus.dpr = renderer.getPixelRatio() || 1.0;
    const dpr = this.rendererStatus.dpr;
    this.renderTarget.setSize(Math.max(1, Math.floor(size.width * dpr)), Math.max(1, Math.floor(size.height * dpr)));

    this._saveState();
    this._swapMaterials();

    const prevMask = camera.layers.mask;
    camera.layers.set(GpuPickManager.PickBufferLayer);

    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0.0);
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    DEBUG_PICK_BUFFER_FRAME && this._sendDebugFrame();
    this.renderer.setRenderTarget(null);

    camera.layers.mask = prevMask;
    this._restoreMaterial();
    this._restoreState();

    DEBUG_PICK_BUFFER_RENDER_PERFORMANCE && console.timeEnd(`GPUPickManager.pick render pickBuffer`);
  }

  private _pixelBuffer = new Uint8Array(4);

  readPickBuffer({ x, y }: { x: number; y: number }): GpuPickReadResult {
    const dpr = this.rendererStatus.dpr || 1.0;
    const width = this.rendererStatus.size.width;
    const height = this.rendererStatus.size.height;

    const rtWidth = Math.max(1, Math.floor(width * dpr));
    const rtHeight = Math.max(1, Math.floor(height * dpr));

    const xp = Math.floor(x * dpr);
    const yp = Math.floor((height - y) * dpr);
    const xpp = Math.max(Math.min(rtWidth - 1, xp), 0);
    const ypp = Math.max(Math.min(rtHeight - 1, yp), 0);

    const pixel = this._pixelBuffer;
    try {
      this.renderer.readRenderTargetPixels(this.renderTarget, xpp, ypp, 1, 1, pixel);
    } catch (e) {
      return { pickid: 0, meshLike: undefined, featureData: undefined, exactFeature: undefined, featureIndex: -1 };
    }

    const pickid = decodeRGBToId(pixel);
    const hit = GpuPickManager.pickidFeatureMap.get(pickid);
    const meshLike = hit?.meshLike;
    const featureData = meshLike ? GpuPickManager.meshDataMap.get(meshLike) : undefined;

    return {
      pickid,
      meshLike,
      featureData,
      exactFeature: hit?.feature,
      featureIndex: hit?.featureIndex ?? -1,
    };
  }

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

  private _swapMaterials() {
    for (const meshLike of GpuPickManager.registeredMeshes) {
      const featureData = GpuPickManager.meshDataMap.get(meshLike);
      if (!featureData) continue;
      meshLike.material = featureData.pickBufferMaterial;
    }
  }

  private _restoreMaterial() {
    for (const meshLike of GpuPickManager.registeredMeshes) {
      const featureData = GpuPickManager.meshDataMap.get(meshLike);
      if (!featureData) continue;
      meshLike.material = featureData.originMaterial;
    }
  }

  private async _sendDebugFrame() {
    const dpr = this.rendererStatus.dpr || 1.0;
    const width = Math.max(1, Math.floor(this.rendererStatus.size.width * dpr));
    const height = Math.max(1, Math.floor(this.rendererStatus.size.height * dpr));
    const buffer = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, width, height, buffer);
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const bitmap = await createImageBitmap(imageData, { colorSpaceConversion: "none", imageOrientation: "flipY", premultiplyAlpha: "none" });
    channel.postMessage({ type: "frame", width, height, bitmap });
  }
}

const encodeIdToRGB = (id: number): [number, number, number] => {
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  return [r, g, b];
};

const decodeRGBToId = (pixel: ArrayLike<number>) => {
  const r = pixel[0] || 0;
  const g = pixel[1] || 0;
  const b = pixel[2] || 0;
  return (r | (g << 8) | (b << 16)) >>> 0;
};
