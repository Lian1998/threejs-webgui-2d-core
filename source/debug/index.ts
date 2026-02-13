import "normalize.css";
import * as THREE from "three";

import WebGL from "three_addons/capabilities/WebGL";
if (!WebGL.isWebGL2Available()) throw new Error("浏览器不支持WebGL2");

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
renderer.setClearColor(0xffffff, 0.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();

import { ViewportResizeDispatcher } from "@core/index";
new ViewportResizeDispatcher(renderer);

import { orthoCamera } from "@source/inMap/viewport";
import { MAP_VIEW_SIZE } from "@source/inMap/viewport";
import { MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";

ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().addResizeEventListener(
  ({
    message: {
      rendererSize: { width, height },
    },
  }) => {
    const aspect = width / height;
    orthoCamera.left = -MAP_VIEW_SIZE * aspect;
    orthoCamera.right = MAP_VIEW_SIZE * aspect;
    orthoCamera.top = MAP_VIEW_SIZE;
    orthoCamera.bottom = -MAP_VIEW_SIZE;
    orthoCamera.updateProjectionMatrix();
  },
);

//////////////////////////////////////// 图元拾取 ////////////////////////////////////////

import { GpuPickCommonListener } from "@core/GpuPickManager/";
new GpuPickCommonListener(renderer, ThreejsGroups.Devices, orthoCamera);

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////

import { ThreejsGroups } from "@source/inMap/index";

const _resolution = new THREE.Vector2(1.0, 1.0);
ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().addResizeEventListener(
  ({
    message: {
      rendererSize: { width, height },
    },
  }) => _resolution.set(width, height),
);

import { getMultiLineFromFile } from "@source/inMap/utils/mapshaperHelpers";
import { MeshLineMaterial } from "@core/MeshLine/";
import { getMultiPolygonFromFile } from "@source/inMap/utils/mapshaperHelpers";
import { MeshPolygonMaterial } from "@core/MeshPolygon/";
{
  getMultiLineFromFile("/mapshaper-qinzhou/01_coastline_and_buildings.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(225, 225, 225)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/02_rails.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.4, uColor: new THREE.Color("rgb(195, 195, 195)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/05_road_edge.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(0, 0, 0)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/05_road_lane_solid.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.5, uColor: new THREE.Color("rgb(155, 155, 155)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiLineFromFile("/mapshaper-qinzhou/temple_block.json").then((meshLineGeometry) => {
    const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 2.0, uUseDash: 1, uDashArray: [15, 10], uColor: new THREE.Color("rgb(255, 0, 0)") });
    const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
  getMultiPolygonFromFile("/mapshaper-qinzhou/07_marks.json").then((meshPolygonGeometry) => {
    const meshPolygonMaterial = new MeshLineMaterial({ uResolution: _resolution, uColor: new THREE.Color("rgb(0, 0, 0)") });
    const mesh = new THREE.Mesh(meshPolygonGeometry, meshPolygonMaterial);
    ThreejsGroups.BaseMap.add(mesh);
  });
}

ThreejsGroups.BaseMap.traverse((mesh) => {
  mesh.renderOrder = ThreejsRenderOrder.PLACEHOLDER0;
  mesh.frustumCulled = false;
});
scene.add(ThreejsGroups.BaseMap);

//////////////////////////////////////// 业务代码(设备)逻辑 ////////////////////////////////////////
import { ColorPaletteManager } from "@source/themes/ColorPaletteManager/";
await ColorPaletteManager.instance.initialization();

scene.add(ThreejsGroups.Devices);

import { STS } from "@source/classes/Devices/STS";
import { AGV } from "@source/classes/Devices/AGV";
import { ASC } from "@source/classes/Devices/ASC";

import { BlockMap } from "@source/data";
import { SDFText2D } from "@core/index";
import { handleYardData } from "@source/data/handleYardData";
import { ThreejsRenderOrder } from "@source/inMap/index";

const LOGIC_CENTER = [567485.3, -2397835];
export const coordinateTrans_mm = (x: number, y: number) => [LOGIC_CENTER[0] - x / 1000.0, LOGIC_CENTER[1] + y / 1000.0];
Promise.all([
  // 设备位置初始化
  fetch("/restful-qinzhou/initDevice.json")
    .then((response) => response.json())
    .then((data) => {
      console.warn("initDevice", data);
      const STSRailsAnchorY = -(2397641.79 + 2397676.79) / 2.0 - 21.0;
      // STS
      for (const itemValue of data[0].itemValue) {
        const sts = new STS(itemValue.cheId);
        ThreejsGroups.Devices.add(sts.pool.stsGantry);
        sts.pool.stsGantry.position.set(567297.0 - itemValue.GantryPos / 100.0, 0.0, STSRailsAnchorY);
      }

      // AGV
      for (const itemValue of data[1].itemValue) {
        const agv = new AGV(itemValue.cheId);
        ThreejsGroups.Devices.add(agv.pool.agvBase);
        try {
          const positions = coordinateTrans_mm(itemValue.AhtStatus.locationX, itemValue.AhtStatus.locationY);
          agv.pool.agvBase.position.set(positions[0], 0.0, positions[1]);
          agv.pool.agvBase.rotation.y = (itemValue.Heading / 100.0 / 180.0) * Math.PI;
        } catch (err) {}
      }

      return data;
    }),
])
  .then((responses) => {
    handleYardData();

    // ASC
    const initDeviceResponse = responses[0];
    for (const itemValue of initDeviceResponse[2].itemValue) {
      const blockNo = `B${itemValue.cheId.slice(2, 4)}`;
      const blockItem = BlockMap.get(blockNo);
      const startZ = blockItem.defs.min[1];
      const endZ = blockItem.defs.max[1];
      const centerX = (blockItem.defs.min[0] + blockItem.defs.max[0]) / 2;
      const inBlockSeq = Number.parseInt(itemValue.cheId.slice(4));
      const centerZ = (startZ + endZ) / 2.0 + Math.random() * ((endZ - startZ) / 2.0) * (inBlockSeq - 1.5) * 2.0;
      const asc = new ASC(itemValue.cheId);
      ThreejsGroups.Devices.add(asc.pool.ascGantry);
      asc.pool.ascGantry.position.set(centerX, 0.0, centerZ);
    }
  })
  .finally(() => {
    // BLOCK NO
    for (const [blockNo, blockItem] of BlockMap) {
      const blockLabel = new SDFText2D({ text: blockNo, renderOrder: ThreejsRenderOrder.BLOCK_NO });
      (blockLabel.material as THREE.ShaderMaterial).uniforms.uBackgroundAlpha.value = 0.0;
      const centerX = (blockItem.defs.min[0] + blockItem.defs.max[0]) / 2.0 + blockItem.defs.offset[0];
      const centerZ = (blockItem.defs.min[1] + blockItem.defs.max[1]) / 2.0 + blockItem.defs.offset[1];
      blockLabel.position.set(centerX, 0.0, centerZ);
      ThreejsGroups.Devices.add(blockLabel);
      blockLabel.onBeforeRender = () => {
        const scale = MAP_DEFAULT_ZOOM / orthoCamera.zoom;
        const scalar = 1.5 * Math.max(Math.min(scale, 1.0), 1.5);
        blockLabel.scale.setScalar(scalar);
      };
    }
  });

//////////////////////////////////////// 渲染循环 ////////////////////////////////////////

const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);

  renderer.render(ThreejsGroups.BaseMap, orthoCamera);

  renderer.autoClearColor = false;
  renderer.autoClearDepth = true;
  renderer.autoClearStencil = true;
  renderer.render(ThreejsGroups.Devices, orthoCamera);
};

