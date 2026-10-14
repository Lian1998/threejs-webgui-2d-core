import * as THREE from "three";
import type { FeatureCollection } from "geojson";
import type { LineString } from "geojson";

import { convert2Vertex2D } from "@core/utils/vertex";

import earcut from "earcut";
import { flatten } from "earcut";

export class MeshPolygonGeometry extends THREE.BufferGeometry {
  constructor() {
    super();
  }

  /**
   * 从 FeatureCollection<LineString> 类型数据结构中获取合并的统一三角面
   *
   * ```
   * {
   *  "type":"FeatureCollection", "features": [
   *   ...
   * }
   * ``
   * @param data FeatureCollection<LineString> 类型数据结构
   */
  setFromMapShaperFeatureCollection(data: FeatureCollection<LineString>): void {
    this.dispose();

    const hanldeWrapper = (p: [number, number, number]): number[] => [p[0], -p[2]];
    const _triangles = []; // 三角面数据
    for (let i = 0; i < data.features.length; i++) {
      const feature = data.features[i];
      if (feature.geometry.type !== "LineString") {
        console.warn("MeshPolygonGeometry.setFromMapShaperFeatureCollection: 数据结构中存在非LineString类型Feature");
        continue;
      }
      const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
      const _flatten = flatten([featureGeometryCoordinates]);
      const _earcut = earcut(_flatten.vertices, _flatten.holes, _flatten.dimensions);
      for (const index of _earcut) {
        _triangles.push([_flatten.vertices[index * _flatten.dimensions], 0.0, -_flatten.vertices[index * _flatten.dimensions + 1]]);
      }
    }

    const positions = _triangles.flat();
    this.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  }
}
