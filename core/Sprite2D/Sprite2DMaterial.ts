import * as THREE from "three";

import vertexShader from "./shaders/sprite2d.vs?raw";
import fragmentShader from "./shaders/sprite2d.fs?raw";

import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";
import { ATLAS_TEXTURE_SIZE } from "@core/Sprite2D/Sprite2DAtlas";

export interface Sprite2DMaterialParameters extends THREE.ShaderMaterialParameters {}

export class Sprite2DMaterial extends THREE.RawShaderMaterial {
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
      },
      vertexShader,
      fragmentShader,
    });

    this.setValues(parameters);
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
