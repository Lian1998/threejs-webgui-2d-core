import * as THREE from "three";

import type { FeatureCollection } from "geojson";
import type { LineString } from "geojson";

import { convertPoints } from "@core/MeshLine/";
import { MeshLineGeometry } from "@core/MeshLine/";

const mapshaper3HanldeWrapper = (p: [number, number, number]): number[] => [p[0], 0.0, -p[2]];

/**
 * 从一个mapshaper导出的geojson文件中读取MeshLine
 * @param fileSrc 文件路径
 * @returns MeshLineGeometry
 */
export const getMultiLineFromFile = async (fileSrc: string): Promise<MeshLineGeometry> => {
  return new Promise((resolve, reject) => {
    window
      .fetch(fileSrc)
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        const _coordinates = [];
        for (let i = 0; i < data.features.length; i++) {
          const feature = data.features[i];
          const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
          const coordinates = convertPoints(featureGeometryCoordinates, mapshaper3HanldeWrapper);
          _coordinates.push(coordinates);
        }
        const meshLineGeometry = new MeshLineGeometry();
        meshLineGeometry.setMultiLine(_coordinates);
        resolve(meshLineGeometry);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

import { MeshPolygonGeometry } from "@core/MeshPolygon/";
import earcut from "earcut";
import { flatten } from "earcut";
/**
 * 从一个mapshaper导出的geojson文件中读取MeshPolygon
 * @param fileSrc 文件路径
 * @returns MeshPolygonGeometry
 */
export const getMultiPolygonFromFile = async (fileSrc: string): Promise<MeshPolygonGeometry> => {
  return new Promise((resolve, reject) => {
    window
      .fetch(fileSrc)
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        const _triangles = [];
        const meshPolygonGeometry = new MeshPolygonGeometry();

        for (let i = 0; i < data.features.length; i++) {
          const feature = data.features[i];
          const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
          const _flatten = flatten([featureGeometryCoordinates]);
          const _earcut = earcut(_flatten.vertices, _flatten.holes, _flatten.dimensions);
          for (const index of _earcut) {
            _triangles.push([_flatten.vertices[index * _flatten.dimensions], 0.0, -_flatten.vertices[index * _flatten.dimensions + 1]]);
          }
        }
        meshPolygonGeometry.setPolygons(_triangles.flat());

        resolve(meshPolygonGeometry);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
