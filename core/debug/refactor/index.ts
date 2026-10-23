import { Viewer2D } from "../../Viewer2D";
import { SimulatedDevice } from "../../examples/SimulatedDevice";
import type { PrimitiveHandle, Vec2 } from "../../contracts";
import { runFoundationChecks } from "../checks/foundations";
import { runInteractionChecks } from "../checks/interaction";
import { runPrimitiveChecks } from "../checks/primitives";
import { runSpriteTextChecks } from "../../render/text/checks";
import { PerformanceObserver, seededRandom, type SceneLoad } from "./PerformanceObserver";
import "./debug.css";

const modules: Record<string, string> = {
  viewport: "坐标与视口",
  scheduler: "帧调度",
  primitives: "图元生命周期",
  layers: "图层与顺序",
  resources: "共享资源",
  batching: "自动批渲染",
  polygons: "多边形与孔洞",
  lines: "粗线与虚线",
  "sprite-atlas": "图片图集",
  sprites: "精灵实例",
  "font-atlas": "字形图集",
  text: "动态中文标签",
  picking: "精准拾取",
  interaction: "交互与选择",
  motion: "实时插帧",
  composition: "组合设备",
  "debug-gui": "每实例 GUI",
  performance: "性能观察",
  delivery: "公共 API 示例",
};
const moduleName =
  location.pathname
    .split("/")
    .pop()
    ?.replace(/\.html$/, "") ?? "delivery";
