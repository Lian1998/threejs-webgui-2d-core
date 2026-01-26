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

import { orthoCamera, mapControls } from "./viewport";

const scene = new THREE.Scene();

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////

const group0 = new THREE.Group();
group0.layers.set(0);
scene.add(group0);

const _resolution = new THREE.Vector2(width, height);
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => _resolution.set(width, height));

import { getMultiLineFromFile } from "@source/utils/mapshaperLoader";
import { MeshLineMaterial } from "@core/MeshLine/";

getMultiLineFromFile("/mapshaper-qinzhou/01_coastline_and_buildings.json").then((meshLineGeometry) => {
  const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 2.0, uColor: new THREE.Color("rgb(225, 225, 225)") });
  const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
  group0.add(mesh);
});
getMultiLineFromFile("/mapshaper-qinzhou/02_rails.json").then((meshLineGeometry) => {
  const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 0.8, uColor: new THREE.Color("rgb(195, 195, 195)") });
  const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
  group0.add(mesh);
});
getMultiLineFromFile("/mapshaper-qinzhou/05_road_edge.json").then((meshLineGeometry) => {
  const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 2.0, uColor: new THREE.Color("rgb(0, 0, 0)") });
  const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
  group0.add(mesh);
});
getMultiLineFromFile("/mapshaper-qinzhou/05_road_lane_solid.json").then((meshLineGeometry) => {
  const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 1.0, uColor: new THREE.Color("rgb(155, 155, 155)") });
  const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
  group0.add(mesh);
});
getMultiLineFromFile("/mapshaper-qinzhou/temple_block.json").then((meshLineGeometry) => {
  const meshLineMaterial = new MeshLineMaterial({ uResolution: _resolution, uLineWidth: 4.0, uUseDash: 1, uDashArray: [15, 10], uColor: new THREE.Color("rgb(255, 0, 0)") });
  const mesh = new THREE.Mesh(meshLineGeometry, meshLineMaterial);
  group0.add(mesh);
});

import { getMultiPolygonFromFile } from "@source/utils/mapshaperLoader";
getMultiPolygonFromFile("/mapshaper-qinzhou/07_marks.json").then((meshPolygonGeometry) => {
  const meshPolygonMaterial = new MeshLineMaterial({ uResolution: _resolution, uColor: new THREE.Color("rgb(0, 0, 0)") });
  const mesh = new THREE.Mesh(meshPolygonGeometry, meshPolygonMaterial);
  group0.add(mesh);
});

group0.traverse((mesh) => {
  mesh.frustumCulled = false;
  mesh.layers.set(0);
});

//////////////////////////////////////// 图元拾取 ////////////////////////////////////////

const picker = new GpuPickManager(renderer);
viewportResizeDispatcher.addResizeEventListener(({ message: { width, height } }) => picker.syncRendererStatus(width, height));

const mousePosition = { x: 0.0, y: 0.0 };

renderer.domElement.addEventListener("mousemove", (e) => {
  const { x, y } = renderer.domElement.getBoundingClientRect();
  mousePosition.x = e.clientX - x;
  mousePosition.y = e.clientY - y;
  pickerPick();
});

import throttle from "@libs/lodash/src/throttle";
const pickerPick = throttle(
  () => {
    const { pickid, object3d } = picker.pick(scene, orthoCamera, mousePosition.x, mousePosition.y);
    console.log(pickid, object3d?.name);

    if (object3d?.name) qcInstance.moveIn();
    else qcInstance.moveOut();
  },
  240,
  { leading: false, trailing: true },
);

//////////////////////////////////////// 动态缩放测试 ////////////////////////////////////////
{
  let size = 1;
  window.addEventListener("keydown", () => {
    if (size % 2 == 1) {
      (viewport as HTMLDivElement).style.width = `800px`;
      (viewport as HTMLDivElement).style.height = `600px`;
    } else {
      (viewport as HTMLDivElement).style.width = `1024px`;
      (viewport as HTMLDivElement).style.height = `768px`;
    }
    size += 1;
  });
}

//////////////////////////////////////// 坐标定位 ////////////////////////////////////////

