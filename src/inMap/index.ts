import { GpuPickCommonListener, ViewportResizeDispatcher } from "@core/legacy/index";
import { DebugGUIManager } from "@core/legacy/Mixins";
import { tinySDFAtlas } from "@core/legacy/SDFText2D/TinySdfAtlas";
import { spriteAtlas } from "@core/legacy/Sprite2D/Sprite2DAtlas";
import { ThreejsGroups } from "@/inMap/variables";
import { boudingViewport } from "@/inMap/viewport";
import { ensureWebGL2Available } from "@/inMap/utils/common";
import { initBaseMap } from "@/inMap/baseMap";
import { initRestfulData } from "@/data/initRestfulData";
import { socketioSubModule_map } from "@/data/initWebSocketData";

import { AGV } from "@/classes/Devices/AGV";

export async function init() {
  // 检测当前浏览器是否支持WebGL2
  ensureWebGL2Available();

  // 初始化字形
  tinySDFAtlas.prepareGlyph("你好世界岸桥场桥装船卸船移箱集装箱主小车门架小车任务指令状态数值角度速度故障模式禁行区预定义区域ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.:，。（）");

  // 初始化贴图
  await spriteAtlas.prepareSprite([
    "/resource/sprites/AGV_Base.png",
    "/resource/sprites/AGV_Header.png",
    "/resource/sprites/AGV_Pin.png",
    "/resource/sprites/AGV_Recharge.png",
    "/resource/sprites/ASC_Gantry.png",
    "/resource/sprites/STS_Gantry.png",
    "/resource/sprites/STS_Trolley.png",
    "/resource/sprites/TRUCK.png"
  ]); // prettier-ignore

  // 初始化渲染器挂载视口
  boudingViewport(); // 这里插入客户端逻辑, 如何绑定相机和世界的逻辑
  const resizeDispatcher = ViewportResizeDispatcher.getClassInstance<ViewportResizeDispatcher>(0); // 创建对viewport视口的监听器
  console.warn("ViewportResizeDispatcher", resizeDispatcher);
  const { renderer, camera: orthoCamera, controls: mapControls } = resizeDispatcher;

  const gpuPickCommonListener = new GpuPickCommonListener(renderer, ThreejsGroups.Meshes, orthoCamera);
  gpuPickCommonListener.enabled = true;
  mapControls.addEventListener("start", () => (gpuPickCommonListener.enabled = false));
  mapControls.addEventListener("end", () => (gpuPickCommonListener.enabled = true));

  // 初始化底图
  initBaseMap();

  // dev模式时启动调试面板
  if (import.meta.env.DEV) void DebugGUIManager.instance.mount({ title: "WebGUI Debug", width: 340, closed: true });

  const igvInstance = new AGV("V001");

  ThreejsGroups.Meshes.add(igvInstance.pool.agvBase);
  igvInstance.pool.agvBase.position.set(565816.5, 0.0, -2397680.7);

  initRestfulData().then(() => {
    socketioSubModule_map.registerListener<{
      updated: number; // 1750300090863
      AGVX: number; // 20600
      AGVY: number; // 23600
      Heading: number; // 9000
    }>(`DF.VMS.V001.AhtRealStatus`, (itemValue, response) => {
      console.log(`DF.VMS.V001.AhtRealStatus`, itemValue, response);
    });

    socketioSubModule_map.subReal(undefined, `DF.VMS.V001.AhtRealStatus`);
  });

  const animate = () => {
    renderer.render(ThreejsGroups.BaseMap, orthoCamera);

    renderer.autoClear = false;
    renderer.autoClearColor = false;
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = true;

    renderer.render(ThreejsGroups.Meshes, orthoCamera);
    requestAnimationFrame(animate);
  };
  animate();
}
