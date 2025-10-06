import * as THREE from "three";

import { Sprite2DGeometry } from "@source/core";

import vs from "./shaders/sprite2d.vs?raw";
import fs from "./shaders/sprite2d.fs?raw";

/**
 * 计算 米/像素
 * @param targetRealLength 这个物件的这个特征实际的长度占据多少m
 * @param targetImgPixelLength 这个物件的图片特征(* 长度/宽度或其他?)占据图片多少个像素
 * @returns {number} 米/像素
 */
export const calculateMPP = (targetRealLength: number, targetImgPixelLength: number): number => {
  return targetRealLength / targetImgPixelLength;
};

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

  /** 偏移量 */
  offset?: number[];

  /** threejs纹理 shader叠加算法颜色 */
  color?: THREE.Color;
}

export class Sprite2D extends THREE.Object3D implements Sprite2DParameters {
  mesh: THREE.Mesh;

  texture: THREE.Texture;
  mpp: number;
  depth: number;
  offset: number[] = [0.0, 0.0];
  color?: THREE.Color;

  /**
   * 构造一个二维平面贴图精灵
   * @param width 精灵在三维空间坐标系中实际的宽度
   * @param height 精灵在三维空间坐标系中实际的高度
   * @param textureUrl 纹理的路径
   */
  constructor({ texture, mpp, depth = 1, offset = [0, 0], color = new THREE.Color(1, 1, 1) }: Sprite2DParameters) {
    super();

    // @ts-ignore
    this.isMesh = true;

    // @ts-ignore
    this.type = "Mesh";

    if (texture === undefined) throw new Error("请指定 Sprite2D 的纹理贴图");
    this.texture = texture;
    texture.flipY = false;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1); // 设置纹理左右不重复

    if (mpp === undefined) throw new Error("请指定 Sprite2D 的真实比例");
    this.mpp = mpp; // 米/像素
    const { naturalWidth, naturalHeight } = texture.image; // 贴图像素大小

    this.depth = depth; // 深度
    this.offset = offset; // 偏移
    this.color = color; // 混合

    // 生成几何
    const geometry = new Sprite2DGeometry(mpp * naturalWidth, mpp * naturalHeight);

    // 生成材质
    const material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      transparent: true,
      uniforms: {
        uTexture: { value: texture }, // 贴图
        uOffset: { value: new THREE.Vector2(offset[0], offset[1]) }, // 偏移
        uColor: { value: color }, // 混合
        uDepth: { value: depth }, // 深度
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    material.defines["USE_CUSTOM_MULTICOLOR"] = color !== undefined ? 1 : 0;
    material.defines["USE_CUSTOM_DEPTH"] = depth !== undefined ? 1 : 0;

    // @ts-ignore
    this.geometry = geometry;

    // @ts-ignore
    this.material = material;
  }

  /** 注销原生的基于cpu判断拾取的方法 */
  override raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    return;
  }
}
