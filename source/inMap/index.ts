import * as THREE from "three";
import { DebugGuiManager, DirtyRenderScheduler, GpuPickCommonListener, ViewportResizeDispatcher } from "@core/index";
import { tinySDFAtlas } from "@core/SDFText2D/TinySdfAtlas";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";
import { ThreejsGroups } from "@source/inMap/variables";
import { orthoCamera, mapControls, registerOrthoCameraOnResize } from "@source/inMap/viewport";
import { ensureWebGL2Available } from "@source/inMap/utils/common";
import { initialization_BaseMap } from "@source/inMap/baseMap";
import { initRestfulData } from "@source/data/initRestfulData";
import { socketioSubModule_map } from "@source/data/initWebSocketData";

void initializeInMap();

async function initializeInMap() {
  ensureWebGL2Available();

  tinySDFAtlas.prepareGlyph("你好世界岸桥场桥装船卸船移箱集装箱主小车门架小车任务指令状态数值角度速度故障模式禁行区预定义区域ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.:，。（）");
  await spriteAtlas.prepareSprite(["/resource/sprites/AGV_Base.png", "/resource/sprites/AGV_Header.png", "/resource/sprites/AGV_Pin.png", "/resource/sprites/AGV_Recharge.png", "/resource/sprites/ASC_Gantry.png", "/resource/sprites/STS_Gantry.png", "/resource/sprites/STS_Trolley.png", "/resource/sprites/TRUCK.png"]);

  const viewport = document.querySelector<HTMLDivElement>("#viewport") ?? document.querySelector<HTMLDivElement>("#gui-viewport");
  if (!viewport) throw new Error("WebGUI: missing #viewport or #gui-viewport element");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.setClearColor(0xffffff, 0.0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.appendChild(renderer.domElement);

  const resizeDispatcher = new ViewportResizeDispatcher(renderer);
  registerOrthoCameraOnResize();

  const renderScheduler = new DirtyRenderScheduler({
    renderer,
    passes: [
      {
        name: "BaseMap",
        scene: ThreejsGroups.BaseMap,
        camera: orthoCamera,
        autoClear: true,
        autoClearColor: true,
        autoClearDepth: true,
        autoClearStencil: true,
      },
      {
        name: "Meshes",
        scene: ThreejsGroups.Meshes,
        camera: orthoCamera,
        autoClear: false,
        autoClearColor: false,
        autoClearDepth: true,
        autoClearStencil: true,
      },
    ],
  });
  renderScheduler.bindControls(mapControls as any);
  resizeDispatcher.addResizeEventListener(() => renderScheduler.invalidate("resize"));

  if (import.meta.env.DEV) void DebugGuiManager.instance.mount({ title: "WebGUI Debug", width: 340, closed: true });

  const gpuPickCommonListener = new GpuPickCommonListener(renderer, ThreejsGroups.Meshes, orthoCamera);
  gpuPickCommonListener.enabled = true;
  mapControls.addEventListener("start", () => (gpuPickCommonListener.enabled = false));
  mapControls.addEventListener("end", () => {
    gpuPickCommonListener.enabled = true;
    renderScheduler.invalidate("controls-end");
  });

  initialization_BaseMap();
  renderScheduler.invalidate("base-map-init");

  initRestfulData().then(() => {
    renderScheduler.invalidate("restful-data");

    socketioSubModule_map.registerListener<{
      updated: number;
      AGVX: number;
      AGVY: number;
      Heading: number;
    }>(`DF.VMS.V001.AhtRealStatus`, (itemValue, response) => {
      console.log(`DF.VMS.V001.AhtRealStatus`, itemValue, response);
      renderScheduler.invalidate("socket:DF.VMS.V001.AhtRealStatus");
    });

    socketioSubModule_map.subReal(undefined, `DF.VMS.V001.AhtRealStatus`);
  });
}
