import * as THREE from "three";

import { encodeIdToRGBA } from "./encodeColorId";
import { decodeRGBAToId } from "./encodeColorId";
import { encodeIdToRGB } from "./encodeColorId";
import { decodeRGBToId } from "./encodeColorId";

export class GpuPickManager {
  renderer: THREE.WebGLRenderer;

  PosMap: Map<number, THREE.Object3D> = new Map(); // pickid => object3d
  NegMap: WeakMap<THREE.Object3D, number> = new WeakMap(); // object3d => pickid
  rendererStatus = {
    size: new THREE.Vector2(),
    dpr: 0.0,
    rt: { width: window.innerWidth, height: window.innerHeight },
  };
  rt: THREE.WebGLRenderTarget;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.syncRendererStatus();

    this.rt = new THREE.WebGLRenderTarget(this.rendererStatus.rt.width, this.rendererStatus.rt.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
    });
  }

  /** 视口发生变化时调用, 用于重算监听渲染画布的变化 */
  syncRendererStatus() {
    if (!this.renderer) throw new Error("请指定 GpuPickManager 的 renderer");
    this.renderer.getSize(this.rendererStatus.size);
    this.rendererStatus.dpr = this.renderer.getPixelRatio();

    const size = this.rendererStatus.size;
    const dpr = this.rendererStatus.dpr;
    this.rendererStatus.rt.width = Math.max(1, Math.floor(size.x * dpr));
    this.rendererStatus.rt.height = Math.max(1, Math.floor(size.y * dpr));
    if (this.rt) this.rt.setSize(this.rendererStatus.rt.width, this.rendererStatus.rt.height);
  }

  maxId = 0;
  private _allocIdRange(n: number) {
    const base = Math.max(1, this.maxId + 1);
    this.maxId = base + n - 1;
    return base;
  }

  register(object3d: THREE.Object3D): number {
    if (!object3d) return 0;
    if (this.NegMap.has(object3d)) return this.NegMap.get(object3d);

    let count = 1;
    if ((object3d as THREE.InstancedMesh).isInstancedMesh) count = (object3d as THREE.InstancedMesh).count;
    const pickid = this._allocIdRange(count);

    this.PosMap.set(pickid, object3d);
    this.NegMap.set(object3d, pickid);
  }
}
