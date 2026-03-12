import * as THREE from "three";
import type { SDFText2DGeometryParameters } from "./SDFText2DGeometry";
import { SDFText2DGeometry } from "./SDFText2DGeometry";
import type { SDFText2DMaterialParameters } from "./SDFText2DMaterial";
import { SDFText2DMaterial } from "./SDFText2DMaterial";

type SDFText2DStyleParameters = Pick<SDFText2DMaterialParameters, "uTextColor" | "uOutlineColor" | "uBackgroundColor" | "uBackgroundAlpha" | "uBackgroundRadius" | "uThreshold" | "uOutlineThreshold" | "uSmoothing" | "uOpacity">;

interface SDFText2DParameters extends SDFText2DGeometryParameters, SDFText2DStyleParameters {
  renderOrder?: THREE.Object3D["renderOrder"];
}

/** xz平面SDF文本标签 */
export class SDFText2D extends THREE.Mesh implements SDFText2DParameters {
  isSDFText2D = true;

  text = "";
  fontSize = 4.0;
  fontSpacingFactor = 1.0;
  lineHeight = 5.0;
  padding: number | number[] = 0.0;

  constructor(parameters: SDFText2DParameters) {
    const geometry = new SDFText2DGeometry();
    const material = new SDFText2DMaterial({});
    super(geometry, material);
    this.apply(parameters, true);
  }

  update(parameters: Partial<SDFText2DParameters>): this {
    this.apply(parameters, false);
    return this;
  }

  /**
   * 改变 文本 或 文本排版属性
   * @param text 文本
   * @param geometryOptions 文本排版属性
   * @returns
   */
  setText(text: string, geometryOptions: Partial<Omit<SDFText2DGeometryParameters, "text">> = {}): this {
    this.apply({ ...geometryOptions, text }, true);
    return this;
  }

  /**
   * 改变 文本样式
   * @param style 文本样式
   * @returns
   */
  setStyle(style: Partial<SDFText2DStyleParameters>): this {
    this.apply(style as Partial<SDFText2DParameters>, false);
    return this;
  }

  /**
   * 接受参数修改
   * @param {Partial<SDFText2DParameters>} parameters 新的参数
   * @param forceRebuildGeometry 是否强制重新计算 geometryBuffer
   */
  private apply(parameters: Partial<SDFText2DParameters>, forceRebuildGeometry: boolean) {
    const prevPadding = this.padding;
    const nextPadding = parameters.padding ?? prevPadding;
    const needRebuildGeometry =
      forceRebuildGeometry ||
      (parameters.text !== undefined && parameters.text !== this.text) ||
      (parameters.fontSize !== undefined && parameters.fontSize !== this.fontSize) ||
      (parameters.fontSpacingFactor !== undefined && parameters.fontSpacingFactor !== this.fontSpacingFactor) ||
      (parameters.lineHeight !== undefined && parameters.lineHeight !== this.lineHeight) ||
      !this.isSamePadding(nextPadding, prevPadding);

    this.text = parameters.text ?? this.text;
    this.fontSize = parameters.fontSize ?? this.fontSize;
    this.fontSpacingFactor = parameters.fontSpacingFactor ?? this.fontSpacingFactor;
    this.lineHeight = parameters.lineHeight ?? this.lineHeight;
    this.padding = nextPadding;

    // 重新计算 geometryBuffer
    if (needRebuildGeometry) {
      (this.geometry as SDFText2DGeometry).setFromText({
        text: this.text,
        fontSize: this.fontSize,
        fontSpacingFactor: this.fontSpacingFactor,
        lineHeight: this.lineHeight,
        padding: this.padding,
      });
    }

    // 更新材质属性
    const material = this.material as SDFText2DMaterial;
    if (parameters.uTextColor !== undefined) material.uTextColor = parameters.uTextColor;
    if (parameters.uOutlineColor !== undefined) material.uOutlineColor = parameters.uOutlineColor;
    if (parameters.uBackgroundColor !== undefined) material.uBackgroundColor = parameters.uBackgroundColor;
    if (parameters.uBackgroundAlpha !== undefined) material.uBackgroundAlpha = parameters.uBackgroundAlpha;
    if (parameters.uBackgroundRadius !== undefined) material.uBackgroundRadius = parameters.uBackgroundRadius;
    if (parameters.uThreshold !== undefined) material.uThreshold = parameters.uThreshold;
    if (parameters.uOutlineThreshold !== undefined) material.uOutlineThreshold = parameters.uOutlineThreshold;
    if (parameters.uSmoothing !== undefined) material.uSmoothing = parameters.uSmoothing;
    if (parameters.uOpacity !== undefined) material.uOpacity = parameters.uOpacity;

    // 更新renderOrder
    if (parameters.renderOrder !== undefined) this.renderOrder = parameters.renderOrder;
  }

  /** 判断padding是否修改 */
  private isSamePadding(a: number | number[] | undefined, b: number | number[] | undefined): boolean {
    if (a === b) return true;
    if (typeof a === "number" || typeof b === "number") return false;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
