import * as THREE from "three";

import { encodeIdToRGB } from "./pickid";
import { decodeRGBToId } from "./pickid";

import { trans2PickBufferMaterial } from "./trans2PickBufferMaterial";

import { channel } from "./debug/";

export const USER_DATA_KEY = "gpuPickManager";

export type GpuPickManagerUserData = {
  originMaterial: THREE.Material | THREE.Material[];
  pickBufferMaterial: THREE.Material | THREE.Material[];
  uniforms: {
    uPickColor: { value: THREE.Color };
  };
};

const genUserData = (): GpuPickManagerUserData => {
  return {
    originMaterial: undefined,
    pickBufferMaterial: undefined,
    uniforms: {
      uPickColor: {
        value: new THREE.Color(),
      },
    },
  };
};

export class GpuPickManager {
  renderer: THREE.WebGLRenderer;
  PosMap: Map<number, THREE.Object3D> = new Map(); // pickid => object3d
  NegMap: WeakMap<THREE.Object3D, number> = new WeakMap(); // object3d => pickid
  rt: THREE.WebGLRenderTarget;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.syncRendererStatus();

    this.rt = new THREE.WebGLRenderTarget(this.rendererStatus.rt.width, this.rendererStatus.rt.height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      samples: 4,
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
   * 注册一个Threejs的Object3D
   * @param {THREE.Object3D} object3d 需要被注册的object3d
   * @returns pickid
   */
  register(object3d: THREE.Object3D): number {
    // 如果已经注册过了
    if (!object3d) return 0;
    if (this.NegMap.has(object3d)) return this.NegMap.get(object3d);

    // 如果还没有注册过
    let count = 1;
    if ((object3d as THREE.InstancedMesh).isInstancedMesh) count = (object3d as THREE.InstancedMesh).count; // 如果是instancedMesh 需要将当前计数一并传入
    const pickid = this._allocIdRange(count); // 获取当前排位的id
    const pickColorArr = encodeIdToRGB(pickid); // 将id转化成颜色数组
    object3d.userData[USER_DATA_KEY] = genUserData(); // 生成一个缓存
    const meshLike = object3d as THREE.Mesh | THREE.InstancedMesh;
    const userData = meshLike.userData[USER_DATA_KEY] as GpuPickManagerUserData;
    userData.uniforms.uPickColor.value.setRGB(pickColorArr[0], pickColorArr[1], pickColorArr[2]); // 缓存颜色需要在编译阶段将此Color传递给shader对象
    userData.originMaterial = meshLike.material; // 缓存初始材质
    if (!userData.originMaterial) throw new Error("请在注册object3d到GpuPickManager前为其添加材质"); // 在注册object3d到此类时必须保证其拥有基础材质

    // Mesh
    if ((meshLike as THREE.Mesh).isMesh) {
      const material = userData.originMaterial as THREE.Material;
      const pickBufferMaterial = material.clone();
      userData.pickBufferMaterial = pickBufferMaterial;
      trans2PickBufferMaterial(meshLike, material, pickBufferMaterial);
    }

    // InstancedMesh
    else if ((meshLike as THREE.InstancedMesh).isInstancedMesh) {
      const materials = meshLike.material as THREE.Material[];
      const pickBufferMaterials: THREE.Material[] = [];
      for (let i = 0; i < materials.length; i++) {
        const material = materials[i];
        const pickBufferMaterial = material.clone();
        pickBufferMaterials.push(pickBufferMaterial);
        trans2PickBufferMaterial(meshLike, material, pickBufferMaterial);
      }
      userData.pickBufferMaterial = pickBufferMaterials;
    }

    // 设置Map
    this.PosMap.set(pickid, object3d);
    this.NegMap.set(object3d, pickid);

    return pickid;
  }

  private _pixel: Uint8Array = new Uint8Array(4);
  pick(scene: THREE.Object3D, camera: THREE.Camera, clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const dpr = this.renderer.getPixelRatio();
    const x = Math.floor((clientX - rect.left) * dpr);
    const y = Math.floor((rect.bottom - clientY) * dpr); // flip y for WebGL coords

    this._saveState(); // 保存渲染器状态
    this._swapMaterials(scene); // 切换材质并渲染pickBuffer

    // 切换渲染器状态为pickBuffer渲染状态
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0); // 设置清空颜色为透明色, 对应映射id的0
    this.renderer.setRenderTarget(this.rt);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    if (import.meta.env.MODE === "development") this._sendDebugFrame();
    this.renderer.setRenderTarget(null);
    this.renderer.readRenderTargetPixels(this.rt, x, y, 1, 1, this._pixel);

    this._restoreMaterial(scene); // 恢复材质
    this._restoreState(); // 恢复渲染器状态

    // 拾取提取的颜色转化为id
    const _colors = Array.from(this._pixel);
    const pickid = decodeRGBToId(_colors);

    // 通过映射表找到提取的object3d
    return { pickid: pickid, object3d: this.PosMap.get(pickid) };
  }

