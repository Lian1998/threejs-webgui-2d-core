import * as THREE from "three";

import { SpriteXZRectGeometry } from "./SpriteXZRectGeometry";

import vertexShader from "./shaders/sprite2d.vs?raw";
import fragmentShader from "./shaders/sprite2d.fs?raw";

type Sprite2DParameters = {
  /** 对应的材质贴图 */
  texture: THREE.Texture;

  /** 材质计算对应threejs世界的比例尺 */
  mpp: number;

  /** 材质叠加混合色 */
  multiplyColor?: THREE.Color;

  /** THREE.Object3D.renderOrder */
  renderOrder?: number;
};

export class Sprite2D extends THREE.Mesh {
  isSprite2D = true;

  constructor({ texture, mpp, multiplyColor, renderOrder }: Sprite2DParameters) {
    super();

    if (texture === undefined) throw new Error("请指定 Sprite2D 的纹理贴图, 在使用Sprite2D时请务必提前加载材质贴图");
    texture.flipY = false;
    texture.colorSpace = THREE.NoColorSpace;
    texture.premultiplyAlpha = false; //
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1); // 设置纹理左右不重复
    if (mpp === undefined) throw new Error("请指定 Sprite2D 的真实比例");
    const { naturalWidth, naturalHeight } = texture.image; // 贴图像素大小

    // 生成几何
    const geometry = new SpriteXZRectGeometry(mpp * naturalWidth, mpp * naturalHeight);

    // 生成材质
    const useMultplyColor = multiplyColor !== undefined; // 是否启用材质叠加混合色
    const material = new THREE.ShaderMaterial({
      name: "Sprite2DShaderMaterial",
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        uTexture: { value: texture }, // 贴图
        uMultiplyColor: { value: useMultplyColor ? multiplyColor : new THREE.Color() }, // 混合
      },
      vertexShader,
      fragmentShader,
    });
    material.defines["USE_MULTIPLYCOLOR"] = useMultplyColor ? 1 : 0;

    this.geometry = geometry;
    this.material = material;
    this.renderOrder = renderOrder ?? -1;
  }

  /** (暂时)注销原生的基于cpu判断拾取的方法 */
  override raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    return;
  }
}
