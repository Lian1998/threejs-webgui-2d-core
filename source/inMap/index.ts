import * as THREE from "three";
import { DirtyRenderScheduler, GpuPickCommonListener, ViewportResizeDispatcher } from "@core/index";
import { DebugGUIManager } from "@core/Mixins";
import { tinySDFAtlas } from "@core/SDFText2D/TinySdfAtlas";
import { spriteAtlas } from "@core/Sprite2D/Sprite2DAtlas";
import { ThreejsGroups } from "@source/inMap/variables";
import { boudingViewport } from "@source/inMap/viewport";
import { ensureWebGL2Available } from "@source/inMap/utils/common";
import { initBaseMap } from "@source/inMap/baseMap";
import { initRestfulData } from "@source/data/initRestfulData";
import { socketioSubModule_map } from "@source/data/initWebSocketData";

void initializeInMap();

async function initializeInMap() {
  // 检测当前浏览器是否支持WebGL2
  ensureWebGL2Available();

  // 初始化字形
  tinySDFAtlas.prepareGlyph("你好世界岸桥场桥装船卸船移箱集装箱主小车门架小车任务指令状态数值角度速度故障模式禁行区预定义区域ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.:，。（）");
  await spriteAtlas.prepareSprite(["/resource/sprites/AGV_Base.png", "/resource/sprites/AGV_Header.png", "/resource/sprites/AGV_Pin.png", "/resource/sprites/AGV_Recharge.png", "/resource/sprites/ASC_Gantry.png", "/resource/sprites/STS_Gantry.png", "/resource/sprites/STS_Trolley.png", "/resource/sprites/TRUCK.png"]);

  // 初始化渲染器挂载视口
  boudingViewport(); // 这里插入客户端逻辑, 如何绑定相机和世界的逻辑
  const resizeDispatcher = ViewportResizeDispatcher.getClassInstance(0) as ViewportResizeDispatcher; // 创建对viewport视口的监听器
  console.log(resizeDispatcher);
  const { renderer, camera: orthoCamera, controls: mapControls } = resizeDispatcher;

  // 创建按需渲染调度器
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
  resizeDispatcher.addResizeEventListener(() => renderScheduler.invalidate("resize")); // 当触发reszie事件时, 标记脏画面

  // 启动调试面板(dev模式)
  if (import.meta.env.DEV) void DebugGUIManager.instance.mount({ title: "WebGUI Debug", width: 340, closed: true });

  const gpuPickCommonListener = new GpuPickCommonListener(renderer, ThreejsGroups.Meshes, orthoCamera);
  gpuPickCommonListener.enabled = true;
  mapControls.addEventListener("start", () => (gpuPickCommonListener.enabled = false));
  mapControls.addEventListener("end", () => {
    gpuPickCommonListener.enabled = true;
    renderScheduler.invalidate("controls-end");
  });

  // 初始化底图
  initBaseMap();
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
