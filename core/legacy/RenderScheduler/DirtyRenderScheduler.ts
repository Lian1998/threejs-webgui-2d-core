// 创建按需渲染调度器
// const renderScheduler = new DirtyRenderScheduler({
//   renderer,
//   passes: [
//     {
//       name: "BaseMap",
//       scene: ThreejsGroups.BaseMap,
//       camera: orthoCamera,
//       autoClear: true,
//       autoClearColor: true,
//       autoClearDepth: true,
//       autoClearStencil: true,
//     },
//     {
//       name: "Meshes",
//       scene: ThreejsGroups.Meshes,
//       camera: orthoCamera,
//       autoClear: false,
//       autoClearColor: false,
//       autoClearDepth: true,
//       autoClearStencil: true,
//     },
//   ],
// });
// renderScheduler.bindControls(mapControls as any);

import * as THREE from "three";

export type DirtyRenderReason = string | undefined;

/** 单次真实渲染帧的上下文, 供业务系统/调试系统在渲染前同步状态。 */
export interface DirtyRenderFrame {
  deltaTime: number;
  elapsedTime: number;
  /** 本帧由哪些 invalidate 触发, 主要用于调试和性能定位。 */
  reasons: DirtyRenderReason[];
}

/**
 * 一个渲染通道。
 * 例如底图和动态图元可以拆成两个 pass, 共享同一个 renderer/camera,
 * 但分别控制 clear 行为和 beforeRender/afterRender 钩子。
 */
export interface DirtyRenderPass {
  name?: string;
  scene: THREE.Object3D;
  camera: THREE.Camera;
  autoClear?: boolean;
  autoClearColor?: boolean;
  autoClearDepth?: boolean;
  autoClearStencil?: boolean;
  beforeRender?: (renderer: THREE.WebGLRenderer, frame: DirtyRenderFrame, pass: DirtyRenderPass, index: number) => void;
  afterRender?: (renderer: THREE.WebGLRenderer, frame: DirtyRenderFrame, pass: DirtyRenderPass, index: number) => void;
}

export interface DirtyRenderSchedulerParameters {
  renderer: THREE.WebGLRenderer;
  passes?: DirtyRenderPass[];
  continuous?: boolean;
  setAsDefault?: boolean;
}

type Disposable = () => void;

/**
 * 按需渲染调度器。
 *
 * 核心思路:
 * 1. 业务代码、GUI、拾取、WebSocket 更新只需要调用 invalidate(reason) 标记“画面脏了”。
 * 2. 多次 invalidate 会被合并到同一个 requestAnimationFrame, 避免一次数据更新触发多次 render。
 * 3. 默认不持续 RAF, 只有开启 continuous 后才逐帧渲染, 适合阻尼控制器或动画播放。
 */
export class DirtyRenderScheduler {
  /** 项目内大多数 setter 只需要触发默认调度器, 避免层层传 renderer。 */
  static default: DirtyRenderScheduler | undefined;

  static setDefault(scheduler: DirtyRenderScheduler | undefined): void {
    DirtyRenderScheduler.default = scheduler;
  }

  static invalidateDefault(reason?: DirtyRenderReason): void {
    DirtyRenderScheduler.default?.invalidate(reason);
  }

  readonly renderer: THREE.WebGLRenderer;
  readonly passes: DirtyRenderPass[] = [];

  private readonly clock = new THREE.Clock();
  private readonly frameListeners = new Set<(frame: DirtyRenderFrame) => void>();
  private readonly disposables: Disposable[] = [];
  /** Set 用来合并同一帧内的重复 reason, 也避免 reason 列表无限增长。 */
  private readonly reasons = new Set<DirtyRenderReason>();
  private rafId = 0;
  /** scheduled 为 true 表示已经有一个 RAF 在路上, 此时不再重复申请。 */
  private scheduled = false;
  private disposed = false;
  private continuous = false;

  constructor(parameters: DirtyRenderSchedulerParameters) {
    this.renderer = parameters.renderer;
    this.passes.push(...(parameters.passes ?? []));
    this.continuous = parameters.continuous ?? false;

    if (parameters.setAsDefault ?? true) DirtyRenderScheduler.setDefault(this);
    this.invalidate("init");
  }

  addPass(pass: DirtyRenderPass): this {
    this.passes.push(pass);
    this.invalidate("add-pass");
    return this;
  }

