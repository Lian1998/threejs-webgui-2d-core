import * as THREE from "three";

import vertexShader from "./shaders/sprite2d.vs?raw";
import fragmentShader from "./shaders/sprite2d.fs?raw";

export interface Sprite2DMaterialParameters extends THREE.ShaderMaterialParameters {
  /** 线条颜色 */
  uTexture: THREE.Texture;

  /** 混合色 */
  uMultiplyColor?: THREE.Color;
}

export class Sprite2DMaterial extends THREE.ShaderMaterial {
  constructor(parameters: Sprite2DMaterialParameters) {
    super({
      name: "Sprite2DMaterial",
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTexture: { value: null },
        uMultiplyColor: { value: new THREE.Color() },
      },
      defines: {
        USE_MULTIPLYCOLOR: 0,
      },
      vertexShader,
      fragmentShader,
    });

    this.setValues(parameters);
  }

  get uTexture() {
    return this.uniforms.uTexture.value;
  }
  set uTexture(v: THREE.Texture) {
    this.uniforms.uTexture.value = v;
  }

  get uMultiplyColor(): THREE.Color | null {
    return this.defines.USE_MULTIPLYCOLOR ? this.uniforms.uMultiplyColor.value : null;
  }
  set uMultiplyColor(v: THREE.Color | null) {
    if (v) {
      this.uniforms.uMultiplyColor.value.copy(v);
      this.defines.USE_MULTIPLYCOLOR = 1;
    } else {
      this.defines.USE_MULTIPLYCOLOR = 0;
    }

    this.needsUpdate = true;
  }
}
