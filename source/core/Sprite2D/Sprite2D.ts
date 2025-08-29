import * as THREE from "three";

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
  texture: THREE.Texture;
  pp: ReturnType<typeof calculatePP>;
  offset?: number[];
  color?: THREE.Color;
}

export class Sprite2D extends THREE.Object3D {
  options: Sprite2DOptions;
  mesh: THREE.Mesh;

  /**
   * 构造一个二维平面贴图精灵
   * @param width 精灵在三维空间坐标系中实际的宽度
   * @param height 精灵在三维空间坐标系中实际的高度
   * @param textureUrl 纹理的路径
   */
  constructor(options: Sprite2DOptions) {
    super();

    this.options = options;

    const texture = options.texture;
    console.log(texture, THREE.SRGBColorSpace);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const { naturalWidth, naturalHeight } = texture.image;
    const geometry = new THREE.PlaneGeometry(options.pp * naturalWidth, options.pp * naturalHeight);
    const material = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
      uniforms: {
        uTexture: { value: options.texture },
        uColor: { value: options.color },
      },
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; // 旋转到XZ平面
  }
}
