import * as THREE from "three";
import vertexShader from "./shaders/mesh-line.vs?raw";
import fragmentShader from "./shaders/mesh-line.fs?raw";

// https://github.com/spite/THREE.MeshLine

export interface MeshLineMaterialParameters {
  /** 线条颜色 */
  uColor?: string | THREE.Color | number;

  /** 线条透明度(默认值1) */
  uOpacity?: number;

  /** 是否启用虚线(默认值0) */
  uUseDash?: number;

  /** 虚线的样式(默认值[4.0, 4.0]): 如设置 [4.0, 4.0] 时, 先实部占用4.0个单位, 再是虚部占用4.0个单位 */
  uDashArray?: number[];

  /** 是否启用小方格线(默认值0) */
  uUseBox?: number;

  /** 虚线的样式(默认值[1.0, 4.0]): 如设置 [1.0, 4.0] 时, 线条的宽度为1.0, 小方格的大小为4.0, 线条与小方格的比例恒定为4:3 */
  uBoxArray?: number[];

  /** 当前材质绘制时的画布大小 */
  uResolution: THREE.Vector2;

  /** 线宽是否随距离衰减(默认值0): 1 随与相机距离变化(世界空间); 0 不随距离变化(屏幕空间) */
  uSizeAttenuation?: number;

  /** 线宽(默认值1) */
  uLineWidth?: number;

  /** 当前材质绘制时的pixelRatio(默认值1) */
  uPixelRatio?: number;
}

export class MeshLineMaterial extends THREE.ShaderMaterial implements MeshLineMaterialParameters {
  uColor!: THREE.Color;
  uOpacity!: number;
  uUseDash!: number;
  uDashArray!: number[];
  uUseBox!: number;
  uBoxArray!: number[];
  uResolution!: THREE.Vector2;
  uSizeAttenuation!: number;
  uLineWidth!: number;
  uPixelRatio!: number;

  constructor(parameters: MeshLineMaterialParameters) {
    super({
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1 },
        uUseDash: { value: 0 },
        uDashArray: { value: [4.0, 4.0] },
        uUseBox: { value: 0 },
        uBoxArray: { value: [1.0, 4.0] },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSizeAttenuation: { value: 0 },
        uLineWidth: { value: 1 },
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
      uUseDash: {
        enumerable: true,
        get() {
          return this.uniforms.uUseDash.value;
        },
        set(value) {
          this.uniforms.uUseDash.value = value;
        },
      },
      uDashArray: {
        enumerable: true,
        get() {
          return this.uniforms.uDashArray.value;
        },
        set(value) {
          this.uniforms.uDashArray.value = value;
          if (Array.isArray(value)) this.uniforms.uUseDash.value = 1;
        },
      },
      uUseBox: {
        enumerable: true,
        get() {
          return this.uniforms.uUseBox.value;
        },
        set(value) {
          this.uniforms.uUseBox.value = value;
        },
      },
      uBoxArray: {
        enumerable: true,
        get() {
          return this.uniforms.uBoxArray.value;
        },
        set(value) {
          this.uniforms.uBoxArray.value = value;
          if (Array.isArray(value)) {
            this.uniforms.uUseBox.value = 1;
            this.uniforms.uSizeAttenuation.value = 1; // 开启绘制小方格功能时, 必须是世界空间
            // 绘制小方格时需要保证面片的宽度不能小于小方格
            if (this.uniforms.uLineWidth.value < value[1]) {
              this.uniforms.uLineWidth.value = value[1];
            }
          }
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
    if (this.uUseBox == 1.0) console.log(this); // debug: 打印一下useBox的数据
  }

  override copy(source: MeshLineMaterial): this {
    super.copy(source);
    this.uColor.copy(source.uColor);
    this.uOpacity = source.uOpacity;
    this.uUseDash = source.uUseDash;
    this.uDashArray = source.uDashArray;
    this.uUseBox = source.uUseBox;
    this.uBoxArray = source.uBoxArray;
    this.uResolution.copy(source.uResolution);
    this.uSizeAttenuation = source.uSizeAttenuation;
    this.uLineWidth = source.uLineWidth;
    this.uPixelRatio = source.uPixelRatio;
    return this;
  }
}
