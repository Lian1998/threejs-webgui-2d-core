import * as THREE from "three";
import vertexShader from "./shaders/mesh-polygon.vs?raw";
import fragmentShader from "./shaders/mesh-polygon.fs?raw";

export interface MeshPolygonMaterialParameters {
  /** 线条颜色 */
  uColor: string | THREE.Color | number;

  /** 线条透明度(0 ~ 1) */
  uOpacity?: number;

  /** 阴影的样式; 如设置 [5, 5] 时: 实线5个单位, 空白5个单位 */
  uShadowArray?: number[];

  /** 渲染素质(像素尺寸) */
  uResolution: THREE.Vector2;

  /** 是否启用阴影 */
  uUseShadow?: number;

  /** 当前浏览器指定的pixelRatio */
  uPixelRatio?: number;
}

export class MeshPolygonMaterial extends THREE.ShaderMaterial implements MeshPolygonMaterialParameters {
  uColor!: THREE.Color;
  uOpacity!: number;
  uShadowArray!: number[];
  uResolution!: THREE.Vector2;
  uUseShadow!: number;
  uPixelRatio!: number;

  constructor(parameters: MeshPolygonMaterialParameters) {
    super({
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1 },
        uShadowArray: { value: [3, 1] },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uUseShadow: { value: 0 },
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
      uShadowArray: {
        enumerable: true,
        get() {
          return this.uniforms.uShadowArray.value;
        },
        set(value) {
          this.uniforms.uShadowArray.value = value;
          this.uUseShadow = value !== 0 ? 1 : 0;
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
      uUseShadow: {
        enumerable: true,
        get() {
          return this.uniforms.uUseShadow.value;
        },
        set(value) {
          this.uniforms.uUseShadow.value = value;
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

  override copy(source: MeshPolygonMaterial): this {
    super.copy(source);
    this.uColor.copy(source.uColor);
    this.uOpacity = source.uOpacity;
    this.uShadowArray = source.uShadowArray;
    this.uResolution.copy(source.uResolution);
    this.uUseShadow = source.uUseShadow;
    this.uPixelRatio = source.uPixelRatio;
    return this;
  }
}
