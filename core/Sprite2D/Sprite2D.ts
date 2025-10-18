import * as THREE from "three";

import { Sprite2DGeometry } from "./Sprite2DGeometry";

import vs from "./shaders/sprite2d.vs?raw";
import fs from "./shaders/sprite2d.fs?raw";

/**
 * XZ平面精灵
 */
export interface Sprite2DParameters {
  /** threejs纹理 */
  texture: THREE.Texture;

  /** 真实比例 */
  mpp: number;

  /** 写入深度图的值 */
  depth: number;

  /** threejs纹理 shader叠加算法颜色 */
  color?: THREE.Color;
}

export class Sprite2D extends THREE.Mesh implements Sprite2DParameters {
  texture: THREE.Texture;
  mpp: number;
  depth: number;
  color?: THREE.Color;

  /**
   * 构造一个二维平面贴图精灵
   * @param width 精灵在三维空间坐标系中实际的宽度
   * @param height 精灵在三维空间坐标系中实际的高度
   * @param textureUrl 纹理的路径
   */
  constructor({ texture, mpp, depth = 1, color = new THREE.Color(1, 1, 1) }: Sprite2DParameters) {
    super();

    if (texture === undefined) throw new Error("请指定 Sprite2D 的纹理贴图");
    texture.flipY = false;
    texture.colorSpace = THREE.NoColorSpace;
    texture.premultiplyAlpha = false;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1); // 设置纹理左右不重复
    if (mpp === undefined) throw new Error("请指定 Sprite2D 的真实比例");
    const { naturalWidth, naturalHeight } = texture.image; // 贴图像素大小

    this.texture = texture;
    this.mpp = mpp; // 米/像素
    this.depth = depth; // 深度
    this.color = color; // 混合

    // 生成几何
    const geometry = new Sprite2DGeometry(mpp * naturalWidth, mpp * naturalHeight);

    // 生成材质
    const material = new THREE.ShaderMaterial({
      name: "Sprite2DShaderMaterial",
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        uTexture: { value: texture }, // 贴图
        uColor: { value: color }, // 混合
        uDepth: { value: depth }, // 深度
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    material.defines["USE_CUSTOM_MULTICOLOR"] = color !== undefined ? 1 : 0;
    material.defines["USE_CUSTOM_DEPTH"] = depth !== undefined ? 1 : 0;

    this.geometry = geometry;
    this.material = material;
    this.renderOrder = depth; // 给 threejs 的 opaque render list 排序
  }

  /** 注销原生的基于cpu判断拾取的方法 */
  override raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    return;
  }
}
