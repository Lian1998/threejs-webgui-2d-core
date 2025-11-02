import * as THREE from "three";
import type { GeoJsonTypes } from "geojson";

export type ThreejsGeometryCollection = {
  type: GeoJsonTypes;
  geometry: THREE.BufferGeometry;
};
