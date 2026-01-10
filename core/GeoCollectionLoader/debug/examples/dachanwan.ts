///////////////////////////////////// 底图配置 /////////////////////////////////////
const MAP_CENTER = [520, 285];
const MAP_VIEW_SIZE = 300;

///////////////////////////////////// 公共文件 //////////////////////////////////////
import "normalize.css";
import * as THREE from "three";

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const { width, height } = viewport.getBoundingClientRect();
const aspect = width / height;
import { ViewportResizeDispatcher } from "@core/index";
const viewportResizeDispatcher = new ViewportResizeDispatcher(viewport);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, precision: "highp" });
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => renderer.setSize(width, height));
renderer.setClearColor(0xffffff, 0.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const viewSize = MAP_VIEW_SIZE;
const camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 5000);
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => {
  const aspect = width / height;
  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
});

import { MapControls } from "three_addons/controls/MapControls.js";
const center = new THREE.Vector3(MAP_CENTER[0], 0, MAP_CENTER[1]);
const controls = new MapControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2;
controls.minZoom = 0.5;
controls.maxZoom = 5;
controls.target.copy(center);
controls.update();
controls.saveState();
camera.position.set(center.x, 1000, center.z);
camera.up.set(0, 1, 0);
camera.zoom = 1;
camera.updateProjectionMatrix();

const scene = new THREE.Scene();

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////
import type { FeatureCollection } from "geojson";
import type { LineString } from "geojson";

import { convertPoints } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineGeometry } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineMaterial } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineMaterialParameters } from "@core/GeoCollectionLoader/mesh-line/";

const group0 = new THREE.Group();
group0.layers.set(0);
scene.add(group0);

{
  const _resolution = new THREE.Vector2(width, height);
  viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));
  const mapshaperHanldeWrapper = (p: [number, number, number]) => [p[0], 0.0, -p[2]] as [number, number, number];
  const handleMapShaperFile = (_data: any, materialConfiguration: MeshLineMaterialParameters) => {
    const isFeatureCollection = _data.type === "FeatureCollection";
    if (!isFeatureCollection) {
      throw new Error(`[GeoCollectionLoader][handleMapShaperFile] ${_data.name ? _data.name : ""}!FeatureCollection`);
    }
    const FeatureGeometryType = _data.features[0].geometry.type;
    switch (FeatureGeometryType) {
      case "LineString": {
        // 单条线段
        // const data = _data as FeatureCollection<LineString>;
        // for (let i = 0; i < data.features.length; i++) {
        //   const feature = data.features[i];
        //   const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
        //   const coordinates = convertPoints(featureGeometryCoordinates, mapshaperHanldeWrapper);
        //   const meshLineGeometry = new MeshLineGeometry();
        //   meshLineGeometry.setLineString(coordinates);
        //   const mlMaterial = new MeshLineMaterial(materialConfiguration);
        //   const mesh = new THREE.Mesh(meshLineGeometry, mlMaterial);
        //   mesh.frustumCulled = false;
        //   group0.add(mesh);
        // }

        // (错误的)直接设置单条线段
        // const data = _data as FeatureCollection<LineString>;
        // const _coordinates = [];
        // for (let i = 0; i < data.features.length; i++) {
        //   const feature = data.features[i];
        //   const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
        //   const coordinates = convertPoints(featureGeometryCoordinates, mapshaperHanldeWrapper);
        //   _coordinates.push(...coordinates);
        // }
        // const meshLineGeometry = new MeshLineGeometry();
        // meshLineGeometry.setLineString(_coordinates);
        // const mlMaterial = new MeshLineMaterial(materialConfiguration);
        // const mesh = new THREE.Mesh(meshLineGeometry, mlMaterial);
        // mesh.frustumCulled = false;
        // group0.add(mesh);

        // 多条线段(drawcall优化的);
        const data = _data as FeatureCollection<LineString>;
        const _coordinates = [];
        for (let i = 0; i < data.features.length; i++) {
          const feature = data.features[i];
          const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
          const coordinates = convertPoints(featureGeometryCoordinates, mapshaperHanldeWrapper);
          _coordinates.push(coordinates);
        }
        const meshLineGeometry = new MeshLineGeometry();
        meshLineGeometry.setMultiLineString(_coordinates);
        const mlMaterial = new MeshLineMaterial(materialConfiguration);
        const mesh = new THREE.Mesh(meshLineGeometry, mlMaterial);
        mesh.frustumCulled = false;
        group0.add(mesh);

        break;
      }
    }
  };

  // 线
  {
    Promise.all([
      window
        .fetch("/mapshaper-dachanwan/01_coastline_and_buildings.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 3.0, uColor: new THREE.Color("rgb(225, 225, 225)") });
        }),

      window
        .fetch("/mapshaper-dachanwan/02_rails.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 0.8, uColor: new THREE.Color("rgb(195, 195, 195)") });
        }),

      window
        .fetch("/mapshaper-dachanwan/05_road_edge.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 2.0, uColor: new THREE.Color("rgb(0, 0, 0)") });
        }),

      window
        .fetch("/mapshaper-dachanwan/05_road_lane_dash.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uUseDash: 1, uDashArray: [15, 10], uLineWidth: 1.0, uColor: new THREE.Color("rgb(155, 155, 155)") });
        }),

      window
        .fetch("/mapshaper-dachanwan/05_road_lane_solid.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(155, 155, 155)") });
        }),
    ]).finally(() => group0.traverse((object3D) => object3D.layers.set(0)));
  }

  // 面
  {
    const _resolution = new THREE.Vector2(width, height);
    viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));
    Promise.all([
      window
        .fetch("/mapshaper-dachanwan/07_marks.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 0.5, uColor: new THREE.Color("rgb(195, 195, 195)") });
        }),
    ]).finally(() => group0.traverse((object3D) => object3D.layers.set(0)));
  }
}

//////////////////////////////////////// 坐标定位 ////////////////////////////////////////
import { getXZPosition } from "@source/utils/pointerCoordinates";
{
  const coordinatesEl = document.querySelector("#coordinates");
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>("default").viewportElement.addEventListener("mousemove", (e) => {
    const pos = getXZPosition(e, camera, renderer);
    coordinatesEl.innerHTML = `${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`;
  });
}

//////////////////////////////////////// 渲染循环 ////////////////////////////////////////
const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);

  // 渲染地图

  camera.layers.set(0);
  renderer.render(scene, camera);

  renderer.autoClearColor = false;
  renderer.autoClearDepth = true;
  renderer.autoClearStencil = true;

  controls.update();
};

animate();

//////////////////////////////////////// drawcall监听 ////////////////////////////////////////
import "@libs/Spector.js/distt/spector.bundle.js";

// @ts-ignore
const spector = new SPECTOR.Spector();
spector.displayUI();