  removePass(pass: DirtyRenderPass): this {
    const index = this.passes.indexOf(pass);
    if (index >= 0) {
      this.passes.splice(index, 1);
      this.invalidate("remove-pass");
    }
    return this;
  }

  addFrameListener(listener: (frame: DirtyRenderFrame) => void): Disposable {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  /** 绑定 Three.js 控制器的 change 事件, 地图平移/缩放/旋转后自动补一帧。 */
  bindControls(controls: THREE.EventDispatcher<{ change: { type: "change" } }>): Disposable {
    const listener = () => this.invalidate("controls");
    controls.addEventListener("change", listener);
    const dispose = () => controls.removeEventListener("change", listener);
    this.disposables.push(dispose);
    return dispose;
  }

  /** 绑定任意 DOM 事件到 invalidate, 用于 resize、主题切换等外部信号。 */
  bindEventTarget(target: EventTarget, eventName: string, reason = eventName): Disposable {
    const listener = () => this.invalidate(reason);
    target.addEventListener(eventName, listener);
    const dispose = () => target.removeEventListener(eventName, listener);
    this.disposables.push(dispose);
    return dispose;
  }

  /**
   * 开启后等价于传统 animate loop。
   * 默认保持关闭, 工业 GUI 大多数时间画面静止, 按需渲染更省 CPU/GPU。
   */
  setContinuous(value: boolean): this {
    if (this.continuous === value) return this;
    this.continuous = value;
    if (value) this.invalidate("continuous");
    return this;
  }

  /** 标记画面变脏, 并把实际 render 延迟到下一帧统一执行。 */
  invalidate(reason?: DirtyRenderReason): void {
    if (this.disposed) return;
    this.reasons.add(reason);
    if (this.scheduled) return;

    this.scheduled = true;
    this.rafId = window.requestAnimationFrame(() => this.onAnimationFrame());
  }

  /** 少数情况下需要立即渲染, 例如截图前或测试断言前。 */
  renderNow(extraReason?: DirtyRenderReason): void {
    if (this.disposed) return;
    if (extraReason !== undefined) this.reasons.add(extraReason);
    this.renderFrame();
  }

  /** 释放所有外部事件绑定, 防止调试热更新或页面销毁后遗留监听。 */
  dispose(): void {
    this.disposed = true;
    if (this.rafId) window.cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.scheduled = false;

    for (const dispose of this.disposables.splice(0)) dispose();
    this.frameListeners.clear();
    this.passes.length = 0;

    if (DirtyRenderScheduler.default === this) DirtyRenderScheduler.default = undefined;
  }

  private onAnimationFrame(): void {
    this.rafId = 0;
    this.scheduled = false;
    this.renderFrame();
    if (this.continuous) this.invalidate("continuous");
  }

  private renderFrame(): void {
    const frame: DirtyRenderFrame = {
      deltaTime: this.clock.getDelta(),
      elapsedTime: this.clock.elapsedTime,
      reasons: Array.from(this.reasons),
    };
    this.reasons.clear();

    for (const listener of this.frameListeners) listener(frame);

    const renderer = this.renderer;
    // 每个 pass 可能修改 renderer 的 clear 开关, 渲染结束后恢复调用前状态。
    const prevAutoClear = renderer.autoClear;
    const prevAutoClearColor = renderer.autoClearColor;
    const prevAutoClearDepth = renderer.autoClearDepth;
    const prevAutoClearStencil = renderer.autoClearStencil;

    for (let i = 0; i < this.passes.length; i++) {
      const pass = this.passes[i];
      // pass 未指定的字段保持上一个 renderer 状态, 便于只覆盖关心的选项。
      if (pass.autoClear !== undefined) renderer.autoClear = pass.autoClear;
      if (pass.autoClearColor !== undefined) renderer.autoClearColor = pass.autoClearColor;
      if (pass.autoClearDepth !== undefined) renderer.autoClearDepth = pass.autoClearDepth;
      if (pass.autoClearStencil !== undefined) renderer.autoClearStencil = pass.autoClearStencil;

      pass.beforeRender?.(renderer, frame, pass, i);
      renderer.render(pass.scene, pass.camera);
      pass.afterRender?.(renderer, frame, pass, i);
    }

    renderer.autoClear = prevAutoClear;
    renderer.autoClearColor = prevAutoClearColor;
    renderer.autoClearDepth = prevAutoClearDepth;
    renderer.autoClearStencil = prevAutoClearStencil;
  }
}
