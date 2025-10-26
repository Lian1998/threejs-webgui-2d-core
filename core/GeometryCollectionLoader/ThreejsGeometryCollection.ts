import * as THREE from "three";
import type { Geometry } from "geojson";

export type ThreejsGeometryCollection = {
  type: Geometry;
  geometry: THREE.BufferGeometry;
};