const current = modules[moduleName] ? moduleName : "delivery";
document.title = `DEBUG ${modules[current]}`;
document.body.innerHTML = `<header><a href="/debug/index.html">模块索引</a><strong>${modules[current]}</strong><span class="badge">LOCAL THREE r170 / WEBGL2</span><span id="status" class="status">正在加载离线资源...</span></header>
<div class="controls">
<label>设备 <input id="count" type="number" min="0" max="5000" value="${current === "performance" ? 128 : 8}"></label>
<label>更新 Hz <input id="frequency" type="number" min="1" max="60" value="5"></label>
<label>移动 % <input id="moving-ratio" type="number" min="0" max="100" value="${current === "performance" ? 50 : 100}"></label>
<label><input id="labels" type="checkbox" checked>中文标签</label>
<label>标签 Hz <input id="label-frequency" type="number" min="0" max="30" value="0"></label>
<label>管线 <input id="pipelines" type="number" min="0" max="2000" value="${current === "performance" ? 16 : 0}"></label>
<label>每线点数 <input id="pipeline-points" type="number" min="2" max="256" value="8"></label>
<label>DPR 上限 <input id="dpr" type="number" min="0.5" max="4" step="0.25" value="2"></label>
<label>seed <input id="seed" type="number" min="0" max="2147483647" value="42"></label>
<label>热机状态 <select id="thermal"><option value="unspecified">未记录</option><option value="cold">冷机</option><option value="warmed">热机</option></select></label>
<label><input id="sampling" type="checkbox" checked>采样</label><button id="sample-reset">重置窗口</button><button id="sample-copy">复制摘要</button>
<label><input id="running" type="checkbox">持续移动</label>
<label><input id="gui-toggle" type="checkbox" ${["delivery", "debug-gui"].includes(current) ? "checked" : ""}>实例 GUI</label>
<button id="apply">创建场景</button><button id="peer-toggle">第二个 Viewer</button><button id="dispose">销毁主视口</button>
<label>命中 <select id="hit-mode"><option value="visible">可见像素</option><option value="bounds">精灵范围</option><option value="priority">下层优先</option></select></label>
<label><input id="picking-enabled" type="checkbox" checked>拾取</label>
<label>可选图层 <select id="pick-layers"><option value="all">全部</option><option value="devices">设备与标签</option><option value="pipelines">管线</option></select></label>
<label>管线容差 px <input id="tolerance" type="number" min="0" max="30" value="0"></label>
<button id="text-update">更新中文</button><button id="checks-run">基础检查</button></div>
<div class="hint">橙色环的透明洞, 右上多边形孔洞, 底部虚线与半透明转角用于拾取检查. 点击部件查看 owner/part. 拖动平移, 滚轮缩放. 静止场景按需渲染.</div>
<main class="layout"><div class="viewports"><div id="viewport" class="viewport"></div></div><aside><h3>选择与事件</h3><pre id="selected">尚未选择</pre><pre id="events"></pre><h3>帧采样与实际统计</h3><pre id="stats"></pre><textarea id="summary-copy" hidden readonly aria-label="可复制统计摘要"></textarea><h3>轻量检查</h3><pre id="checks">按按钮执行纯计算与生命周期检查.</pre><nav>${Object.entries(
  modules,
)
  .map(([name, label]) => `<a href="/debug/refactor/${name}.html">${label}</a>`)
  .join("")}</nav></aside></main>`;

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const numberValue = (id: string, low: number, high: number) => Math.min(high, Math.max(low, Number(element<HTMLInputElement>(id).value) || low));
let view: Viewer2D | undefined;
let peer: Viewer2D | undefined;
let devices: SimulatedDevice[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let labelTimer: ReturnType<typeof setInterval> | undefined;
let observer: PerformanceObserver | undefined;
let config: SceneLoad;
let trajectories: { base: Vec2; phase: number; speed: number }[] = [];
let generation = 0;
let started = performance.now();
let textRevision = 0;
const handles = new Map<string, PrimitiveHandle<any>>();
const errors: string[] = [];
const eventLog: string[] = [];
const fixtures: Record<string, Vec2> = {
  ring: [-18, 7],
  polygon: [13, 7],
  text: [0, 16],
  space: [22, 16],
  dark: [25, -5],
  darkAlpha: [31, -5],
  dash: [0, -14],
  elbow: [2, -7],
};

function report(error: unknown): void {
  errors.push(error instanceof Error ? error.message : String(error));
  element("status").textContent = errors[errors.length - 1];
  element("status").className = "error";
  console.error(error);
}
function stopSimulation(): void {
  if (timer !== undefined) clearInterval(timer);
  if (labelTimer !== undefined) clearInterval(labelTimer);
  timer = labelTimer = undefined;
}
function setRunning(running: boolean): void {
  element<HTMLInputElement>("running").checked = running;
  stopSimulation();
  if (!view || view.disposed || !config) return;
  started = performance.now();
  const movingCount = Math.floor((devices.length * numberValue("moving-ratio", 0, 100)) / 100);
  if (running && movingCount)
    timer = setInterval(
      () => {
        const time = (performance.now() - started) / 1000;
        devices.slice(0, movingCount).forEach((device, index) => {
          const { base, phase, speed } = trajectories[index],
            value = time * speed + phase;
          device.movement.push({
            position: [base[0] + Math.sin(value) * 0.65, base[1] + Math.cos(value) * 0.65],
            rotation: Math.sin(value / 2) * 0.5,
          });
        });
      },
      1000 / numberValue("frequency", 1, 60),
    );
  const labelHz = numberValue("label-frequency", 0, 30);
  if (labelHz && devices.some((device) => device.label))
    labelTimer = setInterval(() => {
      textRevision++;
      devices.forEach((device) => device.label?.setText(`设备 ${device.id} ${String(textRevision % 1000).padStart(3, "0")}`));
    }, 1000 / labelHz);
}
function readConfig(): SceneLoad {
  return {
    deviceCount: Math.floor(numberValue("count", 0, 5000)),
    movingRatio: numberValue("moving-ratio", 0, 100) / 100,
    updateHz: numberValue("frequency", 1, 60),
    labelsVisible: element<HTMLInputElement>("labels").checked,
    labelChangeHz: numberValue("label-frequency", 0, 30),
    pipelineCount: Math.floor(numberValue("pipelines", 0, 2000)),
    pointsPerPipeline: Math.floor(numberValue("pipeline-points", 2, 256)),
    dpr: numberValue("dpr", 0.5, 4),
    seed: Math.floor(numberValue("seed", 0, 2147483647)),
  };
}
function applyPickPolicy(): void {
  if (!view || view.disposed) return;
  const enabled = element<HTMLInputElement>("picking-enabled").checked;
  const value = element<HTMLSelectElement>("pick-layers").value;
  view.interaction.setQuery({
    layers: !enabled ? [] : value === "devices" ? ["devices", "cargo", "labels"] : value === "pipelines" ? ["pipelines", "routes"] : undefined,
  });
}
function rectangle(halfWidth: number, halfHeight: number): readonly Vec2[] {
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ];
}
function save<T extends PrimitiveHandle<any>>(handle: T): T {
  handles.set(handle.id, handle);
  for (const type of ["pointerenter", "pointerleave", "select", "deselect", "dblclick"] as const)
    handle.on(type, (event) => {
      eventLog.unshift(`${type}: ${event.target.id} owner=${event.hit?.ownerId ?? "-"} part=${event.hit?.partId ?? "-"}`);
      eventLog.length = Math.min(eventLog.length, 12);
      element("events").textContent = eventLog.join("\n");
    });
  return handle;
}
async function loadResources(target: Viewer2D): Promise<void> {
  const response = await fetch("/fonts/demo-coverage.txt");
  if (!response.ok) throw new Error("离线字体 coverage 文件不可用.");
  const coverage = [...new Set([...(await response.text())].filter((character) => character !== "\n" && character !== "\r"))];
  await Promise.all([
    target.resources.fonts.register({
      id: "demo",
      family: "Noto Sans SC Demo",
      url: "/fonts/NotoSansSC-demo.woff2",
      weight: "400",
      coverage,
    }),
    ...["body", "head", "ring", "dark", "dark-alpha"].map((id) => target.resources.sprites.register({ id, url: `/debug/${id}.svg` })),
  ]);
}

