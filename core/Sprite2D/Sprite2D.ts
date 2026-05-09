import * as THREE from "three";
import { SpriteXZRectGeometry } from "./SpriteXZRectGeometry";
import { Sprite2DMaterial, Sprite2DBlendMode } from "./Sprite2DMaterial";
import type { Sprite2DBlendModeName } from "./Sprite2DMaterial";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";
import { DebugGui, WithDebugGui } from "@core/DebugGUI";
import { DirtyRenderScheduler } from "@core/RenderScheduler";

export interface Sprite2DParameters {
  /** Atlas url/key. */
  url: string;

  /** Three.js world units per source pixel. */
  mpp?: number;

  /** XZ center offset in world units. */
  offset?: [number, number];

  /** Rotation around the local center on Y axis, in radians. */
  rotate?: number;

  /** Compatibility alias for blendColor. */
  multiplyColor?: THREE.Color;

  /** Shader blend color. */
  blendColor?: THREE.Color;

  /** Shader blend mode. */
  blendMode?: Sprite2DBlendModeName | number;

  /** Extra shader opacity. */
  opacity?: number;

  /** Shader-level visibility flag. */
  shaderVisible?: boolean;

  renderOrder?: number;
}

/** XZ-plane texture sprite backed by SpriteAtlas. */
export class Sprite2D extends WithDebugGui(THREE.Mesh) implements Sprite2DParameters {
  isSprite2D = true;

  url: string;
  mpp = 1.0;
  offset: [number, number] = [0.0, 0.0];
  rotate = 0.0;
  multiplyColor: THREE.Color = undefined;
  blendColor: THREE.Color = undefined;
  blendMode: Sprite2DBlendModeName | number = "multiply";
  opacity = 1.0;
  shaderVisible = true;

  constructor(parameters: Sprite2DParameters) {
    super();
    this.material = new Sprite2DMaterial();
    this.apply(parameters, true);
  }

  private apply(parameters: Partial<Sprite2DParameters>, forceRebuildGeometry = false) {
    const next = this.normalizeParameters(parameters);
    const needRebuildGeometry = forceRebuildGeometry || next.url !== this.url || next.mpp !== this.mpp || next.offset[0] !== this.offset[0] || next.offset[1] !== this.offset[1] || next.rotate !== this.rotate;
    const needRebuildColor = !this.multiplyColor || !next.multiplyColor.equals(this.multiplyColor);

    this.url = next.url;
    this.mpp = next.mpp;
    this.offset = [next.offset[0], next.offset[1]];
    this.rotate = next.rotate;
    this.multiplyColor = next.multiplyColor;
    this.blendColor = next.blendColor;
    this.blendMode = next.blendMode;
    this.opacity = next.opacity;
    this.shaderVisible = next.shaderVisible;

    if (needRebuildGeometry) this.rebuildGeometry();
    if (needRebuildGeometry || needRebuildColor) this.syncMultiplyColorAttribute();
    this.syncMaterialState();

    this.renderOrder = next.renderOrder ?? this.renderOrder ?? -1;
    DirtyRenderScheduler.invalidateDefault("Sprite2D.apply");
  }

  private normalizeParameters(parameters: Partial<Sprite2DParameters>): Required<Sprite2DParameters> {
    const url = parameters.url ?? this.url;
    const mpp = parameters.mpp ?? this.mpp;
    const offset = parameters.offset ?? this.offset;
    const rotate = parameters.rotate ?? this.rotate;
    const renderOrder = parameters.renderOrder ?? this.renderOrder;
    const blendColor = parameters.blendColor ?? parameters.multiplyColor ?? this.blendColor ?? this.multiplyColor ?? new THREE.Color(0xffffff);
    const multiplyColor = parameters.multiplyColor ?? parameters.blendColor ?? this.multiplyColor ?? this.blendColor ?? blendColor;
    const blendMode = parameters.blendMode ?? this.blendMode ?? "multiply";
    const opacity = parameters.opacity ?? this.opacity ?? 1.0;
    const shaderVisible = parameters.shaderVisible ?? this.shaderVisible ?? true;

    if (!url) throw new Error("Sprite2D: missing atlas url");
    if (mpp === undefined) throw new Error("Sprite2D: missing mpp");
    if (!Number.isFinite(mpp) || mpp <= 0) throw new Error(`Sprite2D: invalid mpp ${mpp}`);

    return {
      url,
      mpp,
      offset: [offset?.[0] ?? 0.0, offset?.[1] ?? 0.0],
      rotate: rotate ?? 0.0,
      multiplyColor,
      blendColor,
      blendMode,
      opacity,
      shaderVisible,
      renderOrder,
    };
  }

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

  private syncMaterialState() {
    const material = this.material as Sprite2DMaterial;
    material.uBlendColor = this.blendColor ?? this.multiplyColor ?? new THREE.Color(0xffffff);
    material.uBlendMode = typeof this.blendMode === "number" ? this.blendMode : Sprite2DBlendMode[this.blendMode];
    material.uOpacity = this.opacity;
    material.uVisible = this.shaderVisible ? 1.0 : 0.0;
  }

  @DebugGui.number({ name: "mpp", folder: "Sprite2D", min: 0.0001, max: 10, step: 0.0001 })
  get debugMpp() {
    return this.mpp;
  }
  set debugMpp(v: number) {
    this.set({ mpp: v });
  }

  @DebugGui.number({ name: "rotate", folder: "Sprite2D", min: -Math.PI, max: Math.PI, step: 0.001 })
  get debugRotate() {
    return this.rotate;
  }
  set debugRotate(v: number) {
    this.set({ rotate: v });
  }

  @DebugGui.number({ name: "opacity", folder: "Sprite2D", min: 0, max: 1, step: 0.01 })
  get debugOpacity() {
    return this.opacity;
  }
  set debugOpacity(v: number) {
    this.set({ opacity: v });
  }

  @DebugGui.number({ name: "visible", folder: "Sprite2D", min: 0, max: 1, step: 1 })
  get debugShaderVisible() {
    return this.shaderVisible ? 1 : 0;
  }
  set debugShaderVisible(v: number) {
    this.set({ shaderVisible: v === 1 });
  }

  set(parameters: Partial<Sprite2DParameters>): this {
    this.apply(parameters, false);
    return this;
  }
}
