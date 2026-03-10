import * as THREE from "three";
import { SpriteXZRectGeometry } from "./SpriteXZRectGeometry";
import { Sprite2DMaterial } from "./Sprite2DMaterial";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";

export type Sprite2DColorLike = THREE.Color | THREE.ColorRepresentation | null | undefined;

export interface Sprite2DParameters {
  /** atlas 中预载的图片 url */
  spriteUrl?: string;
  /** 兼容旧字段 */
  textureUrl?: string;

  /** meter per pixel */
  spriteMpp?: number;
  /** 兼容旧字段 */
  mpp?: number;

  /** [x,z] 偏移，单位米 */
  spriteOffset?: [number, number];
  /** 兼容旧字段 */
  offset?: [number, number];

  /** 绕 y 轴旋转，弧度 */
  spriteRotate?: number;
  /** 兼容旧字段 */
  rotate?: number;

  /** 乘色 */
  spriteMultiplyColor?: Sprite2DColorLike;
  /** 兼容旧字段 */
  multiplyColor?: Sprite2DColorLike;

  renderOrder?: THREE.Object3D["renderOrder"];
}

type SpriteState = {
  spriteUrl: string;
  spriteMpp: number;
  spriteOffset: [number, number];
  spriteRotate: number;
  spriteMultiplyColor: THREE.Color | undefined;
  renderOrder: THREE.Object3D["renderOrder"] | undefined;
};

/**
 * xz 平面 sprite。支持新旧参数别名，并可在运行时 update。
 */
export class Sprite2D extends THREE.Mesh {
  isSprite2D = true;

  spriteUrl = "";
  spriteMpp = 1.0;
  spriteOffset: [number, number] = [0.0, 0.0];
  spriteRotate = 0.0;
  spriteMultiplyColor: THREE.Color | undefined = undefined;

  constructor(parameters: Sprite2DParameters) {
    super();
    this.material = new Sprite2DMaterial();
    this.apply(parameters, true);
  }

  /** 增量更新参数；涉及几何字段时会重建几何。 */
  update(parameters: Partial<Sprite2DParameters>): this {
    this.apply(parameters, false);
    return this;
  }

  /** 一次性替换 sprite 核心参数。 */
  setSprite(parameters: Sprite2DParameters): this {
    this.apply(parameters, true);
    return this;
  }

  setMultiplyColor(color: Sprite2DColorLike): this {
    this.apply({ spriteMultiplyColor: color }, false);
    return this;
  }

  private apply(parameters: Partial<Sprite2DParameters>, forceRebuildGeometry: boolean) {
    const next = this.normalizeParameters(parameters);
    const needRebuildGeometry = forceRebuildGeometry || next.spriteUrl !== this.spriteUrl || next.spriteMpp !== this.spriteMpp || next.spriteOffset[0] !== this.spriteOffset[0] || next.spriteOffset[1] !== this.spriteOffset[1] || next.spriteRotate !== this.spriteRotate;

    const needRebuildMultiplyColor = needRebuildGeometry || !this.isSameColor(next.spriteMultiplyColor, this.spriteMultiplyColor);

    this.spriteUrl = next.spriteUrl;
    this.spriteMpp = next.spriteMpp;
    this.spriteOffset = [next.spriteOffset[0], next.spriteOffset[1]];
    this.spriteRotate = next.spriteRotate;
    this.spriteMultiplyColor = next.spriteMultiplyColor;
    this.renderOrder = next.renderOrder ?? this.renderOrder ?? -1;

    if (needRebuildGeometry) this.rebuildGeometry();
    if (needRebuildMultiplyColor) this.syncMultiplyColorAttribute();
  }

  private normalizeParameters(parameters: Partial<Sprite2DParameters>): SpriteState {
    const spriteUrl = parameters.spriteUrl ?? parameters.textureUrl ?? this.spriteUrl;
    const spriteMpp = parameters.spriteMpp ?? parameters.mpp ?? this.spriteMpp;
    const spriteOffset = parameters.spriteOffset ?? parameters.offset ?? this.spriteOffset;
    const spriteRotate = parameters.spriteRotate ?? parameters.rotate ?? this.spriteRotate;
    const renderOrder = parameters.renderOrder ?? this.renderOrder;
    const rawColor = parameters.spriteMultiplyColor ?? parameters.multiplyColor ?? this.spriteMultiplyColor;

    if (!spriteUrl) throw new Error("Sprite2D: missing spriteUrl");
    if (spriteMpp === undefined) throw new Error("Sprite2D: missing spriteMpp");
    if (!Number.isFinite(spriteMpp) || spriteMpp <= 0) throw new Error(`Sprite2D: invalid spriteMpp ${spriteMpp}`);

    return {
      spriteUrl,
      spriteMpp,
      spriteOffset: [spriteOffset?.[0] ?? 0.0, spriteOffset?.[1] ?? 0.0],
      spriteRotate: spriteRotate ?? 0.0,
      spriteMultiplyColor: this.toColor(rawColor),
      renderOrder,
    };
  }

  private rebuildGeometry() {
    const spriteItem = spriteAtlas.getSpriteAtlas(this.spriteUrl);
    const { page, u0, v0, u1, v1, imageProps } = spriteItem;
    const { width, height } = imageProps;

    this.geometry?.dispose();
    this.geometry = new SpriteXZRectGeometry({
      x: this.spriteMpp * width,
      z: this.spriteMpp * height,
      u0,
      v0,
      u1,
      v1,
      offset: this.spriteOffset,
      rotate: this.spriteRotate,
    });

    const count = this.geometry.attributes.position.count;
    const aPage = new Float32Array(count);
    for (let i = 0; i < count; i++) aPage[i] = page;
    this.geometry.setAttribute("aPage", new THREE.Float32BufferAttribute(aPage, 1).setUsage(THREE.StaticDrawUsage));
  }

  private syncMultiplyColorAttribute() {
    const material = this.material as Sprite2DMaterial;
    if (!this.geometry) return;

    if (!this.spriteMultiplyColor) {
      this.geometry.deleteAttribute("aMultiplyColor");
      material.useMultiplyColor = false;
      return;
    }

    const count = this.geometry.attributes.position.count;
    const color = this.spriteMultiplyColor;
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

  private toColor(value: Sprite2DColorLike): THREE.Color | undefined {
    if (value === undefined || value === null) return undefined;
    return value instanceof THREE.Color ? value.clone() : new THREE.Color(value);
  }

  private isSameColor(a?: THREE.Color, b?: THREE.Color): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.equals(b);
  }
}