/** 创建场景 */
async function createScene(): Promise<void> {
  const token = ++generation;
  stopSimulation();
  observer?.dispose();
  observer = undefined;
  devices.forEach((device) => device.dispose());
  devices = [];
  view?.dispose();
  handles.clear();
  errors.length = 0;
  config = readConfig();
  const target = new Viewer2D({
    container: element("viewport"),
    background: "#101c2a",
    scale: 12,
    maxDpr: config.dpr,
    debug: { gui: element<HTMLInputElement>("gui-toggle").checked },
    onError: report,
  });
  view = target;
  observer = new PerformanceObserver(target, config);
  observer.setEnabled(element<HTMLInputElement>("sampling").checked);
  debug.ready = false;
  for (const [id, order] of [
    ["areas", 0],
    ["routes", 5],
    ["devices", 20],
    ["cargo", 25],
    ["fixtures", 30],
    ["pipelines", 35],
    ["labels", 40],
  ] as const)
    target.layers.add({ id, order });
  try {
    await loadResources(target);
  } catch (error) {
    if (token !== generation || target.disposed) return;
    throw error;
  }
  if (token !== generation || target.disposed) return;
  const underlay = save(
    target.primitives.addPolygon({
      id: "hole-underlay",
      layer: "areas",
      transform: { position: fixtures.ring },
      geometry: { type: "Polygon", polygon: { outer: rectangle(3, 3) } },
      fill: "#255367",
    }),
  );
  save(
    target.primitives.addPolygon({
      id: "fixture-lock-area",
      ownerId: "D001",
      partId: "lock-area",
      layer: "areas",
      fill: "#ba965a",
      opacity: 0.3,
      transform: { position: [-6, 11] },
      geometry: {
        type: "MultiPolygon",
        polygons: [
          {
            outer: [
              [-4, -1],
              [-1, -1],
              [-1, 1],
              [-4, 1],
            ],
          },
          {
            outer: [
              [1, -1],
              [4, -1],
              [4, 1],
              [1, 1],
            ],
          },
        ],
      },
    }),
  );
  save(
    target.primitives.addSprite({
      id: "fixture-ring",
      ownerId: "fixture",
      partId: "ring",
      layer: "fixtures",
      image: "ring",
      size: [6, 6],
      transform: { position: fixtures.ring },
    }),
  );
  save(
    target.primitives.addPolygon({
      id: "fixture-polygon",
      ownerId: "fixture",
      partId: "area",
      layer: "fixtures",
      geometry: { type: "Polygon", polygon: { outer: rectangle(3.5, 3.5), holes: [rectangle(1.3, 1.3)] } },
      transform: { position: fixtures.polygon },
      fill: "#56a7c7",
    }),
  );
  save(
    target.primitives.addLine({
      id: "fixture-dash",
      layer: "pipelines",
      points: [
        [-27, -14],
        [27, -14],
      ],
      color: "#edc676",
      width: 8,
      widthMode: "screen",
      dash: { length: 20, gap: 20 },
    }),
  );
  save(
    target.primitives.addLine({
      id: "fixture-elbow",
      layer: "pipelines",
      points: [
        [-3, 0],
        [3, 0],
        [3, 6],
      ],
      transform: { position: [-1, -10] },
      color: "#72d7e3",
      width: 12,
      widthMode: "screen",
      cap: "round",
      join: "miter",
      opacity: 0.5,
    }),
  );
  const label = save(
    target.primitives.addText({
      id: "fixture-text",
      ownerId: "fixture",
      partId: "label",
      layer: "labels",
      text: "中文 标签\n设备 001",
      font: "demo",
      fontSize: 20,
      sizeMode: "screen",
      align: "center",
      transform: { position: fixtures.text },
      color: "#eaf8ff",
      outline: { color: "#182635", width: 0.6 },
      background: { color: "#355061", opacity: 0.9, radius: 8 },
      padding: [6, 9, 6, 9],
    }),
  );
  const space = save(
    target.primitives.addText({
      id: "fixture-space",
      layer: "labels",
      text: " ",
      font: "demo",
      fontSize: 30,
      sizeMode: "screen",
      transform: { position: fixtures.space },
      hit: { mode: "bounds" },
    }),
  );
  const dark = save(
    target.primitives.addSprite({
      id: "fixture-dark",
      layer: "fixtures",
      image: "dark",
      size: [4, 4],
      transform: { position: fixtures.dark },
    }),
  );
  const alpha = save(
    target.primitives.addSprite({
      id: "fixture-dark-alpha",
      layer: "fixtures",
      image: "dark-alpha",
      size: [4, 4],
      transform: { position: fixtures.darkAlpha },
    }),
  );
  const count = config.deviceCount,
    labels = config.labelsVisible;
  const random = seededRandom(config.seed);
  trajectories = Array.from({ length: count }, (_, index) => ({
    base: [-27 + (index % 12) * 4.8, -1 - Math.floor(index / 12) * 5] as Vec2,
    phase: random() * Math.PI * 2,
    speed: 0.8 + random() * 0.4,
  }));
  devices = Array.from({ length: count }, (_, index) => new SimulatedDevice(target, `D${String(index + 1).padStart(3, "0")}`, [-27 + (index % 12) * 4.8, -1 - Math.floor(index / 12) * 5], labels, current !== "performance"));
  devices.forEach((device) => {
    save(device.body);
    save(device.head);
    save(device.box);
    if (device.label) save(device.label);
    if (device.route) save(device.route);
  });
  const pipelineRandom = seededRandom(config.seed ^ 0x5f3759df);
  for (let index = 0; index < config.pipelineCount; index++) {
    const phase = pipelineRandom() * Math.PI * 2,
      x = -25 + pipelineRandom() * 40,
      y = 19 + (index % 6) * 2.5;
    save(
      target.primitives.addLine({
        id: `pipeline-${index}`,
        layer: "routes",
        points: Array.from({ length: config.pointsPerPipeline }, (_, point) => [x + point * 1.2, y + Math.sin(point * 0.7 + phase)] as Vec2),
        color: index % 2 ? "#407d96" : "#648ba5",
        width: 2,
        widthMode: "screen",
        dash: index % 2 ? { length: 8, gap: 4 } : null,
      }),
    );
  }
  target.interaction.onSelectionChange((change) => {
    element("selected").textContent = change.current ? JSON.stringify(change.current, null, 2) : "尚未选择";
  });
  try {
    await Promise.all([label.ready(), space.ready(), dark.ready(), alpha.ready(), (handles.get("fixture-ring") as any).ready(), ...devices.map((device) => device.ready())]);
  } catch (error) {
    if (token !== generation || target.disposed) return;
    throw error;
  }
  if (token !== generation || target.disposed) return;
  target.flush();
  observer.markReady();
  applyPickPolicy();
  debug.ready = true;
  element("status").textContent = `${count} 台设备 / 离线字体已就绪`;
  element("status").className = "status";
  element<HTMLSelectElement>("hit-mode").value = "visible";
  element<HTMLInputElement>("tolerance").value = "0";
  underlay.update({ hit: { priority: 0 } });
  setRunning(element<HTMLInputElement>("running").checked);
}