animate();

//////////////////////////////////////// 光标坐标定位提示 ////////////////////////////////////////

import { getXZPosition } from "@source/inMap/utils/pointerCoordinates";
{
  const pos = { x: 0.0, z: 0.0 };

  const spyEl = document.createElement("div");
  spyEl.id = "spy";
  viewport.appendChild(spyEl);
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().viewportElement.addEventListener("mousemove", (e) => {
    const { x, z } = getXZPosition(e, orthoCamera, renderer);
    pos.x = x;
    pos.z = z;
    spyEl.innerHTML = `${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`;
  });

  window.addEventListener("keyup", (e) => {
    if (e.code !== "KeyS") return;
    console.warn(`${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`);
  });
}

//////////////////////////////////////// 动态缩放测试 ////////////////////////////////////////
{
  let size = 1;
  window.addEventListener("keyup", (e) => {
    if (e.code !== "KeyQ") return;
    if (size % 2 == 1) {
      (viewport as HTMLDivElement).style.width = `1024px`;
      (viewport as HTMLDivElement).style.height = `768px`;
    } else {
      const width = window.innerWidth;
      const height = window.innerHeight;
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

//////////////////////////////////////// 打印上下文 ////////////////////////////////////////

console.warn("ViewportResizeDispatcher", ViewportResizeDispatcher.classInstanceMap);
console.warn("GpuPickCommonListener", GpuPickCommonListener.classInstanceMap);
