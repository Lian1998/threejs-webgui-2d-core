import * as THREE from "three";
import { GpuPickCommonListener, ViewportResizeDispatcher } from "@core/index";
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

  const animate = () => {
    renderer.render(ThreejsGroups.BaseMap, orthoCamera);

    renderer.autoClear = false;
    renderer.autoClearColor = false;
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = true;

    renderer.render(ThreejsGroups.Meshes, orthoCamera);
    requestAnimationFrame(animate);
  };

  // 启动调试面板(dev模式)
  if (import.meta.env.DEV) void DebugGUIManager.instance.mount({ title: "WebGUI Debug", width: 340, closed: true });

  const gpuPickCommonListener = new GpuPickCommonListener(renderer, ThreejsGroups.Meshes, orthoCamera);
  gpuPickCommonListener.enabled = true;
  mapControls.addEventListener("start", () => (gpuPickCommonListener.enabled = false));
  mapControls.addEventListener("end", () => {
    gpuPickCommonListener.enabled = true;
  });

  // 初始化底图
  initBaseMap();

  initRestfulData().then(() => {
    socketioSubModule_map.registerListener<{
      updated: number;
      AGVX: number;
      AGVY: number;
      Heading: number;
    }>(`DF.VMS.V001.AhtRealStatus`, (itemValue, response) => {
      console.log(`DF.VMS.V001.AhtRealStatus`, itemValue, response);
    });

    socketioSubModule_map.subReal(undefined, `DF.VMS.V001.AhtRealStatus`);
  });

  animate();
}