import { getXZPosition } from "@source/utils/pointerCoordinates";
{
  const coordinatesEl = document.querySelector("#coordinates");
  ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>("default").viewportElement.addEventListener("mousemove", (e) => {
    const pos = getXZPosition(e, orthoCamera, renderer);
    coordinatesEl.innerHTML = `${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`;
  });
}

//////////////////////////////////////// 业务代码(设备)逻辑 ////////////////////////////////////////

import ColorDefine from "@source/ColorDefine";
import LayerSequence from "@source/LayerSequence";
import { GpuPickManager } from "@core/GpuPickManager/GpuPickManager";

import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/utils/ratio";
import { darkenHex } from "@source/utils/color";

const group1 = new THREE.Group();
group1.layers.set(1);
scene.add(group1);

{
  orthoCamera.position.y = 1000.0; // 让相机从y轴看向地面
  mapControls["_dollyIn"](1 / 5.0); // 略微调整视角以使得视口方便调试
  mapControls.update();
}
const defaultZomm = orthoCamera.zoom;

let qcInstance = undefined;
{
  const t_QC_Gantry = await new THREE.TextureLoader().loadAsync("/resources/QC_Gantry.png");
  const t_QC_Trolley = await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png");

  const qcGantry = new Sprite2D({
    texture: t_QC_Gantry,
    mpp: calculateMPP(30.5, 610),
    depth: LayerSequence.QC_Gantry,
    color: new THREE.Color(ColorDefine.DEVICE.DEFAULT),
  });
  qcGantry.name = "qcGantry";

  const qcMtPviot = new THREE.Object3D();
  qcMtPviot.position.z = 60;
  const qcMT = new Sprite2D({
    texture: t_QC_Trolley,
    mpp: calculateMPP(18, 87),
    depth: LayerSequence.QC_Trolley,
    color: new THREE.Color(darkenHex(ColorDefine.DEVICE.DEFAULT, 15)),
  });
  qcMT.name = "qcMT";
  qcMtPviot.add(qcMT);

  const qcPTPviot = new THREE.Object3D();
  qcPTPviot.position.z = 40;
  const qcPT = new Sprite2D({
    texture: t_QC_Trolley,
    mpp: calculateMPP(18, 87),
    depth: LayerSequence.QC_Trolley,
    color: new THREE.Color(darkenHex(ColorDefine.DEVICE.DEFAULT, 15)),
  });
  qcPT.name = "qcPT";
  qcPTPviot.add(qcPT);

  const qcLabelPviot = new THREE.Object3D();
  qcLabelPviot.position.z = -40;
  const qcLabel = new SDFText2D({
    text: "QC101",
    depth: LayerSequence.TEXT,
  });
  qcLabel.name = "qcLabel";
  qcLabelPviot.add(qcLabel);

  qcInstance = {
    name: "QC101",
    qcGantry,
    qcMtPviot,
    qcMT,
    qcPTPviot,
    qcPT,
    qcLabelPviot,
    qcLabel,

    update: (deltaTime: number, elapsedTime: number) => {
      const scale = (1.0 * defaultZomm) / orthoCamera.zoom;
      qcLabel.scale.setScalar(scale);
    },

    moveIn: () => {
      qcLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
    },

    moveOut: () => {
      qcLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
    },
  };

  qcGantry.position.set(0, 0, 1);
  qcGantry.add(qcMtPviot);
  qcGantry.add(qcPTPviot);
  qcGantry.add(qcLabelPviot);
  qcGantry.geometry.computeBoundingBox();
  qcMT.geometry.boundingBox = qcGantry.geometry.boundingBox.clone();
  qcPT.geometry.boundingBox = qcGantry.geometry.boundingBox.clone();
  group1.add(qcGantry);
  picker.register(qcGantry);
  picker.register(qcMT);
  picker.register(qcPT);
  picker.register(qcLabel);

  qcGantry.traverse((object3D) => object3D.layers.set(1));
}

//////////////////////////////////////// 渲染循环 ////////////////////////////////////////

const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);

  qcInstance?.update(clock.getDelta(), clock.getElapsedTime());

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
