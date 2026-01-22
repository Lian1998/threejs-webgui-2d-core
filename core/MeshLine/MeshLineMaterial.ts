import * as THREE from "three";
import vertexShader from "./shaders/mesh-line.vs?raw";
import fragmentShader from "./shaders/mesh-line.fs?raw";

// https://github.com/spite/THREE.MeshLine

export interface MeshLineMaterialParameters {
  /** 线条颜色 */
  uColor?: string | THREE.Color | number;

  /** 线条透明度(默认值1) */
  uOpacity?: number;

  /** 虚线的样式(默认值[4, 4]): 如设置 [4, 4] 时, 黑4白4 */
  uDashArray?: number[];

  /** 当前材质绘制时的画布大小 */
  uResolution: THREE.Vector2;

  /** 线宽是否随缩放而缩放(默认值0): 1 随距离缩放而缩放(世界位置); 0 不随距离缩放而缩放(固定像素宽) */
  uSizeAttenuation?: number;

  /** 线宽(默认值1) */
  uLineWidth?: number;

  /** 是否启用虚线(默认值0) */
  uUseDash?: number;

  /** 当前材质绘制时的pixelRatio(默认值1) */
  uPixelRatio?: number;
}

export class MeshLineMaterial extends THREE.ShaderMaterial implements MeshLineMaterialParameters {
  uColor!: THREE.Color;
  uOpacity!: number;
  uDashArray!: number[];
  uResolution!: THREE.Vector2;
  uSizeAttenuation!: number;
  uLineWidth!: number;
  uUseDash!: number;
  uPixelRatio!: number;

  constructor(parameters: MeshLineMaterialParameters) {
    super({
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1 },
        uDashArray: { value: [4.0, 4.0] },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSizeAttenuation: { value: 0 },
        uLineWidth: { value: 1 },
        uUseDash: { value: 0 },
        uPixelRatio: { value: 1 },
      },
      vertexShader,
      fragmentShader,
    });

    Object.defineProperties(this, {
      uColor: {
        enumerable: true,
        get() {
          return this.uniforms.uColor.value;
        },
        set(value) {
          this.uniforms.uColor.value.copy(value);
        },
      },
      uOpacity: {
        enumerable: true,
        get() {
          return this.uniforms.uOpacity.value;
        },
        set(value) {
          this.uniforms.uOpacity.value = value;
        },
      },
      uDashArray: {
        enumerable: true,
        get() {
          return this.uniforms.uDashArray.value;
        },
        set(value) {
          this.uniforms.uDashArray.value = value;
          if (Array.isArray(value)) this.uUseDash = 1;
        },
      },
      uResolution: {
        enumerable: true,
        get() {
          return this.uniforms.uResolution.value;
        },
        set(value) {
          this.uniforms.uResolution.value.copy(value);
        },
      },
      uSizeAttenuation: {
        enumerable: true,
        get() {
          return this.uniforms.uSizeAttenuation.value;
        },
        set(value) {
          this.uniforms.uSizeAttenuation.value = value;
        },
      },
      uLineWidth: {
        enumerable: true,
        get() {
          return this.uniforms.uLineWidth.value;
        },
        set(value) {
          this.uniforms.uLineWidth.value = value;
        },
      },
      uUseDash: {
        enumerable: true,
        get() {
          return this.uniforms.uUseDash.value;
        },
        set(value) {
          this.uniforms.uUseDash.value = value;
        },
      },
      uPixelRatio: {
        enumerable: true,
        get() {
          return this.uniforms.uPixelRatio.value;
        },
        set(value) {
          this.uniforms.uPixelRatio.value = value;
        },
      },
    });
    this.setValues(parameters as THREE.ShaderMaterialParameters);
  }

  override copy(source: MeshLineMaterial): this {
    super.copy(source);
    this.uColor.copy(source.uColor);
    this.uOpacity = source.uOpacity;
    this.uDashArray = source.uDashArray;
    this.uResolution.copy(source.uResolution);
    this.uSizeAttenuation = source.uSizeAttenuation;
    this.uLineWidth = source.uLineWidth;
    this.uUseDash = source.uUseDash;
    this.uPixelRatio = source.uPixelRatio;
    return this;
  }
}
