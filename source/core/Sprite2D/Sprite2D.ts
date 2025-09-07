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
export const calculatePP = (targetRealLength: number, targetImgPixelLength: number): number => {
  return targetRealLength / targetImgPixelLength;
};

export interface Sprite2DParameters {
  /** threejs纹理 */
  texture: THREE.Texture;

  /** 真实比例 */
  pp: number;

  /** 偏移量 */
  offset?: number[];

  /** threejs纹理 shader叠加算法颜色 */
  uColor?: THREE.Color;
}

export class Sprite2D extends THREE.Object3D implements Sprite2DParameters {
  mesh: THREE.Mesh;

  texture: THREE.Texture;
  pp: number;
  offset: number[] = [0.0, 0.0];
  uColor?: THREE.Color;

  /**
   * 构造一个二维平面贴图精灵
   * @param width 精灵在三维空间坐标系中实际的宽度
   * @param height 精灵在三维空间坐标系中实际的高度
   * @param textureUrl 纹理的路径
   */
  constructor({ texture, pp, offset = [0.0, 0.0], uColor }: Sprite2DParameters) {
    super();

    if (texture === undefined) throw new Error("请指定 Sprite2D 的纹理贴图");
    this.texture = texture;
    texture.flipY = false;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1); // 设置纹理左右不重复

    if (pp === undefined) throw new Error("请指定 Sprite2D 的真实比例");
    this.pp = pp;
    const { naturalWidth, naturalHeight } = texture.image;

    if (offset) this.offset = offset;
    this.uColor = uColor;

    // 生成几何
    const geometry = new Sprite2DGeometry(pp * naturalWidth, pp * naturalHeight);

    // 生成材质
    const material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      transparent: true,
      uniforms: {
        uTexture: { value: texture },
        uOffset: { value: new THREE.Vector2(offset[0], offset[1]) },
        ...(uColor ? { uUseMultipleColor: { value: true } } : {}), // 通过是否传入uColor判断是否启用颜色混合
        ...(uColor ? { uColor: { value: uColor } } : {}), // 混合色
      },
      vertexShader: vs,
      fragmentShader: fs,
    });

    material.onBeforeCompile = (shaderObject) => {
      // console.log(shaderObject);
    };

    this.mesh = new THREE.Mesh(geometry, material); // 生成网格
  }
}