async function createPeer(): Promise<void> {
  if (peer) {
    peer.dispose();
    peer = undefined;
    element("peer").remove();
    return;
  }
  const container = document.createElement("div");
  container.id = "peer";
  container.className = "viewport";
  element("viewport").parentElement!.appendChild(container);
  const target = new Viewer2D({ container, background: "#142638", scale: 12, controls: false });
  peer = target;
  await loadResources(target);
  if (target.disposed) return;
  const label = target.primitives.addText({
    id: "fixture-text",
    layer: "default",
    text: "设备 002",
    font: "demo",
    fontSize: 24,
    sizeMode: "screen",
    color: "#f7dc9b",
  });
  await label.ready();
  target.flush();
}
async function runChecks(): Promise<string[]> {
  const results = [...(await runFoundationChecks()), ...(await runInteractionChecks()), ...runPrimitiveChecks(), ...(await runSpriteTextChecks())];
  element("checks").textContent = results.map((result) => `PASS ${result}`).join("\n");
  return results;
}

// 只在显式 debug 页面暴露观察入口, 自动浏览器检查不需要访问私有 renderer.
const debug = {
  ready: false,
  errors,
  handles,
  fixtures,
  Viewer2D,
  get viewer() {
    return view;
  },
  get peer() {
    return peer;
  },
  get devices() {
    return devices;
  },
  rebuild: createScene,
  createPeer,
  runChecks,
  setRunning,
  summary: () =>
    observer
      ? {
          ...observer.summary(),
          thermalState: element<HTMLSelectElement>("thermal").value,
          simulationRunning: element<HTMLInputElement>("running").checked,
          picking: {
            enabled: element<HTMLInputElement>("picking-enabled").checked,
            query: element<HTMLSelectElement>("pick-layers").value,
          },
        }
      : undefined,
  readPixel(screen: Vec2): number[] {
    if (!view || view.disposed) throw new Error("Viewer 已销毁.");
    view.flush();
    const copy = document.createElement("canvas");
    copy.width = view.canvas.width;
    copy.height = view.canvas.height;
    const context = copy.getContext("2d")!;
    context.drawImage(view.canvas, 0, 0);
    const x = Math.floor((screen[0] * copy.width) / view.viewport.cssSize[0]);
    const y = Math.floor((screen[1] * copy.height) / view.viewport.cssSize[1]);
    return [...context.getImageData(x, y, 1, 1).data];
  },
  dispose() {
    generation++;
    stopSimulation();
    observer?.dispose();
    observer = undefined;
    devices.forEach((device) => device.dispose());
    devices = [];
    view?.dispose();
    debug.ready = false;
  },
};
(window as any).__WEBGUI_DEMO__ = debug;

