import "normalize.css";

import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager";

import { ThreejsGroups } from "@source/inMap/variables";
import { ThreejsLayers } from "@source/inMap/variables";
import { ThreejsRenderOrder } from "@source/inMap/variables";

import { MAP_CENTER } from "@source/inMap/viewport";
import { MAP_VIEW_SIZE } from "@source/inMap/viewport";
import { MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";
import { orthoCamera } from "@source/inMap/viewport";
import { mapControls } from "@source/inMap/viewport";

// 确保WebGL2
import { ensureWebGL2Available } from "@source/inMap/utils/common";
ensureWebGL2Available();

const viewport = document.querySelector("#viewport") ?? document.querySelector("#gui-viewport");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
renderer.setClearColor(0xffffff, 0.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

// 烘焙字符材质贴图
import { tinySDFAtlas } from "@core/SDFText2D/TinySdfAtlas";
tinySDFAtlas.prepareGlyph("你好世界!岸桥场桥:装船卸船移箱集装箱主小车门架小车任务指令状态数值％角度°速度故障模式~，。（）-");

// 烘焙精灵材质贴图
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";
await spriteAtlas.prepareSprite([
  "/resource/sprites/AGV_Base.png",
  "/resource/sprites/AGV_Header.png",
  "/resource/sprites/AGV_Pin.png",
  "/resource/sprites/AGV_Recharge.png",
  "/resource/sprites/ASC_Gantry.png",
  "/resource/sprites/STS_Gantry.png",
  "/resource/sprites/STS_Trolley.png",
  "/resource/sprites/TRUCK.png",
]); // prettier-ignore

// 挂载resize事件通知
import { ViewportResizeDispatcher } from "@core/index";
new ViewportResizeDispatcher(renderer);

// 挂载resize视角改变函数
import { registerOrthoCameraOnResize } from "@source/inMap/viewport";
registerOrthoCameraOnResize();

// 挂载基于GPUBuffer的图元拾取核心
import { GpuPickCommonListener } from "@core/index";
const gpuPickCommonListener = new GpuPickCommonListener(renderer, ThreejsGroups.Meshes, orthoCamera);
mapControls.addEventListener("start", () => (gpuPickCommonListener.enabled = false));
mapControls.addEventListener("end", () => (gpuPickCommonListener.enabled = true));

// 初始化底图
import { initialization_BaseMap } from "@source/inMap/baseMap";
initialization_BaseMap();

//////////////////////////////////////// 业务代码(设备)逻辑 ////////////////////////////////////////
import { IActor } from "@core/interfaces/IActor";
import { MeshPolygonGeometry } from "@core/index";
import { MeshPolygonMaterial } from "@core/index";
import { MeshLineGeometry } from "@core/index";
import { MeshLineMaterial } from "@core/index";

import { ColorPaletteManager } from "@source/themes/ColorPaletteManager/";
await ColorPaletteManager.instance.initialization();

import { STS } from "@source/classes/Devices/STS";
// import { AGV } from "@source/classes/Devices/AGV";
// import { ASC } from "@source/classes/Devices/ASC";

import { SDFText2DGeometry } from "@core/index";
import { SDFText2DMaterial } from "@core/index";

import { YardMap } from "@source/data";
import { handleYardData } from "@source/data/handleYardData";

const LOGIC_CENTER = [567485.3, -2397835];
const coordinateTrans_mm = (x: number, y: number) => [LOGIC_CENTER[0] - x / 1000.0, LOGIC_CENTER[1] + y / 1000.0];
Promise.all([
  // 设备位置初始化
  fetch("/restful-qinzhou/initDevice.json")
    .then((response) => response.json())
    .then((data) => {
      console.warn("initDevice", data);
      const STSRailsAnchorY = -(2397641.79 + 2397676.79) / 2.0;
      // STS
      for (const itemValue of data[0].itemValue) {
        const sts = new STS(itemValue.cheId);
        sts.represents.stsGantry.position.set(567297.0 - itemValue.GantryPos / 100.0, 0.0, STSRailsAnchorY);
      }

      // // AGV
      // for (const itemValue of data[1].itemValue) {
      //   const agv = new AGV(itemValue.cheId);
      //   ThreejsGroups.Meshes.add(agv.pool.agvBase);
      //   try {
      //     const positions = coordinateTrans_mm(itemValue.AhtStatus.locationX, itemValue.AhtStatus.locationY);
      //     agv.pool.agvBase.position.set(positions[0], 0.0, positions[1]);
      //     agv.pool.agvBase.rotation.y = (itemValue.Heading / 100.0 / 180.0) * Math.PI;
      //   } catch (err) {}
      // }

      return data;
    }),

  fetch("/restful-qinzhou/preDefBlockList.json")
    .then((response) => response.json())
    .then((data) => {
      console.warn("preDefBlockList", data);

      const positions = [];
      const lines = [];
      for (let i = 0; i < data.length; i++) {
        const element = data[i];

        const coordinates = coordinateTrans_mm(element.x, element.y);
        const a1 = [coordinates[0] - element.hl / 1000.0 / 2.0, 0.0, coordinates[1] - element.hw / 1000.0 / 2.0];
        const a2 = [coordinates[0] - element.hl / 1000.0 / 2.0, 0.0, coordinates[1] + element.hw / 1000.0 / 2.0];
        const a3 = [coordinates[0] + element.hl / 1000.0 / 2.0, 0.0, coordinates[1] + element.hw / 1000.0 / 2.0];
        const a4 = [coordinates[0] + element.hl / 1000.0 / 2.0, 0.0, coordinates[1] - element.hw / 1000.0 / 2.0];

        positions.push(...a1, ...a2, ...a3, ...a3, ...a4, ...a1);
        lines.push([...a1, ...a2, ...a3, ...a4, ...a1]);

        // 文字描述
        const labelGeometry = new SDFText2DGeometry();
        labelGeometry.setFromText({ text: element.areaName });
        const labelMaterial = new SDFText2DMaterial({ uOutlineColor: new THREE.Color(0xff0000) });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.renderOrder = ThreejsRenderOrder.BLOCK_PREDEFINE_LABEL;
        label.name = element.areaName;
        label.position.set(coordinates[0], 0.0, coordinates[1]);
        label.scale.setScalar(0.5);
        ThreejsGroups.Meshes.add(label);
      }

      // 几何面
      const polygonGeometry = new MeshPolygonGeometry();
      polygonGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
      const polygonMaterial = new MeshPolygonMaterial({ uResolution: new THREE.Vector2(1024, 768), uColor: new THREE.Color("#000000"), uOpacity: 0.4 });
      const polygonMesh = new THREE.Mesh(polygonGeometry, polygonMaterial);
      polygonMesh.frustumCulled = false;
      ThreejsGroups.Meshes.add(polygonMesh);
      // GpuPickManager.register(polygonMesh, { isGpuPickFeature: true, onSelected: () => console.log(element) });

      // 描边
      const lineGeometry = new MeshLineGeometry();
      lineGeometry.setMultiLine(lines);
      const lineMaterial = new MeshLineMaterial({ uResolution: new THREE.Vector2(1024, 768), uLineWidth: 1.0, uColor: new THREE.Color("#000000"), uUseDash: 1, uDashArray: new THREE.Vector2(1, 1) });
      const outline = new THREE.Mesh(lineGeometry, lineMaterial);
      outline.frustumCulled = false;
      ThreejsGroups.Meshes.add(outline);
    }),
])
  .then((responses) => {
    handleYardData();

    // // ASC
    // const initDeviceResponse = responses[0];
    // for (const itemValue of initDeviceResponse[2].itemValue) {
    //   const yardNo = `B${itemValue.cheId.slice(2, 4)}`;
    //   const yardItem = YardMap.get(yardNo);
    //   const startZ = yardItem.defs.min[1];
    //   const endZ = yardItem.defs.max[1];
    //   const centerX = (yardItem.defs.min[0] + yardItem.defs.max[0]) / 2;
    //   const inBlockSeq = Number.parseInt(itemValue.cheId.slice(4));
    //   const centerZ = (startZ + endZ) / 2.0 + Math.random() * ((endZ - startZ) / 2.0) * (inBlockSeq - 1.5) * 2.0;
    //   const asc = new ASC(itemValue.cheId);
    //   ThreejsGroups.Meshes.add(asc.pool.ascGantry);
    //   asc.pool.ascGantry.position.set(centerX, 0.0, centerZ);
    // }
  })
  .finally(() => {
    // // BLOCK NO
    // for (const [yardNo, yardItem] of YardMap) {
    //   const yardLabel = new SDFText2D({ text: yardNo, renderOrder: ThreejsRenderOrder.BLOCK_NO });
    //   (yardLabel.material as THREE.ShaderMaterial).uniforms.uBackgroundAlpha.value = 0.0;
    //   const centerX = (yardItem.defs.min[0] + yardItem.defs.max[0]) / 2.0 + yardItem.defs.offset[0];
    //   const centerZ = (yardItem.defs.min[1] + yardItem.defs.max[1]) / 2.0 + yardItem.defs.offset[1];
    //   yardLabel.position.set(centerX, 0.0, centerZ);
    //   ThreejsGroups.Meshes.add(yardLabel);
    //   yardLabel.onBeforeRender = () => {
    //     const scale = MAP_DEFAULT_ZOOM / orthoCamera.zoom;
    //     const scalar = 1.5 * Math.max(Math.min(scale, 1.0), 1.5);
    //     yardLabel.scale.setScalar(scalar);
    //   };
    // }

    for (const [seq, instance] of STS.classInstanceMap) (instance as IActor)?.onInit();
    console.log(ThreejsGroups.BaseMap);
    console.log(ThreejsGroups.Meshes);

    animate();
  });

//////////////////////////////////////// 渲染循环 ////////////////////////////////////////

const clock = new THREE.Clock();

const animate = () => {
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  requestAnimationFrame(animate);

  console.log(renderer.info.render.calls);

  // 渲染底图
  renderer.render(ThreejsGroups.BaseMap, orthoCamera);
  renderer.autoClearColor = false;
  renderer.autoClearDepth = true;
  renderer.autoClearStencil = true;

  // 同步一下逻辑矩阵
  ThreejsGroups.Represents.updateMatrixWorld();

  STS.getClassInstance<STS>(0).represents.stsGantry.position.x -= 0.05; // QC072
  for (const [seq, instance] of STS.classInstanceMap) (instance as IActor)?.onUpdate(deltaTime, elapsedTime);

  // 渲染图元
  renderer.render(ThreejsGroups.Meshes, orthoCamera);
};

//////////////////////////////////////// 光标坐标定位提示 ////////////////////////////////////////

import { getXZPosition } from "@source/inMap/utils/pointerCoordinates";
{
  const position = { x: 0.0, z: 0.0 };

  const spyEl = document.createElement("div");
  spyEl.id = "spy";
  viewport.appendChild(spyEl);
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>().viewportElement.addEventListener("mousemove", (e) => {
    const { x, z } = getXZPosition(e, orthoCamera, renderer);
    position.x = x;
    position.z = z;
    spyEl.innerHTML = `${position.x.toFixed(2)}, ${position.z.toFixed(2)}`;
  });

  window.addEventListener("keyup", (e) => {
    if (e.code !== "KeyS") return;
    console.warn(`${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
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
// import "@libs/Spector.js/distt/spector.bundle.js";

// // @ts-ignore
// const spector = new SPECTOR.Spector();
// spector.displayUI();

//////////////////////////////////////// 打印上下文 ////////////////////////////////////////

console.warn("ViewportResizeDispatcher", ViewportResizeDispatcher.classInstanceMap);
console.warn("GpuPickCommonListener", GpuPickCommonListener.classInstanceMap);
