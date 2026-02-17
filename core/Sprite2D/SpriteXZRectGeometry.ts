import * as THREE from "three";

export class SpriteXZRectGeometry extends THREE.BufferGeometry {
  constructor(width: number = 1, height: number = 1) {
    super();

    const width_half = width / 2;
    const height_half = height / 2;

    // prettier-ignore
    this.setAttribute("position", new THREE.Float32BufferAttribute([
      -width_half, 0, -height_half,
      -width_half, 0, +height_half,
      +width_half, 0, +height_half,
      +width_half, 0, -height_half,
    ], 3));

    // prettier-ignore
    this.setAttribute("uv", new THREE.Float32BufferAttribute([
      0, 0,
      0, 1,
      1, 1,
      1, 0,
    ], 2));

    this.setIndex([0, 1, 2, 2, 3, 0]);
  }
}
