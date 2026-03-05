import * as THREE from "three";
import { SpriteXZRectGeometry } from "./SpriteXZRectGeometry";
import { Sprite2DMaterial } from "./Sprite2DMaterial";

import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";

type Sprite2DParameters = {
  /** 材质贴图的链接, 内部使用threejsTextureLoader读取图片 */
  spriteUrl: string;

  /** 材质图像素与threejs世界空间的比例(miter/pixcel) */
  spriteMpp: number;

  /** 材质图偏移量, 一般用于确定sprite贴图中心点(miter) */
  spriteOffset?: [number, number];

  /** 材质图旋转? */
  spriteRotate?: number;

  /** 材质叠加混合色 */
  spriteMultiplyColor?: THREE.Color;

  /** THREE.Object3D.renderOrder */
  renderOrder?: THREE.Object3D["renderOrder"];
};

/**
 * 一个XZ平面的二维贴图精灵
 * - spriteUrl: 材质贴图的链接, 内部使用threejsTextureLoader读取图片
 * - spriteMpp: 材质图像素与threejs世界空间的比例(miter/pixcel)
 * - spriteOffset: 材质图偏移量, 一般用于确定sprite贴图中心点(miter)
 * - spriteRotate: 材质图旋转
 * - spriteMultiplyColor: 材质叠加混合色
 * - renderOrder: THREE.Object3D.renderOrder
 */
export class Sprite2D extends THREE.Mesh implements Sprite2DParameters {
  isSprite2D = true;

  spriteUrl: string;
  spriteMpp: number;
  spriteOffset: [number, number] = [0.0, 0.0];
  spriteRotate: number = 0.0;
  spriteMultiplyColor: THREE.Color = undefined;

  constructor(parameters: Sprite2DParameters) {
    super();
    this.setValues(parameters);
  }

  private setValues(parameters?: Sprite2DParameters) {
    const source = parameters ?? this;

    let spriteUrl: Sprite2DParameters["spriteUrl"];
    let spriteMpp: Sprite2DParameters["spriteMpp"];
    let spriteOffset: Sprite2DParameters["spriteOffset"];
    let spriteRotate: Sprite2DParameters["spriteRotate"];
    let spriteMultiplyColor: Sprite2DParameters["spriteMultiplyColor"];
    let renderOrder: Sprite2DParameters["renderOrder"];

    ({ spriteUrl, spriteMpp, spriteRotate, spriteOffset, spriteMultiplyColor, renderOrder } = source);

    if (spriteMpp === undefined) throw new Error("Sprite2D: 请指定 Sprite2D 的 mpp 以获取真实几何比例");

    // 生成材质(如果是第一次会生成atlas)
    if (!this.material) this.material = new Sprite2DMaterial();
    (this.material as Sprite2DMaterial).useMultiplyColor = true;

    // 找到贴图Atlas对应的内容
    const spriteItem = spriteAtlas.getSpriteAtlas(spriteUrl); // 这里spriteAtlas会帮忙try catch
    if (!spriteItem) throw new Error("Sprite2D: 没有从 Sprite 雪碧图中找到对应的材质");
    const { page, u0, v0, u1, v1, imageProps } = spriteItem;
    const { url, image, width, height, scaledWidth, scaledHeight, scale } = imageProps;

    // 生成几何
    if (this.geometry) this.geometry.dispose();
    this.geometry = new SpriteXZRectGeometry({ x: spriteMpp * width, z: spriteMpp * height, u0, v0, u1, v1, center: true, offset: spriteOffset, rotate: spriteRotate });

    // set aPage attribute (float per vertex, value = page)
    const aPageArr = new Float32Array(4);
    for (let i = 0; i < 4; i++) aPageArr[i] = page;
    this.geometry.setAttribute("aPage", new THREE.BufferAttribute(aPageArr, 1).setUsage(THREE.StaticDrawUsage));

    // set aMultiplyColor attribute (vec3 per vertex)
    if (spriteMultiplyColor) {
      const aMultiplyColorArr = new Float32Array(4 * 3);
      for (let i = 0; i < aMultiplyColorArr.length; i++) {
        aMultiplyColorArr[i * 3 + 0] = spriteMultiplyColor.r;
        aMultiplyColorArr[i * 3 + 1] = spriteMultiplyColor.g;
        aMultiplyColorArr[i * 3 + 2] = spriteMultiplyColor.b;
      }
      this.geometry.setAttribute("aMultiplyColor", new THREE.BufferAttribute(aMultiplyColorArr, 3).setUsage(THREE.StaticDrawUsage));

      (this.material as Sprite2DMaterial).useMultiplyColor = true;
    }

    this.renderOrder = renderOrder ?? -1;
  }
}
