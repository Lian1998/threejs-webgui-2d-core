import * as THREE from "three";

import { Sprite2DGeometry } from "./Sprite2DGeometry";

import vs from "./shaders/sprite2d.vs?raw";
import fs from "./shaders/sprite2d.fs?raw";

/**
 * 计算 米/像素
 * @param targetRealLength 这个物件的这个特征实际的长度占据多少m
 * @param targetImgPixelLength 这个物件的图片特征(* 长度/宽度或其他?)占据图片多少个像素
 * @returns {number} 米/像素
 */
export const calculatePP = (targetRealLength: number, targetImgPixelLength: number): number => {
  return targetRealLength / targetImgPixelLength;
};

export interface Sprite2DOptions {
  /** threejs纹理 */
  texture?: THREE.Texture;

  /** threejs纹理 shader叠加算法颜色 */
  uColor?: THREE.Color;

  /** 真实比例 */
  pp?: ReturnType<typeof calculatePP>;

  /** 偏移量 */
  offset?: number[];
}

export class Sprite2D extends THREE.Object3D implements Sprite2DOptions {
  mesh: THREE.Mesh;

  texture: THREE.Texture;
  uColor: THREE.Color;
  pp: number;
  offset: number[];

  /**
   * 构造一个二维平面贴图精灵
   * @param width 精灵在三维空间坐标系中实际的宽度
   * @param height 精灵在三维空间坐标系中实际的高度
   * @param textureUrl 纹理的路径
   */
  constructor(opts: Sprite2DOptions = {}) {
    super();

    this.texture = opts.texture;
    if (this.texture === undefined) throw new Error("请指定 Sprite2D 的纹理贴图");
    this.texture.flipY = false;
    this.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.repeat.set(1, 1); // 设置纹理左右不重复

    this.pp = opts.pp;
    if (this.pp === undefined) throw new Error("请指定 Sprite2D 的真实比例");
    const { naturalWidth, naturalHeight } = this.texture.image;
    const geometry = new Sprite2DGeometry(this.pp * naturalWidth, this.pp * naturalHeight); // 生成几何

    this.uColor = opts.uColor; // 从客户端传来的参数, 是否需要对图标进行shader的颜色混合
    this.offset = opts.offset; // 此图标在二维情况下的偏移量
    const material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      transparent: true,
      uniforms: {
        uTexture: { value: this.texture },
        ...(this.uColor ? { uUseMultipleColor: { value: true } } : {}), // 通过是否传入uColor判断是否启用颜色混合
        ...(this.uColor ? { uColor: { value: this.uColor } } : {}), // 混合色
      },
      vertexShader: vs,
      fragmentShader: fs,
    }); // 生成材质

    this.mesh = new THREE.Mesh(geometry, material); // 生成网格
  }
}
