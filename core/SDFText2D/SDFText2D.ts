import * as THREE from "three";
import type { SDFText2DGeometryParameters } from "./SDFText2DGeometry";
import { SDFText2DGeometry } from "./SDFText2DGeometry";
import type { SDFText2DMaterialParameters } from "./SDFText2DMaterial";
import { SDFText2DMaterial } from "./SDFText2DMaterial";
import { DebugGUI, WithDebugGUI } from "@core/Mixins";
import { DirtyRenderScheduler } from "@core/RenderScheduler";

type SDFText2DStyleParameters = Pick<SDFText2DMaterialParameters, "uTextColor" | "uOutlineColor" | "uBackgroundColor" | "uBackgroundAlpha" | "uBackgroundRadius" | "uThreshold" | "uOutlineThreshold" | "uSmoothing" | "uOpacity" | "uVisible">;

export interface SDFText2DParameters extends SDFText2DGeometryParameters, SDFText2DStyleParameters {
  renderOrder?: THREE.Object3D["renderOrder"];
}

/** XZ-plane SDF text label. */
export class SDFText2D extends WithDebugGUI(THREE.Mesh) implements SDFText2DParameters {
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

  setText(text: string, geometryOptions: Partial<Omit<SDFText2DGeometryParameters, "text">> = {}): this {
    this.apply({ ...geometryOptions, text }, true);
    return this;
  }

  setStyle(style: Partial<SDFText2DStyleParameters>): this {
    this.apply(style as Partial<SDFText2DParameters>, false);
    return this;
  }

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

    if (needRebuildGeometry) {
      (this.geometry as SDFText2DGeometry).setFromText({
        text: this.text,
        fontSize: this.fontSize,
        fontSpacingFactor: this.fontSpacingFactor,
        lineHeight: this.lineHeight,
        padding: this.padding,
      });
    }

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
    if (parameters.uVisible !== undefined) material.uVisible = parameters.uVisible;

    if (parameters.renderOrder !== undefined) this.renderOrder = parameters.renderOrder;

    DirtyRenderScheduler.invalidateDefault("SDFText2D.apply");
  }

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

  @DebugGUI.string({ name: "text", folder: "SDFText2D" })
  get debugText() {
    return this.text;
  }
  set debugText(v: string) {
    this.setText(v);
  }

  @DebugGUI.number({ name: "font size", folder: "SDFText2D", min: 0.1, max: 64, step: 0.1 })
  get debugFontSize() {
    return this.fontSize;
  }
  set debugFontSize(v: number) {
    this.update({ fontSize: v });
  }

  @DebugGUI.number({ name: "line height", folder: "SDFText2D", min: 0.1, max: 96, step: 0.1 })
  get debugLineHeight() {
    return this.lineHeight;
  }
  set debugLineHeight(v: number) {
    this.update({ lineHeight: v });
  }
}
