import * as THREE from "three";
import vertexShader from "./shaders/mesh-line.vs?raw";
import fragmentShader from "./shaders/mesh-line.fs?raw";

/**
 * https://github.com/spite/THREE.MeshLine
 */
export interface MeshLineMaterialParameters {
  /** THREE.Color to paint the line width, or tint the texture with */
  uColor?: string | THREE.Color | number;

  /**  alpha value from 0 to 1 (requires transparent set to true) */
  uOpacity?: number;

  /** 使用一个两个长度数组来快速设置虚线的样式; 如设置 [5, 5] 时: 实线5个单位, 空白5个单位 */
  uDashArray?: number[];

  /** THREE.Vector2 specifying the canvas size (REQUIRED) */
  uResolution: THREE.Vector2; // required

  /** 线宽是否随着距离衰减而衰减 */
  uSizeAttenuation?: number;

  /** 线宽(sizeAttenuation, 世界坐标; !sizeAttenuation, 线条在屏幕的宽度 */
  uLineWidth?: number;

  uVisibility?: number;

  uUseDash?: number;

  /** cutoff value from 0 to 1 */
  uAlphaTest?: number;
}

export class MeshLineMaterial extends THREE.ShaderMaterial implements MeshLineMaterialParameters {
  uColor!: THREE.Color;
  uOpacity!: number;
  uDashArray!: number[];
  uResolution!: THREE.Vector2;
  uSizeAttenuation!: number;
  uLineWidth!: number;
  uVisibility!: number;
  uUseDash!: number;
  uAlphaTest!: number;

  constructor(parameters: MeshLineMaterialParameters) {
    super({
      uniforms: {
        ...THREE.UniformsLib.fog,
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1 },
        uDashArray: { value: [5, 5] },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSizeAttenuation: { value: 0 },
        uLineWidth: { value: 1 },
        uVisibility: { value: 1 },
        uUseDash: { value: 0 },
        uAlphaTest: { value: 0 },
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
          this.uniforms.uColor.value = value;
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
          this.uUseDash = value !== 0 ? 1 : 0;
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
      uVisibility: {
        enumerable: true,
        get() {
          return this.uniforms.uVisibility.value;
        },
        set(value) {
          this.uniforms.uVisibility.value = value;
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
      uAlphaTest: {
        enumerable: true,
        get() {
          return this.uniforms.uAlphaTest.value;
        },
        set(value) {
          this.uniforms.uAlphaTest.value = value;
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
    this.uVisibility = source.uVisibility;
    this.uUseDash = source.uUseDash;
    this.uAlphaTest = source.uAlphaTest;
    return this;
  }
}
