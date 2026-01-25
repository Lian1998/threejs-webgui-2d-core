import * as THREE from "three";
import vertexShader from "./shaders/mesh-polygon.vs?raw";
import fragmentShader from "./shaders/mesh-polygon.fs?raw";

export interface MeshPolygonMaterialParameters {
  /** 线条颜色 */
  uColor: string | THREE.Color | number;

  /** 线条透明度(默认值1) */
  uOpacity?: number;

  /** 是否启用阴影斜线(默认值0) */
  uUseShadow?: number;

  /** 阴影斜线的样式(默认值[1.0, 3.0]): 先是实部占用1.0个单位, 再是虚部占用3.0个单位 */
  uShadowArray?: number[];

  /** 当前材质绘制时的画布大小 */
  uResolution: THREE.Vector2;

  /** 当前材质绘制时的pixelRatio(默认值1) */
  uPixelRatio?: number;
}

export class MeshPolygonMaterial extends THREE.ShaderMaterial implements MeshPolygonMaterialParameters {
  uColor!: THREE.Color;
  uOpacity!: number;
  uUseShadow!: number;
  uShadowArray!: number[];
  uResolution!: THREE.Vector2;
  uPixelRatio!: number;

  constructor(parameters: MeshPolygonMaterialParameters) {
    super({
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1.0 },
        uUseShadow: { value: 0 },
        uShadowArray: { value: [1.0, 3.0] },
        uResolution: { value: new THREE.Vector2(1920, 1080) },
        uPixelRatio: { value: 1.0 },
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
      uUseShadow: {
        enumerable: true,
        get() {
          return this.uniforms.uUseShadow.value;
        },
        set(value) {
          this.uniforms.uUseShadow.value = value;
        },
      },
      uShadowArray: {
        enumerable: true,
        get() {
          return this.uniforms.uShadowArray.value;
        },
        set(value) {
          if (!(Array.isArray(value) && value.length === 2)) throw new Error("[MeshPolygonMaterial]: 注册阴影面配置时请用长度为2的javascript数组!");
          this.uniforms.uShadowArray.value = value;
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
    this.uUseShadow = source.uUseShadow;
    this.uShadowArray = source.uShadowArray;
    this.uResolution.copy(source.uResolution);
    this.uPixelRatio = source.uPixelRatio;
    return this;
  }
}
