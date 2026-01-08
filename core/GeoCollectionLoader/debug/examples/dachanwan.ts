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

import type { PointsRepresentation } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineGeometry } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineMaterial } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineMaterialParameters } from "@core/GeoCollectionLoader/mesh-line/";

const group0 = new THREE.Group();
group0.layers.set(0);
scene.add(group0);

{
  const _resolution = new THREE.Vector2(width, height);
  viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));
  const handleMapShaperFile = (data: FeatureCollection<LineString>, materialConfiguration: MeshLineMaterialParameters) => {
    switch (data.type) {
      case "FeatureCollection": {
        for (let i = 0; i < data.features.length; i++) {
          const feature = data.features[i];
          const coordinates = feature.geometry.coordinates;
          const mlGeometry = new MeshLineGeometry();
          mlGeometry.setPoints(coordinates as PointsRepresentation);
          const mlMaterial = new MeshLineMaterial(materialConfiguration);
          const mesh = new THREE.Mesh(mlGeometry, mlMaterial);
          mesh.frustumCulled = false;
          group0.add(mesh);
        }
        return;
      }
    }
  };

  // 线
  Promise.all([
    window
      .fetch("/mapshaper-dachanwan/01_coastline_and_buildings.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(195, 195, 195)") });
      }),

    window
      .fetch("/mapshaper-dachanwan/02_rails.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(195, 195, 195)") });
      }),

    window
      .fetch("/mapshaper-dachanwan/05_road_edge.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.6, uColor: new THREE.Color("rgb(125, 125, 125)") });
      }),

    window
      .fetch("/mapshaper-dachanwan/05_road_lane_dash.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uUseDash: 1, uDashArray: [15, 10], uLineWidth: 0.5, uColor: new THREE.Color("rgb(0, 0, 0)") });
      }),

    window
      .fetch("/mapshaper-dachanwan/05_road_lane_solid.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.5, uColor: new THREE.Color("rgb(0, 0, 0)") });
      }),
  ]).finally(() => group0.traverse((object3D) => object3D.layers.set(0)));
}

//////////////////////////////////////// 坐标轴助手 ////////////////////////////////////////

import { AxesHelper } from "three";
const axesHepler = new AxesHelper(1000);
scene.add(axesHepler);

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
