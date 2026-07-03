///////////////////////////////////// 底图配置 /////////////////////////////////////
const MAP_CENTER = [950, -950];
const MAP_VIEW_SIZE = 300;

///////////////////////////////////// 公共文件 //////////////////////////////////////
import "normalize.css";
import * as THREE from "three";

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const { width, height } = viewport.getBoundingClientRect();
const aspect = width / height;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, precision: "highp" });
renderer.setClearColor(0xffffff, 0.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

import { ViewportResizeDispatcher } from "@core/index";
new ViewportResizeDispatcher(renderer);

const viewSize = MAP_VIEW_SIZE;
const orthoCamera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 5000);
ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().addResizeEventListener(({ message: { width, height } }) => {
  const aspect = width / height;
  orthoCamera.left = -MAP_VIEW_SIZE * aspect;
  orthoCamera.right = MAP_VIEW_SIZE * aspect;
  orthoCamera.top = MAP_VIEW_SIZE;
  orthoCamera.bottom = -MAP_VIEW_SIZE;
  orthoCamera.updateProjectionMatrix();
});

import { MapControls } from "three/addons/controls/MapControls.js";
const center = new THREE.Vector3(MAP_CENTER[0], 0, MAP_CENTER[1]);
const controls = new MapControls(orthoCamera, viewport);

{
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
}

{
  controls.enableZoom = true;
  orthoCamera.zoom = 1;
  controls.minZoom = 0.5;
  controls.maxZoom = 20;
  controls.zoomSpeed = 1.2;
}

{
  controls.enableRotate = true;
  controls.maxPolarAngle = Math.PI / 2;
}

controls.target.copy(center);
controls.update();
controls.saveState();
orthoCamera.position.set(center.x, 1000, center.z);
orthoCamera.up.set(0, 1, 0);
orthoCamera.updateProjectionMatrix();

const scene = new THREE.Scene();

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////
import type { FeatureCollection } from "geojson";
import type { GeometryCollection } from "geojson";
import type { LineString } from "geojson";

import { MeshLineGeometry } from "@core/MeshLine/";
import { MeshLineMaterial } from "@core/MeshLine/";

import { MeshPolygonGeometry } from "@core/MeshPolygon/";
import { MeshPolygonMaterial } from "@core/MeshPolygon/";

const group0 = new THREE.Group();
group0.layers.set(0);
scene.add(group0);

{
  const _resolution = new THREE.Vector2(width, height);
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));

  // 线
  {
    Promise.all([
      window
        .fetch("/mapshaper-tongyong/01_coastline_and_buildings.json")
        .then((response) => response.json())
        .then((data: GeometryCollection<LineString>) => {
          const meshLineGeometry = new MeshLineGeometry();
          meshLineGeometry.setFromMapShaperGeometryCollection(data);
          const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(225, 225, 225)") });
          const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
          mesh.frustumCulled = false;
          group0.add(mesh);
        }),

      window
        .fetch("/mapshaper-tongyong/02_rails.json")
        .then((response) => response.json())
        .then((data: GeometryCollection<LineString>) => {
          const meshLineGeometry = new MeshLineGeometry();
          meshLineGeometry.setFromMapShaperGeometryCollection(data);
          const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.8, uColor: new THREE.Color("rgb(195, 195, 195)") });
          const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
          mesh.frustumCulled = false;
          group0.add(mesh);
        }),

      window
        .fetch("/mapshaper-tongyong/03_fence.json")
        .then((response) => response.json())
        .then((data: GeometryCollection<LineString>) => {
          const meshLineGeometry = new MeshLineGeometry();
          meshLineGeometry.setFromMapShaperGeometryCollection(data);
          const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(0, 0, 0)"), uUseBox: 1, uBoxArray: new THREE.Vector2(1.5, 5.0) });
          const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
          mesh.frustumCulled = false;
          group0.add(mesh);
        }),

      window
        .fetch("/mapshaper-tongyong/05_road_edge.json")
        .then((response) => response.json())
        .then((data: GeometryCollection<LineString>) => {
          const meshLineGeometry = new MeshLineGeometry();
          meshLineGeometry.setFromMapShaperGeometryCollection(data);
          const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.2, uColor: new THREE.Color("rgb(0, 0, 0)") });
          const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
          mesh.frustumCulled = false;
          group0.add(mesh);
        }),

      window
        .fetch("/mapshaper-tongyong/05_road_lane_dash.json")
        .then((response) => response.json())
        .then((data: GeometryCollection<LineString>) => {
          const meshLineGeometry = new MeshLineGeometry();
          meshLineGeometry.setFromMapShaperGeometryCollection(data);
          const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uUseDash: 1, uDashArray: new THREE.Vector2(8.0, 4.0), uColor: new THREE.Color("rgb(155, 155, 155)") });
          const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
          mesh.frustumCulled = false;
          group0.add(mesh);
        }),
    ]).finally(() => group0.traverse((object3D) => object3D.layers.set(0)));
  }
}

//////////////////////////////////////// 坐标定位 ////////////////////////////////////////
import { getXZPosition } from "@source/inMap/utils/pointerCoordinates";
{
  const coordinatesEl = document.querySelector("#coordinates");
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().viewportElement.addEventListener("mousemove", (e) => {
    const pos = getXZPosition(e, orthoCamera, renderer);
    coordinatesEl.innerHTML = `${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`;
  });
}

//////////////////////////////////////// 渲染循环 ////////////////////////////////////////
const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);

  // 渲染地图

  orthoCamera.layers.set(0);
  renderer.render(scene, orthoCamera);

  renderer.autoClearColor = false;
  renderer.autoClearDepth = true;
  renderer.autoClearStencil = true;

  controls.update();
};

animate();
