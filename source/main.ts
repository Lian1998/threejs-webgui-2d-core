import "normalize.css";
import * as THREE from "three";
import debounce from "@libs/lodash/src/debounce";

import WebGL from "three_addons/capabilities/WebGL";
if (!WebGL.isWebGL2Available()) throw new Error("浏览器不支持WebGL2");

const viewport = document.querySelector("#viewport");
const { width, height } = viewport.getBoundingClientRect();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
renderer.setClearColor(0xffffff, 0.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.01, 1000);

const scene = new THREE.Scene();

import { MapControls } from "three_addons/controls/MapControls.js";
const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = false;

//////////////////////////////////////// 静态资源(底图)加载 ////////////////////////////////////////
import type { GeometryCollection } from "geojson";
import { LineString } from "geojson";

import { MeshLineGeometry } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineMaterial } from "@core/GeoCollectionLoader/mesh-line/";
import { MeshLineMaterialParameters } from "@core/GeoCollectionLoader/mesh-line/";

const group0 = new THREE.Group();
group0.layers.set(0);
scene.add(group0);
group0.rotateY(Math.PI);

{
  const _resolution = new THREE.Vector2(1024, 768);
  const handleLineMesh = (data: GeometryCollection<LineString>, materialConfiguration: MeshLineMaterialParameters) => {
    for (let i = 0; i < data.geometries.length; i++) {
      const geometry = data.geometries[i];
      const points = geometry.coordinates;
      const mlGeometry = new MeshLineGeometry();

      // @ts-ignore
      mlGeometry.setPoints(points);
      // prettier-ignore
      const mlMaterial = new MeshLineMaterial(materialConfiguration);
      const mesh = new THREE.Mesh(mlGeometry, mlMaterial);
      mesh.frustumCulled = false;
      group0.add(mesh);
    }
  };

  Promise.all([
    window
      .fetch("geojson-handled/01-陆地和建筑.json")
      .then((response) => {
        return response.json();
      })
      .then((data: GeometryCollection<LineString>) => {
        handleLineMesh(data, { resolution: _resolution, lineWidth: 1.5 });
      }),

    window
      .fetch("geojson-handled/02-基础地图.json")
      .then((response) => {
        return response.json();
      })
      .then((data: GeometryCollection<LineString>) => {
        handleLineMesh(data, { resolution: _resolution, lineWidth: 2.5 });
      }),

    window
      .fetch("geojson-handled/03-轨道.json")
      .then((response) => {
        return response.json();
      })
      .then((data: GeometryCollection<LineString>) => {
        handleLineMesh(data, { resolution: _resolution, lineWidth: 1 });
      }),

    window
      .fetch("geojson-handled/04-集卡车道线-实线.json")
      .then((response) => {
        return response.json();
      })
      .then((data: GeometryCollection<LineString>) => {
        handleLineMesh(data, { resolution: _resolution, lineWidth: 1 });
      }),

    window
      .fetch("geojson-handled/04-集卡车道线-虚线.json")
      .then((response) => {
        return response.json();
      })
      .then((data: GeometryCollection<LineString>) => {
        handleLineMesh(data, { resolution: _resolution, lineWidth: 1, useDash: 1 }); // , useDash: 1, dashArray: 1.0, dashRatio: 0.5, dashOffset: 0.0
      }),
  ]).finally(() => group0.traverse((object3D) => object3D.layers.set(0)));
}

//////////////////////////////////////// 图元拾取 ////////////////////////////////////////

const picker = new GpuPickManager(renderer);

const mousePosition = {
  x: 0.0,
  y: 0.0,
};

renderer.domElement.addEventListener("click", (e) => {
  const { x, y } = renderer.domElement.getBoundingClientRect();
  mousePosition.x = e.clientX - x;
  mousePosition.y = e.clientY - y;
  pickerPick();
});

const pickerPick = debounce(
  () => {
    const { pickid, object3d } = picker.pick(scene, camera, mousePosition.x, mousePosition.y);
    console.log(pickid, object3d?.name);
  },
  200,
  { leading: false, trailing: true },
);

//////////////////////////////////////// 缩放管线 ////////////////////////////////////////

const resizeEventDispatcher = new ViewportResizeDispatcher(viewport as HTMLElement);
resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => renderer.setSize(width, height));
resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => picker.syncRendererStatus(width, height));

console.log(ViewportResizeDispatcher.classInstanceMap.get("default"));
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
  window.addEventListener("mousemove", (e) => {
    const pos = getXZPosition(e, camera, renderer);
    coordinatesEl.innerHTML = `${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`;
  });
}

//////////////////////////////////////// 业务代码(设备)逻辑 ////////////////////////////////////////

import ColorDefine from "@source/ColorDefine";
import LayerSequence from "@source/LayerSequence";
import { ViewportResizeDispatcher } from "@core/index";
import { GpuPickManager } from "@core/GpuPickManager/GpuPickManager";

import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/utils/ratio";
import { darkenHex } from "@source/utils/color";

const group1 = new THREE.Group();
group1.layers.set(1);
scene.add(group1);

let qcInstance = undefined;

{
  camera.position.y = 2.0; // 让相机从y轴看向地面
  controls["_dollyIn"](1 / 5.0); // 略微调整视角以使得视口方便调试
  controls.update();
  const defaultZomm = camera.zoom;

  const t_QC_Gantry = await new THREE.TextureLoader().loadAsync("/resources/QC_Gantry.png");
  const t_QC_Trolley = await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png");

  const qcGantry = new Sprite2D({
    texture: t_QC_Gantry,
    mpp: calculateMPP(30, 610),
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
      const scale = defaultZomm / camera.zoom;
      qcLabel.scale.setScalar(scale);
    },
  };

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

  group1.traverse((object3D) => object3D.layers.set(1));
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

  // 渲染设备

  camera.layers.set(1);
  renderer.render(scene, camera);

  qcInstance?.update(clock.getDelta(), clock.getElapsedTime());
};

animate();
