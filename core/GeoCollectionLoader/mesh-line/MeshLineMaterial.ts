import * as THREE from "three";
import vertexShader from "./shaders/mesh-line.vs?raw";
import fragmentShader from "./shaders/mesh-line.fs?raw";

// https://github.com/spite/THREE.MeshLine

export interface MeshLineMaterialParameters {
  /** 线条颜色 */
  uColor?: string | THREE.Color | number;

  /** 线条透明度(0 ~ 1) */
  uOpacity?: number;

  /** 虚线的样式; 如设置 [5, 5] 时: 实线5个单位, 空白5个单位 */
  uDashArray?: number[];

  /** 渲染素质(像素尺寸) */
  uResolution: THREE.Vector2;

  /** 线宽是否随缩放而缩放 (1: 随距离缩放而缩放(世界位置); 0: 不随距离缩放而缩放(固定像素宽);)  */
  uSizeAttenuation?: number;

  /** 线宽 */
  uLineWidth?: number;

  /** 渲染端点数 */
  uVisibility?: number;

  /** 是否启用虚线 */
  uUseDash?: number;

  /** 透明度测试(0 ~ 1), 当线条片元颜色低于这个透明度时不会被渲染 */
  uAlphaTest?: number;

  /** 当前浏览器指定的pixelRatio */
  uPixelRatio?: number;
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
  uPixelRatio!: number;

  constructor(parameters: MeshLineMaterialParameters) {
    super({
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1 },
        uDashArray: { value: [5, 5] },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSizeAttenuation: { value: 0 },
        uLineWidth: { value: 1 },
        uVisibility: { value: 1 },
        uUseDash: { value: 0 },
        uAlphaTest: { value: 0 },
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
    this.uVisibility = source.uVisibility;
    this.uUseDash = source.uUseDash;
    this.uAlphaTest = source.uAlphaTest;
    this.uPixelRatio = source.uPixelRatio;
    return this;
  }
}
