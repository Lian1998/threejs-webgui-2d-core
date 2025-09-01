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

    const indices = [];
    const vertices = [];
    const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const uvs = [0, 0, 0, 1, 1, 1, 1, 0];

    vertices.push(-width_half, 0, -height_half);
    vertices.push(-width_half, 0, height_half);
    vertices.push(width_half, 0, height_half);
    vertices.push(width_half, 0, -height_half);
    indices.push(0, 1, 2);
    indices.push(2, 3, 0);

    this.setIndex(indices);
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
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
