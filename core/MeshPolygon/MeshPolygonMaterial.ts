import * as THREE from "three";
import vertexShader from "./shaders/mesh-polygon.vs?raw";
import fragmentShader from "./shaders/mesh-polygon.fs?raw";

export interface MeshPolygonMaterialParameters {
  /** 线条颜色 */
  uColor: string | THREE.Color | number;

  /** 线条透明度(默认值1) */
  uOpacity?: number;

  /** 阴影斜线的样式(默认值[1.0, 3.0]): 如设置 [1.0, 3.0] 时, 黑1白3 */
  uShadowArray?: number[];

  /** 当前材质绘制时的画布大小 */
  uResolution: THREE.Vector2;

  /** 是否启用阴影斜线(默认值0) */
  uUseShadow?: number;

  /** 当前材质绘制时的pixelRatio(默认值1) */
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
        uShadowArray: { value: [1.0, 3.0] },
        uResolution: { value: new THREE.Vector2(1920, 1080) },
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
      uShadowArray: {
        enumerable: true,
        get() {
          return this.uniforms.uShadowArray.value;
        },
        set(value) {
          this.uniforms.uShadowArray.value = value;
          if (Array.isArray(value)) this.uUseShadow = 1;
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
