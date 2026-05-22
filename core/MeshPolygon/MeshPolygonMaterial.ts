import * as THREE from "three";
import vertexShader from "./shaders/mesh-polygon.vs?raw";
import fragmentShader from "./shaders/mesh-polygon.fs?raw";
import { DebugGUI, WithDebugGUI } from "@core/Mixins";

export interface MeshPolygonMaterialParameters extends THREE.ShaderMaterialParameters {
  /** 线条颜色 */
  uColor: THREE.Color;

  /** 线条透明度(默认值1) */
  uOpacity?: number;

  /** 是否启用阴影斜线(默认值0) */
  uUseShadow?: 0 | 1;

  /** 阴影斜线的样式(默认值[1.0, 3.0]): 先是实部占用1.0个单位, 再是虚部占用3.0个单位 */
  uShadowArray?: THREE.Vector2;

  /** 当前材质绘制时的画布大小 */
  uResolution: THREE.Vector2;

  /** 当前材质绘制时的pixelRatio(默认值1) */
  uPixelRatio?: number;
}

export class MeshPolygonMaterial extends WithDebugGUI(THREE.RawShaderMaterial) {
  constructor(parameters: MeshPolygonMaterialParameters) {
    super({
      name: "MeshPolygonMaterial",
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.FrontSide,
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1.0 },
        uUseShadow: { value: 0 },
        uShadowArray: { value: new THREE.Vector2(1.0, 3.0) },
        uResolution: { value: new THREE.Vector2(1920.0, 1080.0) },
        uPixelRatio: { value: 1.0 },
      },
      vertexShader,
      fragmentShader,
    });

    this.setValues(parameters);
  }

  @DebugGUI.color({ name: "color", folder: "MeshPolygon" })
  get uColor() {
    return this.uniforms.uColor.value;
  }
  set uColor(v: THREE.Color) {
    this.uniforms.uColor.value.copy(v);
  }

  @DebugGUI.number({ name: "opacity", folder: "MeshPolygon", min: 0, max: 1, step: 0.01 })
  get uOpacity() {
    return this.uniforms.uOpacity.value;
  }
  set uOpacity(v: number) {
    this.uniforms.uOpacity.value = v;
  }

  @DebugGUI.number({ name: "shadow", folder: "MeshPolygon", min: 0, max: 1, step: 1 })
  get uUseShadow() {
    return this.uniforms.uUseShadow.value;
  }
  set uUseShadow(v: 0 | 1) {
    this.uniforms.uUseShadow.value = v;
  }

  @DebugGUI.vector2({ name: "shadow array", folder: "MeshPolygon", min: 0, max: 128, step: 0.1 })
  get uShadowArray() {
    return this.uniforms.uShadowArray.value;
  }
  set uShadowArray(v: THREE.Vector2) {
    this.uniforms.uShadowArray.value.copy(v);
  }

  get uResolution() {
    return this.uniforms.uResolution.value;
  }
  set uResolution(v: THREE.Vector2) {
    this.uniforms.uResolution.value.copy(v);
  }

  get uPixelRatio() {
    return this.uniforms.uPixelRatio.value;
  }
  set uPixelRatio(v: number) {
    this.uniforms.uPixelRatio.value = v;
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