  /////////////////// 视口状态 //////////////////

  rendererStatus = {
    size: new THREE.Vector2(),
    dpr: 0.0,
    rt: { width: window.innerWidth, height: window.innerHeight },
  };

  /** 视口发生变化时调用, 用于重算监听渲染画布的变化 */
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
    toneMapping: THREE.NoToneMapping,
    autoClear: true,
    clearColor: new THREE.Color(),
    clearAlpha: 1.0,
  };

  /** 保存渲染器状态 */
  private _saveState() {
    this._prevState.toneMapping = this.renderer.toneMapping;
    this._prevState.autoClear = this.renderer.autoClear;
    this.renderer.getClearColor(this._prevState.clearColor);
    this._prevState.clearAlpha = this.renderer.getClearAlpha();
  }

  /** 恢复渲染器状态 */
  private _restoreState() {
    this.renderer.toneMapping = this._prevState.toneMapping;
    this.renderer.autoClear = this._prevState.autoClear;
    this.renderer.setClearColor(this._prevState.clearColor, this._prevState.clearAlpha);
  }

  /////////////////// 材质替换 //////////////////

  private _originVisiableSet = new Set<THREE.Object3D>();

  /** 遍历场景树将所有注册的物体的材质替换为pickBuffer渲染所需要的材质 */
  private _swapMaterials(root: THREE.Object3D) {
    this._originVisiableSet.clear();
    root.traverseVisible((child) => {
      if (!child.type.toLowerCase().includes("mesh")) return;
      const pickid = this.NegMap.get(child);
      if (!pickid) {
        this._originVisiableSet.add(child);
        child.visible = false; // 标记为未注册, 不需要渲染到pickBuffer
        return;
      }
      const meshLike = child as THREE.Mesh | THREE.InstancedMesh;
      const userData = meshLike.userData[USER_DATA_KEY] as GpuPickManagerUserData;
      meshLike.material = userData.pickBufferMaterial;
    });
  }

  /** 遍历场景树将所有注册的物体的材质替换回pickBuffer渲染所需要的材质 */
  private _restoreMaterial(root: THREE.Object3D) {
    root.traverse((child) => {
      if (!child.type.toLowerCase().includes("mesh")) return;
      const pickid = this.NegMap.get(child);
      if (!pickid) return;
      const meshLike = child as THREE.Mesh | THREE.InstancedMesh;
      const userData = meshLike.userData[USER_DATA_KEY] as GpuPickManagerUserData;
      meshLike.material = userData.originMaterial;
    });

    for (const child of this._originVisiableSet) {
      child.visible = true; // 如果在上次渲染pickBuffer时被标记为未注册, 恢复其visible状态
    }
  }

  /////////////////// 调试 //////////////////

  /** 向brodcastChannel发送消息 */
  private async _sendDebugFrame() {
    const width = this.rendererStatus.size.width;
    const height = this.rendererStatus.size.height;
    const buffer = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(this.rt, 0, 0, width, height, buffer);
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const bitmap = await createImageBitmap(imageData, { imageOrientation: "flipY" });
    channel.postMessage({ type: "frame", width, height, bitmap });
  }
}
