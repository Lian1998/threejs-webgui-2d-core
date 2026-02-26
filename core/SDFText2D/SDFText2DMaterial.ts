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

export class SDFText2DMaterial extends THREE.ShaderMaterial {}
