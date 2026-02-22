import * as THREE from "three";

import vertexShader from "./shaders/sdfText2d.vs?raw";
import fragmentShader from "./shaders/sdfText2d.fs?raw";

export interface SDFText2DMaterialParameters extends THREE.ShaderMaterialParameters {
  /** 字符串贴图 */
  uTexture: THREE.Texture;

  /** 字体颜色, 默认为黑 */
  uTextColor?: THREE.Color;

  /** 字体描边颜色, 默认为黑 */
  uOutlineColor?: THREE.Color;

  /** 几何背景色, 默认为白 */
  uBackgroundColor?: THREE.Color;

  /** 几何背景色透明度, 默认为 0.8 */
  uBackgroundAlpha?: number;

  /** 字体外边缘, 默认为 0.7 */
  uThreshold?: number;

  /** 字体描边边缘, 默认为 0.65 */
  uOutlineThreshold?: number;

  /** 字体边缘过渡, 默认为 0.02 */
  uSmoothing?: number;

  /** 透明度, 默认为 1.0 */
  uOpacity?: number;
}

export class SDFText2DMaterial extends THREE.ShaderMaterial {
  constructor(parameters: SDFText2DMaterialParameters) {
    super({
      name: "SDFText2DMaterial",
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTexture: { value: null },
        uTextColor: { value: new THREE.Color(0x000000) },
        uOutlineColor: { value: new THREE.Color(0x000000) },
        uBackgroundColor: { value: new THREE.Color(0xffffff) },
        uBackgroundAlpha: { value: 0.8 },
        uThreshold: { value: 0.7 },
        uOutlineThreshold: { value: 0.65 },
        uSmoothing: { value: 0.02 },
        uOpacity: { value: 1.0 },
      },
      vertexShader,
      fragmentShader,
    });

    this.setValues(parameters);
  }

  get uTexture(): THREE.Texture {
    return this.uniforms.uTexture.value;
  }
  set uTexture(v: THREE.Texture) {
    this.uniforms.uTexture.value = v;
  }

  get uTextColor(): THREE.Color {
    return this.uniforms.uTextColor.value;
  }
  set uTextColor(v: THREE.Color) {
    this.uniforms.uTextColor.value.copy(v);
  }

  get uOutlineColor(): THREE.Color {
    return this.uniforms.uOutlineColor.value;
  }
  set uOutlineColor(v: THREE.Color) {
    this.uniforms.uOutlineColor.value.copy(v);
  }

  get uBackgroundColor(): THREE.Color {
    return this.uniforms.uBackgroundColor.value;
  }
  set uBackgroundColor(v: THREE.Color) {
    this.uniforms.uBackgroundColor.value.copy(v);
  }

  get uBackgroundAlpha(): number {
    return this.uniforms.uBackgroundAlpha.value;
  }
  set uBackgroundAlpha(v: number) {
    this.uniforms.uBackgroundAlpha.value = v;
  }

  get uThreshold(): number {
    return this.uniforms.uThreshold.value;
  }
  set uThreshold(v: number) {
    this.uniforms.uThreshold.value = v;
  }

  get uOutlineThreshold(): number {
    return this.uniforms.uOutlineThreshold.value;
  }
  set uOutlineThreshold(v: number) {
    this.uniforms.uOutlineThreshold.value = v;
  }

  get uSmoothing(): number {
    return this.uniforms.uSmoothing.value;
  }
  set uSmoothing(v: number) {
    this.uniforms.uSmoothing.value = v;
  }

  get uOpacity(): number {
    return this.uniforms.uOpacity.value;
  }
  set uOpacity(v: number) {
    this.uniforms.uOpacity.value = v;
  }
}
