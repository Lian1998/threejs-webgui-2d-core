import * as THREE from "three";

import { ViewportResizeDispatcher } from "@core/index";

import { getMultiLineFromFile } from "@source/inMap/utils/mapshaperHelpers";
import { MeshLineMaterial } from "@core/MeshLine/";
import { getMultiPolygonFromFile } from "@source/inMap/utils/mapshaperHelpers";
import { MeshPolygonMaterial } from "@core/MeshPolygon/";

import { ThreejsGroups } from "@source/inMap/variables";

/** 初始化WebGUI底图 */
export const initialization_BaseMap = () => {
  const _resolution = new THREE.Vector2(1.0, 1.0);
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().addResizeEventListener(({ message: { rendererWidth, rendererHeight } }) => _resolution.set(rendererWidth, rendererHeight));

  getMultiLineFromFile("/mapshaper-qinzhou/01_coastline_and_buildings.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.6, uColor: new THREE.Color("rgb(225, 225, 225)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/02_rails.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.64, uColor: new THREE.Color("rgb(195, 195, 195)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/05_road_edge.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.6, uColor: new THREE.Color("rgb(0, 0, 0)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/05_road_lane_solid.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.8, uColor: new THREE.Color("rgb(155, 155, 155)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/temple_block.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 3.2, uUseDash: 1, uDashArray: new THREE.Vector2(15, 10), uColor: new THREE.Color("rgb(255, 0, 0)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiPolygonFromFile("/mapshaper-qinzhou/07_marks.json").then((meshPolygonGeometry) => {
    const meshPolygonMaterial = new MeshLineMaterial({ uResolution: _resolution, uColor: new THREE.Color("rgb(0, 0, 0)") });
    const mesh = new THREE.Mesh(meshPolygonGeometry, meshPolygonMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });

  // 底图不需要进行剔除判断
  ThreejsGroups.BaseMap.traverse((mesh) => (mesh.frustumCulled = false));
};
