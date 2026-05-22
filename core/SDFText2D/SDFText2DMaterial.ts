import * as THREE from "three";

import vertexShader from "./shaders/sdfText2d.vs?raw";
import fragmentShader from "./shaders/sdfText2d.fs?raw";

import { tinySDFAtlas } from "@core/SDFText2D/TinySdfAtlas";
import { ATLAS_TEXTURE_SIZE } from "@core/SDFText2D/TinySdfAtlas";
import { SDF_FONT_SIZE } from "@core/SDFText2D/TinySdfAtlas";
import { SDF_BUFFER } from "@core/SDFText2D/TinySdfAtlas";
import { SDF_SIZE } from "@core/SDFText2D/TinySdfAtlas";
import { DebugGUI, WithDebugGUI } from "@core/Mixins";

export interface SDFText2DMaterialParameters extends THREE.ShaderMaterialParameters {
  /** 字体颜色, 默认为黑 */
  uTextColor?: THREE.Color;

  /** 字体描边颜色, 默认为黑 */
  uOutlineColor?: THREE.Color;

  /** 几何背景色, 默认为白 */
  uBackgroundColor?: THREE.Color;

  /** 几何背景色透明度, 默认为 0.8 */
  uBackgroundAlpha?: number;

  /** 几何背景色圆角, 默认值为 0.15 */
  uBackgroundRadius?: number;

  /** 字体外边缘, 默认为 0.7 */
  uThreshold?: number;

  /** 字体描边边缘, 默认为 0.65 */
  uOutlineThreshold?: number;

  /** 字体边缘过渡, 默认为 0.02 */
  uSmoothing?: number;

  /** 透明度, 默认为 1.0 */
  uOpacity?: number;
  uVisible?: number;
}

export class SDFText2DMaterial extends WithDebugGUI(THREE.RawShaderMaterial) {
  static textureArray: THREE.DataArrayTexture = undefined;
  private static getTextureArray() {
    const pages = tinySDFAtlas.getAllPages();
    const size = ATLAS_TEXTURE_SIZE;
    const layerSize = size * size;
    const data = new Uint8Array(layerSize * pages.length); // 单通道贴图
    for (let p = 0; p < pages.length; p++) {
      const canvas = pages[p];
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, size, size);
      const imageDataRGBA = imageData.data;

      const pageOffset = p * layerSize;
      for (let j = 0; j < layerSize; j++) {
        data[pageOffset + j * 1 + 0] = imageDataRGBA[j * 4 + 0]; // R 通道
      }
    }

    const textureArray = new THREE.DataArrayTexture(data, size, size, pages.length); // 准备threejs DataArrayTexture (字形数据存储在红色通道)
    textureArray.flipY = false;
    textureArray.format = THREE.RedFormat;
    textureArray.type = THREE.UnsignedByteType;
    textureArray.minFilter = THREE.LinearFilter;
    textureArray.magFilter = THREE.LinearFilter;
    textureArray.generateMipmaps = false;
    textureArray.needsUpdate = true;
    SDFText2DMaterial.textureArray = textureArray;
  }

  constructor(parameters: SDFText2DMaterialParameters = {}) {
    if (!SDFText2DMaterial.textureArray) SDFText2DMaterial.getTextureArray(); // 准备材质内容
    super({
      name: "SDFText2DMaterial",
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.FrontSide,
      uniforms: {
        uAtlas: { value: SDFText2DMaterial.textureArray },
        uTextColor: { value: new THREE.Color(0x000000) },
        uOutlineColor: { value: new THREE.Color(0x000000) },
        uBackgroundColor: { value: new THREE.Color(0xffffff) },
        uBackgroundAlpha: { value: 0.8 },
        uBackgroundRadius: { value: 0.15 },

        uThreshold: { value: 0.7 },
        uOutlineThreshold: { value: 0.65 },
        uSmoothing: { value: 0.02 },

        uOpacity: { value: 1.0 },
        uVisible: { value: 1.0 },
      },
      vertexShader,
      fragmentShader,
    });

    this.setValues(parameters);
  }

  @DebugGUI.color({ name: "text color", folder: "SDFText2D" })
  get uTextColor(): THREE.Color {
    return this.uniforms.uTextColor.value;
  }
  set uTextColor(v: THREE.Color) {
    this.uniforms.uTextColor.value.copy(v);
  }

  @DebugGUI.color({ name: "outline color", folder: "SDFText2D" })
  get uOutlineColor(): THREE.Color {
    return this.uniforms.uOutlineColor.value;
  }
  set uOutlineColor(v: THREE.Color) {
    this.uniforms.uOutlineColor.value.copy(v);
  }

  @DebugGUI.color({ name: "background color", folder: "SDFText2D" })
  get uBackgroundColor(): THREE.Color {
    return this.uniforms.uBackgroundColor.value;
  }
  set uBackgroundColor(v: THREE.Color) {
    this.uniforms.uBackgroundColor.value.copy(v);
  }

  @DebugGUI.number({ name: "background alpha", folder: "SDFText2D", min: 0, max: 1, step: 0.01 })
  get uBackgroundAlpha(): number {
    return this.uniforms.uBackgroundAlpha.value;
  }
  set uBackgroundAlpha(v: number) {
    this.uniforms.uBackgroundAlpha.value = v;
  }

  @DebugGUI.number({ name: "background radius", folder: "SDFText2D", min: 0, max: 0.5, step: 0.005 })
  get uBackgroundRadius(): number {
    return this.uniforms.uBackgroundRadius.value;
  }
  set uBackgroundRadius(v: number) {
    this.uniforms.uBackgroundRadius.value = v;
  }

  @DebugGUI.number({ name: "threshold", folder: "SDFText2D", min: 0, max: 1, step: 0.001 })
  get uThreshold(): number {
    return this.uniforms.uThreshold.value;
  }
  set uThreshold(v: number) {
    this.uniforms.uThreshold.value = v;
  }

  @DebugGUI.number({ name: "outline threshold", folder: "SDFText2D", min: 0, max: 1, step: 0.001 })
  get uOutlineThreshold(): number {
    return this.uniforms.uOutlineThreshold.value;
  }
  set uOutlineThreshold(v: number) {
    this.uniforms.uOutlineThreshold.value = v;
  }

  @DebugGUI.number({ name: "smoothing", folder: "SDFText2D", min: 0, max: 0.2, step: 0.001 })
  get uSmoothing(): number {
    return this.uniforms.uSmoothing.value;
  }
  set uSmoothing(v: number) {
    this.uniforms.uSmoothing.value = v;
  }

  @DebugGUI.number({ name: "opacity", folder: "SDFText2D", min: 0, max: 1, step: 0.01 })
  get uOpacity(): number {
    return this.uniforms.uOpacity.value;
  }
  set uOpacity(v: number) {
    this.uniforms.uOpacity.value = v;
  }

  @DebugGUI.number({ name: "visible", folder: "SDFText2D", min: 0, max: 1, step: 1 })
  get uVisible(): number {
    return this.uniforms.uVisible.value;
  }
  set uVisible(v: number) {
    this.uniforms.uVisible.value = v;
  }
}
