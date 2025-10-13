import { BufferGeometry } from "three";
import { Float32BufferAttribute } from "three";

export class Sprite2DGeometry extends BufferGeometry {
  declare parameters: { width: number; height: number };

  constructor(width = 1, height = 1) {
    super();

    this.parameters = { width: width, height: height };

    const width_half = width / 2;
    const height_half = height / 2;

    //

    // prettier-ignore
    this.setAttribute("position", new Float32BufferAttribute([
      -width_half, 0, -height_half,
      -width_half, 0, +height_half,
      +width_half, 0, +height_half,
      +width_half, 0, -height_half,
    ], 3));

    // prettier-ignore
    this.setAttribute("uv", new Float32BufferAttribute([
      0, 0,
      0, 1,
      1, 1,
      1, 0,
    ], 2));

    this.setIndex([0, 1, 2, 2, 3, 0]);
  }

  override copy(source: Sprite2DGeometry) {
    super.copy(source);

    this.parameters = Object.assign({}, source.parameters);

    return this;
  }

  static fromJSON(data: { width: number; height: number }) {
    return new Sprite2DGeometry(data.width, data.height);
  }
}
