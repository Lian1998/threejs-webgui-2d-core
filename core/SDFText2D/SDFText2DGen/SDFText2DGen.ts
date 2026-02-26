import * as THREE from "three";

import { SpriteXZRectGeometry } from "@core/Sprite2D/index";
import { SDFText2DGenMaterial } from "./SDFText2DGenMaterial";

import { SDF_FONT_SIZE } from "@core/SDFText2D/font-atlas/tinySdfWrapper";
import { tinySdfInstance } from "@core/SDFText2D/font-atlas/tinySdfWrapper";

import { gen as genTinySDFCanvas2D } from "@core/SDFText2D/debug/gen/TinySDF.Canvas2D";

const canvasCache = new Map<string, HTMLCanvasElement>(); // 缓存文字字符串生成过的贴图

export interface SDFText2DParameters {
  /** 文字内容 */
  text: string;

  /** THREE.Object3D.renderOrder */
  renderOrder: number;
}

/**
 * 此Mesh使用TinySDF生成SDFTextMesh
 * 不管多长的字符串, 其Geometry只有
 * 使用Canvas2DAPI先将字形贴图烘焙到同一张贴图
 */
export class SDFText2DGen extends THREE.Mesh {
  isSDFText2D = true;

  text: string = "?";

  constructor(parameters: SDFText2DParameters) {
    super();
    this.setParameters(parameters);
  }

  private setParameters(parameters: SDFText2DParameters) {
    const { text, renderOrder } = parameters;
    this.text = text;

    let canvas = canvasCache.get(text);
    if (!canvas) {
      canvas = genTinySDFCanvas2D(tinySdfInstance, text);
      canvasCache.set(text, canvas);
    }

    // 生成几何
    const scaleFactor = 4.0 / SDF_FONT_SIZE;
    const geometry = new SpriteXZRectGeometry(canvas.width * scaleFactor, canvas.height * scaleFactor);

    const texture = new THREE.Texture(canvas);
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    const material = new SDFText2DGenMaterial({ uTexture: texture });

    this.geometry = geometry;
    this.material = material;
    this.renderOrder = renderOrder ?? -1;
  }
}
