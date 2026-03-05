import * as THREE from "three";

export type SpriteXZRectGeometryProperty = {
  x: number;
  z: number;
  u0?: number;
  v0?: number;
  u1?: number;
  v1?: number;
  center?: boolean; // 几何是否居中?
  offset?: [number, number]; // 几何是否偏移?
  rotate?: number; // 几何是否旋转?
};

export class SpriteXZRectGeometry extends THREE.BufferGeometry {
  private _parameters: Required<SpriteXZRectGeometryProperty>;

  constructor(parameters: SpriteXZRectGeometryProperty) {
    super();

    this._parameters = {
      x: parameters.x,
      z: parameters.z,
      u0: parameters.u0 ?? 0,
      v0: parameters.v0 ?? 0,
      u1: parameters.u1 ?? 1,
      v1: parameters.v1 ?? 1,
      center: parameters.center ?? true,
      offset: parameters.offset ?? [0.0, 0.0],
      rotate: parameters.rotate ?? 0.0,
    };

    this.buildGeometry();
  }

  buildGeometry(parameters?: SpriteXZRectGeometryProperty): void {
    const { x, z, u0, v0, u1, v1, center, offset, rotate } = parameters ?? this._parameters;

    const xHalf = x / 2;
    const zHalf = z / 2;

    // positions (XZ 平面，Y=0)
    const positions = new Float32Array([
      -xHalf, 0, -zHalf,
      +xHalf, 0, -zHalf,
      +xHalf, 0, +zHalf,
      -xHalf, 0, +zHalf,
    ]); // prettier-ignore

    // uv
    const uvs = new Float32Array([
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ]); // prettier-ignore

    const indices = [0, 2, 1, 0, 3, 2];

    this.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    this.setIndex(indices);

    if (center) this.translate(-xHalf, 0, -zHalf); // 居中
    this.translate(offset[0], 0, offset[1]); // 偏移
    this.rotateY(rotate);
  }
}
