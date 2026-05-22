import * as THREE from "three";

import vertexShader from "./shaders/sprite2d.vs?raw";
import fragmentShader from "./shaders/sprite2d.fs?raw";

import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";
import { ATLAS_TEXTURE_SIZE } from "@core/Sprite2D/Sprite2DAtlas";
import { DebugGUI, WithDebugGUI } from "@core/Mixins";

export const Sprite2DBlendMode = {
  multiply: 0,
  tint: 1,
  screen: 2,
  "linear-dodge": 3,
  overlay: 4,
  "hard-light": 5,
} as const;

export type Sprite2DBlendModeName = keyof typeof Sprite2DBlendMode;

export interface Sprite2DMaterialParameters extends THREE.ShaderMaterialParameters {
  uBlendColor?: THREE.Color;
  uBlendMode?: number;
  uOpacity?: number;
  uVisible?: number;
}

export class Sprite2DMaterial extends WithDebugGUI(THREE.RawShaderMaterial) {
  static textureArray: THREE.DataArrayTexture | null = null;
  private static getTextureArray() {
    const pages = spriteAtlas.getAllPages();
    const size = ATLAS_TEXTURE_SIZE;
    const layerSize = size * size;
    const data = new Uint8Array(layerSize * pages.length * 4); // 四通道贴图
    for (let p = 0; p < pages.length; p++) {
      const canvas = pages[p];
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, size, size);
      const imageDataRGBA = imageData.data;

      const pageOffset = p * layerSize * 4;
      for (let j = 0; j < layerSize; j++) {
        data[pageOffset + j * 4 + 0] = imageDataRGBA[j * 4 + 0]; // R 通道
        data[pageOffset + j * 4 + 1] = imageDataRGBA[j * 4 + 1]; // G 通道
        data[pageOffset + j * 4 + 2] = imageDataRGBA[j * 4 + 2]; // B 通道
        data[pageOffset + j * 4 + 3] = imageDataRGBA[j * 4 + 3]; // A 通道
      }
    }

    const textureArray = new THREE.DataArrayTexture(data, size, size, pages.length); // 准备threejs DataArrayTexture (字形数据存储在红色通道)
    textureArray.flipY = false;
    textureArray.format = THREE.RGBAFormat;
    textureArray.type = THREE.UnsignedByteType;
    textureArray.minFilter = THREE.LinearFilter;
    textureArray.magFilter = THREE.LinearFilter;
    textureArray.generateMipmaps = true;
    textureArray.needsUpdate = true;
    Sprite2DMaterial.textureArray = textureArray;
  }

  constructor(parameters?: Sprite2DMaterialParameters) {
    if (!Sprite2DMaterial.textureArray) Sprite2DMaterial.getTextureArray(); // 准备材质内容
    super({
      name: "Sprite2DMaterial",
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.FrontSide,
      uniforms: {
        uAtlas: { value: Sprite2DMaterial.textureArray },
        uBlendColor: { value: new THREE.Color(0xffffff) },
        uBlendMode: { value: Sprite2DBlendMode.multiply },
        uOpacity: { value: 1.0 },
        uVisible: { value: 1.0 },
      },
      vertexShader,
      fragmentShader,
    });

    this.setValues(parameters);
  }

  @DebugGUI.color({ name: "blend color", folder: "Sprite2D" })
  get uBlendColor(): THREE.Color {
    return this.uniforms.uBlendColor.value;
  }
  set uBlendColor(v: THREE.Color) {
    this.uniforms.uBlendColor.value.copy(v);
  }

  @DebugGUI.number({ name: "blend mode", folder: "Sprite2D", min: 0, max: 5, step: 1 })
  get uBlendMode(): number {
    return this.uniforms.uBlendMode.value;
  }
  set uBlendMode(v: number) {
    this.uniforms.uBlendMode.value = v;
  }

  @DebugGUI.number({ name: "opacity", folder: "Sprite2D", min: 0, max: 1, step: 0.01 })
  get uOpacity(): number {
    return this.uniforms.uOpacity.value;
  }
  set uOpacity(v: number) {
    this.uniforms.uOpacity.value = v;
  }

  @DebugGUI.number({ name: "visible", folder: "Sprite2D", min: 0, max: 1, step: 1 })
  get uVisible(): number {
    return this.uniforms.uVisible.value;
  }
  set uVisible(v: number) {
    this.uniforms.uVisible.value = v;
  }

  get useMultiplyColor(): boolean {
    return this.defines.USE_MULTIPLY_COLOR ? true : false;
  }
  set useMultiplyColor(v: boolean) {
    if (v) this.defines.USE_MULTIPLY_COLOR = 1;
    else delete this.defines.USE_MULTIPLY_COLOR;

    this.needsUpdate = true;
  }
}
