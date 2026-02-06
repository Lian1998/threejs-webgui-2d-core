import "normalize.css";
import * as THREE from "three";

import WebGL from "three_addons/capabilities/WebGL";
if (!WebGL.isWebGL2Available()) throw new Error("浏览器不支持WebGL2");

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const { width, height } = viewport.getBoundingClientRect();
import { ViewportResizeDispatcher } from "@core/index";
const viewportResizeDispatcher = new ViewportResizeDispatcher(viewport);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => renderer.setSize(width, height));
renderer.setClearColor(0xffffff, 0.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

import { orthoCamera, mapControls, defaultZoom } from "./viewport";

const scene = new THREE.Scene();

//////////////////////////////////////// 图元拾取 ////////////////////////////////////////

import { GpuPickManager } from "@core/GpuPickManager/";
import { GpuPickCommonListener } from "@core/GpuPickManager/";
const picker = new GpuPickManager(renderer);
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => picker.syncRendererStatus(width, height));
const pickerHelper = new GpuPickCommonListener(picker, scene, orthoCamera);

//////////////////////////////////////// 光标坐标定位提示 ////////////////////////////////////////

import { getXZPosition } from "@source/utils/pointerCoordinates";
{
  const coordinatesEl = document.querySelector("#coordinates");
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().viewportElement.addEventListener("mousemove", (e) => {
    const pos = getXZPosition(e, orthoCamera, renderer);
    coordinatesEl.innerHTML = `${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`;
  });
}

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////

const group0 = new THREE.Group();
group0.layers.set(0);
scene.add(group0);

const _resolution = new THREE.Vector2(width, height);
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));

import { getMultiLineFromFile } from "@source/utils/mapshaperLoader";
import { MeshLineMaterial } from "@core/MeshLine/";
import { getMultiPolygonFromFile } from "@source/utils/mapshaperLoader";
import { MeshPolygonMaterial } from "@core/MeshPolygon/";
{
  getMultiLineFromFile("/mapshaper-qinzhou/01_coastline_and_buildings.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(225, 225, 225)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    group0.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/02_rails.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.4, uColor: new THREE.Color("rgb(195, 195, 195)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    group0.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/05_road_edge.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(0, 0, 0)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    group0.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/05_road_lane_solid.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.5, uColor: new THREE.Color("rgb(155, 155, 155)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    group0.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/temple_block.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 2.0, uUseDash: 1, uDashArray: [15, 10], uColor: new THREE.Color("rgb(255, 0, 0)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    group0.add(mesh);
  });

  getMultiPolygonFromFile("/mapshaper-qinzhou/07_marks.json").then((meshPolygonGeometry) => {
    const meshPolygonMaterial = new MeshLineMaterial({ uResolution: _resolution, uColor: new THREE.Color("rgb(0, 0, 0)") });
    const mesh = new THREE.Mesh(meshPolygonGeometry, meshPolygonMaterial);
    group0.add(mesh);
  });
}

group0.traverse((mesh) => {
  mesh.frustumCulled = false;
  mesh.layers.set(0);
});

//////////////////////////////////////// 业务代码(设备)逻辑 ////////////////////////////////////////

const group1 = new THREE.Group();
group1.layers.set(1);
scene.add(group1);

import { STS } from "@source/classes/STS";
import { AGV } from "@source/classes/AGV";

const LOGIC_CENTER = [567485.3, -2397835];
export const coordinateTrans_mm = (x: number, y: number) => [LOGIC_CENTER[0] - x / 1000.0, LOGIC_CENTER[1] + y / 1000.0];

fetch("/qinzhou/initDevice.json")
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    const STSRailsAnchorY = -(2397641.79 + 2397676.79) / 2.0 - 21.0;
    for (const itemValue of data[0].itemValue) {
      const sts = new STS(itemValue.cheId);
      group1.add(sts.pool.stsGantry);
      sts.pool.stsGantry.position.set(567297.0 - itemValue.GantryPos / 100.0, 0.0, STSRailsAnchorY);
    }

    for (const itemValue of data[1].itemValue) {
      const agv = new AGV(itemValue.cheId);
      group1.add(agv.pool.agvBase);
      try {
        const positions = coordinateTrans_mm(itemValue.AhtStatus.locationX, itemValue.AhtStatus.locationY);
        agv.pool.agvBase.position.set(positions[0], 0.0, positions[1]);
        agv.pool.agvBase.rotation.y = (itemValue.Heading / 100.0 / 180.0) * Math.PI;
      } catch (err) {}
    }
  });

//////////////////////////////////////// 渲染循环 ////////////////////////////////////////

const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);

  // qcInstance?.update(clock.getDelta(), clock.getElapsedTime());

  // 渲染地图

  orthoCamera.layers.set(0);
  renderer.render(scene, orthoCamera);

  renderer.autoClearColor = false;
  renderer.autoClearDepth = true;
  renderer.autoClearStencil = true;

  // 渲染设备

  orthoCamera.layers.set(1);
  renderer.render(scene, orthoCamera);
};

animate();

//////////////////////////////////////// 动态缩放测试 ////////////////////////////////////////
{
  let size = 1;
  window.addEventListener("keydown", () => {
    if (size % 2 == 1) {
      (viewport as HTMLDivElement).style.width = `1024px`;
      (viewport as HTMLDivElement).style.height = `768px`;
    } else {
      const { width, height } = viewport.getBoundingClientRect();
      (viewport as HTMLDivElement).style.width = `${width}px`;
      (viewport as HTMLDivElement).style.height = `${height}px`;
    }
    size += 1;
  });
}

//////////////////////////////////////// drawcall监听 ////////////////////////////////////////
import "@libs/Spector.js/distt/spector.bundle.js";

// @ts-ignore
const spector = new SPECTOR.Spector();
spector.displayUI();
