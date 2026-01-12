///////////////////////////////////// 底图配置 /////////////////////////////////////
const MAP_CENTER = [565816.5, -2397680.7];
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
controls.maxZoom = 20;
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

import { MeshPolygonGeometry } from "@core/GeoCollectionLoader/mesh-polygon/";
import { MeshPolygonMaterial } from "@core/GeoCollectionLoader/mesh-polygon/";

import earcut from "earcut";
import { flatten } from "earcut";

const group0 = new THREE.Group();
group0.layers.set(0);
scene.add(group0);

{
  const _resolution = new THREE.Vector2(width, height);
  viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));
  const mapshaper3HanldeWrapper = (p: [number, number, number]): number[] => [p[0], 0.0, -p[2]];
  const handleMapShaperFile = (_data: any, materialConfiguration: MeshLineMaterialParameters) => {
    const isFeatureCollection = _data.type === "FeatureCollection";
    if (!isFeatureCollection) {
      throw new Error(`[GeoCollectionLoader][handleMapShaperFile] ${_data.name ? _data.name : ""}!FeatureCollection`);
    }
    const FeatureGeometryType = _data.features[0].geometry.type;
    switch (FeatureGeometryType) {
      case "LineString": {
        // 3. 用断点顶点冗余, 做多条线段(drawcall优化)
        const data = _data as FeatureCollection<LineString>;
        const _coordinates = [];
        for (let i = 0; i < data.features.length; i++) {
          const feature = data.features[i];
          const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
          const coordinates = convertPoints(featureGeometryCoordinates, mapshaper3HanldeWrapper);
          _coordinates.push(coordinates);
        }
        const meshLineGeometry = new MeshLineGeometry();
        meshLineGeometry.setMultiLine(_coordinates);
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
        .fetch("/mapshaper-qinzhou/01_coastline_and_buildings.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 3.0, uColor: new THREE.Color("rgb(225, 225, 225)") });
        }),

      window
        .fetch("/mapshaper-qinzhou/02_rails.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 0.8, uColor: new THREE.Color("rgb(195, 195, 195)") });
        }),

      window
        .fetch("/mapshaper-qinzhou/05_road_edge.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 2.0, uColor: new THREE.Color("rgb(0, 0, 0)") });
        }),

      window
        .fetch("/mapshaper-qinzhou/05_road_lane_solid.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(155, 155, 155)") });
        }),

      window
        .fetch("/mapshaper-qinzhou/07_marks.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(0, 0, 0)") });
        }),

      window
        .fetch("/mapshaper-qinzhou/temple_block.json")
        .then((response) => response.json())
        .then((data: FeatureCollection<LineString>) => {
          handleMapShaperFile(data, { uResolution: _resolution, uUseDash: 1, uDashArray: [15, 10], uLineWidth: 4.0, uColor: new THREE.Color("rgb(255, 0, 0)") });
        }),
    ]).finally(() => group0.traverse((object3D) => object3D.layers.set(0)));
  }

  // 面
  {
    const _resolution = new THREE.Vector2(width, height);
    viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));
    const geometry = new MeshPolygonGeometry();
    const material = new MeshPolygonMaterial({ uResolution: _resolution, uColor: new THREE.Color("rgb(0, 0, 0)"), uUseShadow: 1 });
    const _triangles = [];
    Promise.all([
      window
        .fetch("/mapshaper-qinzhou/07_marks.json")
        .then((response) => response.json())
        .then((_data: FeatureCollection<LineString>) => {
          const data = _data as FeatureCollection<LineString>;
          for (let i = 0; i < data.features.length; i++) {
            const feature = data.features[i];
            const featureGeometryCoordinates = feature.geometry.coordinates as THREE.Vector3Tuple[] | THREE.Vector2Tuple[];
            const _flatten = flatten([featureGeometryCoordinates]);
            const _earcut = earcut(_flatten.vertices, _flatten.holes, _flatten.dimensions);
            for (const index of _earcut) {
              _triangles.push([_flatten.vertices[index * _flatten.dimensions], 0.0, -_flatten.vertices[index * _flatten.dimensions + 1]]);
            }
          }
          geometry.setPolygons(_triangles.flat());
          const mesh = new THREE.Mesh(geometry, material);
          mesh.frustumCulled = false;
          group0.add(mesh);
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
