import { Vector3 } from "three";
import type { PolygonGeometry, RenderFeature } from "../../contracts";
import { triangulatePolygonGeometry, type Triangulation } from "../../primitives/polygons/triangulate";
import { MergedBatchBackend, type VertexData } from "../shared/MergedBatchBackend";
import { colorComponents, fragmentPass, pickComponents, vertexPass } from "../shared/material";

const vertex = /* glsl */ `precision highp float;
uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
in vec3 position; in vec4 aColor; in vec3 aPickColor; in vec2 aHit;
out vec4 vColor; flat out vec3 vPickColor; flat out vec2 vHit;
${vertexPass}
void main(){ vColor=aColor; vPickColor=aPickColor; vHit=aHit; gl_Position=cropClip(projectionMatrix*modelViewMatrix*vec4(position,1.0)); }
`;
const fragment = /* glsl */ `${fragmentPass}
in vec4 vColor;
void main(){ writeColor(vColor); }
`;
export class PolygonBatchBackend extends MergedBatchBackend {
  readonly kind = "polygon" as const;
  private triangulations = new WeakMap<object, Triangulation>();
  constructor() {
    super({ position: 3, aColor: 4, aPickColor: 3, aHit: 2 }, vertex, fragment);
  }
  encode(feature: RenderFeature): VertexData {
    const options = feature.options as import("../../contracts").DeepReadonly<import("../../contracts").PolygonOptions>;
    let triangulation = this.triangulations.get(options.geometry);
    if (!triangulation) {
      triangulation = triangulatePolygonGeometry(options.geometry as PolygonGeometry);
      this.triangulations.set(options.geometry, triangulation);
    }
    const data: VertexData = { position: [], aColor: [], aPickColor: [], aHit: [] };
    const color = colorComponents(options.fill),
      pick = pickComponents(feature.pickId),
      p = new Vector3();
    for (const index of triangulation.indices) {
      const v = triangulation.vertices[index];
      p.set(v[0], 0, -v[1]).applyMatrix4(feature.matrix);
      data.position.push(p.x, p.y, p.z);
      data.aColor.push(...color, feature.opacity);
      data.aPickColor.push(...pick);
      data.aHit.push(feature.hit.alphaThreshold, feature.hit.tolerancePx);
    }
    return data;
  }
}
