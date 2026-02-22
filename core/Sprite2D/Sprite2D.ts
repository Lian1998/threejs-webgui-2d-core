import * as THREE from "three";

import { SpriteXZRectGeometry } from "./SpriteXZRectGeometry";
import { Sprite2DMaterial } from "./Sprite2DMaterial";

type Sprite2DParameters = {
  /** 贴图 */
  texture: THREE.Texture;

  /** 材质计算对应threejs世界的比例尺 */
  mpp: number;

  /** 材质叠加混合色 */
  multiplyColor?: THREE.Color;

  /** THREE.Object3D.renderOrder */
  renderOrder?: THREE.Object3D["renderOrder"];
};

export class Sprite2D extends THREE.Mesh implements Sprite2DParameters {
  isSprite2D = true;

  texture: THREE.Texture = undefined;
  mpp: number = undefined;
  multiplyColor: THREE.Color = undefined;

  constructor(parameters: Sprite2DParameters) {
    super();
    this.setParameters(parameters);
  }

  private setParameters(parameters: Sprite2DParameters) {
    const { texture, mpp, multiplyColor, renderOrder } = parameters;

    this.texture = texture;
    this.mpp = mpp;
    this.multiplyColor = multiplyColor;

    if (mpp === undefined) throw new Error("请指定 Sprite2D 的真实比例");
    const { naturalWidth, naturalHeight } = texture.image; // 贴图像素大小

    // 生成几何
    const geometry = new SpriteXZRectGeometry(mpp * naturalWidth, mpp * naturalHeight);

    // 生成材质
    const useMultplyColor = multiplyColor !== undefined; // 是否启用材质叠加混合色
    const material = new Sprite2DMaterial({
      uTexture: texture,
      uMultiplyColor: useMultplyColor ? multiplyColor : null,
    });

    this.geometry = geometry;
    this.material = material;
    this.renderOrder = renderOrder ?? -1;
  }
}
