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

import { MapControls } from "three_addons/controls/MapControls.js";
const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, height / -2);
const controls = new MapControls(camera, renderer.domElement);
// controls.enableRotate = false;
// controls.enableDamping = false;

const scene = new THREE.Scene();

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////
import type { FeatureCollection } from "geojson";
import type { LineString } from "geojson";

import { convertPoints } from "@core/MeshLine/";
import { MeshLineGeometry } from "@core/MeshLine/";
import { MeshLineMaterial } from "@core/MeshLine/";
import { MeshLineMaterialParameters } from "@core/MeshLine/";

import { MeshPolygonGeometry } from "@core/MeshPolygon/";
import { MeshPolygonMaterial } from "@core/MeshPolygon/";

const group0 = new THREE.Group();
// group0.rotateY(Math.PI);
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

import earcut, { flatten, deviation } from "earcut";
// TODO: 面
{
}

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
    const { pickid, object3d } = picker.pick(scene, camera, mousePosition.x, mousePosition.y);
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
    const pos = getXZPosition(e, camera, renderer);
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
  camera.position.y = 1000.0; // 让相机从y轴看向地面
  controls["_dollyIn"](1 / 5.0); // 略微调整视角以使得视口方便调试
  controls.update();
}
const defaultZomm = camera.zoom;

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
      const scale = (1.0 * defaultZomm) / camera.zoom;
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

  camera.layers.set(0);
  renderer.render(scene, camera);

  renderer.autoClearColor = false;
  renderer.autoClearDepth = true;
  renderer.autoClearStencil = true;

  // 渲染设备

  camera.layers.set(1);
  renderer.render(scene, camera);
};

animate();
