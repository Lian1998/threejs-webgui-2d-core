import * as THREE from "three";

import { ViewportResizeDispatcher } from "@core/index";

import type { FeatureCollection } from "geojson";
import type { LineString } from "geojson";

import { MeshLineGeometry } from "@core/MeshLine/";
import { MeshLineMaterial } from "@core/MeshLine/";

import { MeshPolygonGeometry } from "@core/MeshPolygon/";
import { MeshPolygonMaterial } from "@core/MeshPolygon/";

import { ThreejsGroups } from "@source/inMap/variables";

/** 初始化WebGUI底图 */
export const initBaseMap = () => {
  const viewport1 = ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>(0);
  const _resolution = viewport1.rect.size;

  window
    .fetch("/mapshaper-qinzhou/01_coastline_and_buildings.json")
    .then((response) => response.json())
    .then((data: FeatureCollection<LineString>) => {
      const meshLineGeometry = new MeshLineGeometry();
      meshLineGeometry.setFromMapShaperFeatureCollection(data);
      const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.8, uColor: new THREE.Color("rgb(225, 225, 225)") });
      const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
      mesh.frustumCulled = false;
      ThreejsGroups.BaseMap.add(mesh);
    });

  window
    .fetch("/mapshaper-qinzhou/02_rails.json")
    .then((response) => response.json())
    .then((data: FeatureCollection<LineString>) => {
      const meshLineGeometry = new MeshLineGeometry();
      meshLineGeometry.setFromMapShaperFeatureCollection(data);
      const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.64, uColor: new THREE.Color("rgb(195, 195, 195)") });
      const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
      mesh.frustumCulled = false;
      ThreejsGroups.BaseMap.add(mesh);
    });

  window
    .fetch("/mapshaper-qinzhou/05_road_edge.json")
    .then((response) => response.json())
    .then((data: FeatureCollection<LineString>) => {
      const meshLineGeometry = new MeshLineGeometry();
      meshLineGeometry.setFromMapShaperFeatureCollection(data);
      const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.6, uColor: new THREE.Color("rgb(0, 0, 0)") });
      const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
      mesh.frustumCulled = false;
      ThreejsGroups.BaseMap.add(mesh);
    });

  window
    .fetch("/mapshaper-qinzhou/05_road_lane_solid.json")
    .then((response) => response.json())
    .then((data: FeatureCollection<LineString>) => {
      const meshLineGeometry = new MeshLineGeometry();
      meshLineGeometry.setFromMapShaperFeatureCollection(data);
      const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.8, uColor: new THREE.Color("rgb(155, 155, 155)") });
      const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
      mesh.frustumCulled = false;
      ThreejsGroups.BaseMap.add(mesh);
    });

  window
    .fetch("/mapshaper-qinzhou/temple_block.json")
    .then((response) => response.json())
    .then((data: FeatureCollection<LineString>) => {
      const meshLineGeometry = new MeshLineGeometry();
      meshLineGeometry.setFromMapShaperFeatureCollection(data);
      const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 3.2, uUseDash: 1, uDashArray: new THREE.Vector2(15.0, 10.0), uColor: new THREE.Color("rgb(255, 0, 0)") });
      const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
      mesh.frustumCulled = false;
      ThreejsGroups.BaseMap.add(mesh);
    });

  window
    .fetch("/mapshaper-qinzhou/07_marks.json")
    .then((response) => response.json())
    .then((data: FeatureCollection<LineString>) => {
      const meshPolygonGeometry = new MeshPolygonGeometry();
      meshPolygonGeometry.setFromMapShaperFeatureCollection(data);
      const meshPolygonMaterial = new MeshPolygonMaterial({ uResolution: _resolution, uColor: new THREE.Color("rgb(0, 0, 0)") });
      const mesh = new THREE.Mesh(meshPolygonGeometry, meshPolygonMaterial);
      mesh.frustumCulled = false;
      ThreejsGroups.BaseMap.add(mesh);
    });

  // 底图不需要进行剔除判断
  ThreejsGroups.BaseMap.traverse((mesh) => (mesh.frustumCulled = false));
};
