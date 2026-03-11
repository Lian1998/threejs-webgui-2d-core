import * as THREE from "three";
import { SpriteXZRectGeometry } from "./SpriteXZRectGeometry";
import { Sprite2DMaterial } from "./Sprite2DMaterial";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";

export interface Sprite2DParameters {
  /** 贴图地址, 同时作为Atlas系统的索引 */
  url: string;

  /** 米 / 像素 */
  mpp?: number;

  /** 中心点 [x,z] 偏移, threejs世界单位 */
  offset?: [number, number];

  /** 按中心点, 绕 y 轴旋转, 弧度 */
  rotate?: number;

  /** 乘色 */
  multiplyColor?: THREE.Color;

  renderOrder?: number;
}

/**
 * xz 平面 sprite。支持新旧参数别名，并可在运行时 update。
 */
export class Sprite2D extends THREE.Mesh implements Sprite2DParameters {
  isSprite2D = true;

  url: string;
  mpp = 1.0;
  offset: [number, number] = [0.0, 0.0];
  rotate = 0.0;
  multiplyColor: THREE.Color = undefined;

  constructor(parameters: Sprite2DParameters) {
    super();
    this.material = new Sprite2DMaterial();
    this.apply(parameters, true);
  }

  /**
   * 接受参数修改
   * @param {Partial<Sprite2DParameters>} parameters 新的参数
   * @param forceRebuildGeometry 是否强制重新计算 geometryBuffer
   */
  private apply(parameters: Partial<Sprite2DParameters>, forceRebuildGeometry: boolean = false) {
    const next = this.normalizeParameters(parameters);
    const needRebuildGeometry = forceRebuildGeometry || next.url !== this.url || next.mpp !== this.mpp || next.offset[0] !== this.offset[0] || next.offset[1] !== this.offset[1] || next.rotate !== this.rotate;
    const needRebuildMultiplyColor = needRebuildGeometry || !next.multiplyColor.equals(this.multiplyColor); // 综合条件判断是否需要重新计算 geometryBuffer

    this.url = next.url;
    this.mpp = next.mpp;
    this.offset = [next.offset[0], next.offset[1]];
    this.rotate = next.rotate;
    this.multiplyColor = next.multiplyColor;
    this.renderOrder = next.renderOrder ?? this.renderOrder ?? -1;

    if (needRebuildGeometry) this.rebuildGeometry(); // 重新计算 geometryBuffer
    if (needRebuildMultiplyColor) this.syncMultiplyColorAttribute();
  }

  /** 校验并吸收参数 */
  private normalizeParameters(parameters: Partial<Sprite2DParameters>): Sprite2DParameters {
    const url = parameters.url ?? this.url;
    const mpp = parameters.mpp ?? this.mpp;
    const offset = parameters.offset ?? this.offset;
    const rotate = parameters.rotate ?? this.rotate;
    const renderOrder = parameters.renderOrder ?? this.renderOrder;
    const multiplyColor = parameters.multiplyColor ?? this.multiplyColor;

    if (mpp === undefined) throw new Error("Sprite2D: 缺少缩放比");
    if (!Number.isFinite(mpp) || mpp <= 0) throw new Error(`Sprite2D: 非法缩放比 ${mpp}`);

    return {
      url,
      mpp,
      offset: [offset?.[0] ?? 0.0, offset?.[1] ?? 0.0],
      rotate: rotate ?? 0.0,
      multiplyColor: multiplyColor,
      renderOrder,
    };
  }

  /** 重新计算 geometryBuffer */
  private rebuildGeometry() {
    const spriteItem = spriteAtlas.getSpriteAtlas(this.url);
    const { page, u0, v0, u1, v1, imageProps } = spriteItem;
    const { width, height } = imageProps;

    this.geometry?.dispose();
    this.geometry = new SpriteXZRectGeometry({
      x: this.mpp * width,
      z: this.mpp * height,
      u0,
      v0,
      u1,
      v1,
      offset: this.offset,
      rotate: this.rotate,
    });

    const count = this.geometry.attributes.position.count;
    const aPage = new Float32Array(count);
    for (let i = 0; i < count; i++) aPage[i] = page;
    this.geometry.setAttribute("aPage", new THREE.Float32BufferAttribute(aPage, 1).setUsage(THREE.StaticDrawUsage));
  }

  /** 重新计算 geometryBuffer 的 aMultiplyColor 属性 */
  private syncMultiplyColorAttribute() {
    const material = this.material as Sprite2DMaterial;
    if (!this.geometry) return;

    if (!this.multiplyColor) {
      this.geometry.deleteAttribute("aMultiplyColor");
      material.useMultiplyColor = false;
      return;
    }

    const count = this.geometry.attributes.position.count;
    const color = this.multiplyColor;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      arr[o] = color.r;
      arr[o + 1] = color.g;
      arr[o + 2] = color.b;
    }
    this.geometry.setAttribute("aMultiplyColor", new THREE.Float32BufferAttribute(arr, 3).setUsage(THREE.StaticDrawUsage));
    material.useMultiplyColor = true;
  }

  ///////////////////////////////////////////////////////////////

  set(parameters: Partial<Sprite2DParameters>) {
    this.apply(parameters, false);
  }
}