element("apply").addEventListener("click", () => {
  void createScene().catch(report);
});
element("running").addEventListener("change", () => setRunning(element<HTMLInputElement>("running").checked));
for (const id of ["frequency", "moving-ratio", "label-frequency"])
  element(id).addEventListener("change", () => {
    config = {
      ...config,
      updateHz: numberValue("frequency", 1, 60),
      movingRatio: numberValue("moving-ratio", 0, 100) / 100,
      labelChangeHz: numberValue("label-frequency", 0, 30),
    };
    observer?.setConfig(config);
    setRunning(element<HTMLInputElement>("running").checked);
  });
element("sampling").addEventListener("change", () => observer?.setEnabled(element<HTMLInputElement>("sampling").checked));
element("sample-reset").addEventListener("click", () => observer?.reset());
element("sample-copy").addEventListener("click", () => {
  const field = element<HTMLTextAreaElement>("summary-copy");
  field.hidden = false;
  field.value = JSON.stringify(debug.summary(), null, 2);
  field.focus();
  field.select();
  if (navigator.clipboard) void navigator.clipboard.writeText(field.value).catch(() => {});
});
element("peer-toggle").addEventListener("click", () => {
  void createPeer().catch(report);
});
element("dispose").addEventListener("click", () => {
  debug.dispose();
  element("status").textContent = "主视口已销毁";
});
for (const id of ["picking-enabled", "pick-layers"]) element(id).addEventListener("change", applyPickPolicy);
element("hit-mode").addEventListener("change", () => {
  const mode = element<HTMLSelectElement>("hit-mode").value;
  handles.get("fixture-ring")?.update({ hit: { mode: mode === "bounds" ? "bounds" : "visible" } });
  handles.get("hole-underlay")?.update({ hit: { priority: mode === "priority" ? 100 : 0 } });
});
element("tolerance").addEventListener("change", () => handles.get("fixture-dash")?.update({ hit: { tolerancePx: numberValue("tolerance", 0, 30) } }));
element("text-update").addEventListener("click", () => {
  const label = handles.get("fixture-text") as any;
  label?.setText(`中文 新标签\n设备 ${String(++textRevision).padStart(3, "0")}`);
});
element("checks-run").addEventListener("click", () => {
  void runChecks().catch(report);
});
const statisticsTimer = setInterval(() => {
  if (view && !view.disposed) element("stats").textContent = JSON.stringify(debug.summary(), null, 2);
}, 500);
const cleanup = () => {
  clearInterval(statisticsTimer);
  debug.dispose();
  peer?.dispose();
};
window.addEventListener("pagehide", cleanup, { once: true });
if (import.meta.hot) import.meta.hot.dispose(cleanup);
void createScene().catch(report);
