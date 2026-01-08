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

import { MapControls } from "three_addons/controls/MapControls.js";
const viewSize = 600;
const camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 5000);
const center = new THREE.Vector3(565816.5, 0, -2397680.7);

camera.position.set(center.x, 1000, center.z);
camera.up.set(0, 1, 0);
camera.lookAt(center);
camera.zoom = 1;
camera.updateProjectionMatrix();

const controls = new MapControls(camera, renderer.domElement);
controls.minZoom = 0.5;
controls.maxZoom = 5;
controls.target.copy(center);
controls.update();

const scene = new THREE.Scene();

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////
import type { FeatureCollection } from "geojson";
import type { LineString } from "geojson";

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
    if (data.type !== "FeatureCollection") console.error("!FeatureCollection");

    for (let i = 0; i < data.features.length; i++) {
      const feature = data.features[i];
      try {
        const coordinates = feature.geometry.coordinates as THREE.Vector2Tuple[];
        const mlGeometry = new MeshLineGeometry();

        mlGeometry.setPoints(coordinates);
        const mlMaterial = new MeshLineMaterial(materialConfiguration);
        const mesh = new THREE.Mesh(mlGeometry, mlMaterial);
        mesh.frustumCulled = false;
        group0.add(mesh);
      } catch (err) {
        console.error("handleMapShaperFile Error", feature);
      }
    }
  };

  // 线
  Promise.all([
    window
      .fetch("/mapshaper-qinzhou/01_coastline_and_buildings.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(195, 195, 195)") });
      }),

    window
      .fetch("/mapshaper-qinzhou/02_rails.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(195, 195, 195)") });
      }),

    window
      .fetch("/mapshaper-qinzhou/05_road_edge.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.6, uColor: new THREE.Color("rgb(125, 125, 125)") });
      }),

    window
      .fetch("/mapshaper-qinzhou/05_road_lane_solid.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 1.5, uColor: new THREE.Color("rgb(0, 0, 0)") });
      }),

    window
      .fetch("/mapshaper-qinzhou/temple_block.json")
      .then((response) => response.json())
      .then((data: FeatureCollection<LineString>) => {
        handleMapShaperFile(data, { uResolution: _resolution, uLineWidth: 5, uColor: new THREE.Color("rgb(255, 0, 0)"), uUseDash: 1, uDashArray: [10, 10] });
      }),
  ]).finally(() => group0.traverse((object3D) => object3D.layers.set(0)));
}

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
