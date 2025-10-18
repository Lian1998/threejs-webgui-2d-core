import "normalize.css";
import * as THREE from "three";

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
scene.add(camera);

import { MapControls } from "three_addons/controls/MapControls.js";
const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = false;

//////////////////////////////////////// 业务代码逻辑 ////////////////////////////////////////

{
  camera.position.y = 2.0; // 让相机从y轴看向地面
  controls["_dollyIn"](1 / 5.0); // 略微调整视角以使得视口方便调试
  controls.update();
}

import ColorDefine from "./ColorDefine";
import LayerSequence from "./LayerSequence";
import { ViewportResizeDispatcher } from "@core/index";
import { GpuPickManager } from "@core/GpuPickManager/GpuPickManager";

import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/utils/ratio";
import { darkenHex } from "@source/utils/color";

const qcGantry = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Gantry.png"),
  mpp: calculateMPP(35, 2230),
  depth: LayerSequence.QC_Gantry,
  color: new THREE.Color(ColorDefine.DEVICE.DEFAULT),
});
qcGantry.name = "qcGantry";

const qcMT = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png"),
  mpp: calculateMPP(6, 87),
  depth: LayerSequence.QC_Trolley,
  color: new THREE.Color(darkenHex(ColorDefine.DEVICE.DEFAULT, 15)),
});
qcMT.name = "qcMT";
const qcMtPviot = new THREE.Object3D();
qcMtPviot.position.z = 18;
qcMtPviot.add(qcMT);

const qcPT = new Sprite2D({
  texture: await new THREE.TextureLoader().loadAsync("/resources/QC_Trolley.png"),
  mpp: calculateMPP(6, 87),
  depth: LayerSequence.QC_Trolley,
  color: new THREE.Color(darkenHex(ColorDefine.DEVICE.DEFAULT, 15)),
});
qcPT.name = "qcPT";
const qcPTPviot = new THREE.Object3D();
qcPTPviot.position.z = 20;
qcPTPviot.add(qcPT);

const qcLabel = new SDFText2D({
  text: "QC101",
  depth: LayerSequence.TEXT,
});
qcLabel.name = "qcLabel";
const qcLabelPviot = new THREE.Object3D();
qcLabelPviot.position.z = -10;
qcLabelPviot.add(qcLabel);

qcGantry.add(qcMtPviot);
qcGantry.add(qcPTPviot);
qcGantry.add(qcLabelPviot);
qcGantry.geometry.computeBoundingBox();
qcMT.geometry.boundingBox = qcGantry.geometry.boundingBox.clone();
qcPT.geometry.boundingBox = qcGantry.geometry.boundingBox.clone();
scene.add(qcGantry);

const picker = new GpuPickManager(renderer);
picker.register(qcGantry);
picker.register(qcMT);
picker.register(qcPT);
picker.register(qcLabel);
renderer.domElement.addEventListener("pointerdown", (e) => {
  const { pickid, object3d } = picker.pick(scene, camera, e.clientX, e.clientY);
  console.log(pickid, object3d?.name);
});

// console.log(ViewportResizeDispatcher.classInstanceMap.get("default"));
{
  let size = 0;
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

const resizeEventDispatcher = new ViewportResizeDispatcher(viewport as HTMLElement);
resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => renderer.setSize(width, height));
resizeEventDispatcher.addResizeEventListener(({ message: { width, height } }) => picker.syncRendererStatus(width, height));

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();

import { getXZPosition } from "@source/utils/pointerCoordinates";
{
  const coordinatesEl = document.querySelector("#coordinates");
  window.addEventListener("mousemove", (e) => {
    const pos = getXZPosition(e, camera, renderer);
    coordinatesEl.innerHTML = `${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}`;
  });
}
