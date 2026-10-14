import * as THREE from "three";
import type { PickQuery, PickResult, RenderFeature, Vec2 } from "../contracts";
import { BatchManager, comparePaint } from "../batches/BatchManager";
import type { LayerManager } from "../layers/LayerManager";
import type { PrimitiveRegistry } from "../primitives/PrimitiveRegistry";
import type { Viewport2D } from "../viewport/Viewport2D";

interface QueryFrame {
  features: RenderFeature[];
  screen: Vec2;
  width: number;
  height: number;
  origin: Vec2;
  bufferSize: Vec2;
  cssSize: Vec2;
  viewportRevision: number;
  layerRevision: number;
  hitRevision: number;
  epoch: number;
  identities: Map<number, { feature: RenderFeature; generation: number }>;
}
function target(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.NoColorSpace,
    samples: 0,
    depthBuffer: false,
    stencilBuffer: false,
  });
}
/** ID 通道共享可见覆盖计算, 只渲染查询附近的小块, 不扫描整张画布. */
export class GpuPicker {
  readonly stats = { passes: 0, calls: 0, cpuMs: 0, readbackMs: 0 };
  private syncTarget = target(1, 1);
  private disposed = false;
  private lost = false;
  private epoch = 0;
  private active = false;
  private cancelPending?: () => void;
  private latest?: {
    screen: Vec2;
    query?: PickQuery;
    resolve: (value: PickResult | undefined) => void;
    reject: (error: unknown) => void;
  };
  constructor(
    private renderer: THREE.WebGLRenderer,
    private viewport: Viewport2D,
    private batches: BatchManager,
    private registry: PrimitiveRegistry,
    private layers: LayerManager,
    private flush: () => void,
  ) {}

  pickAt(screen: Vec2, query?: PickQuery): PickResult | undefined {
    if (this.disposed || this.lost) return;
    this.flush();
    const frame = this.frame(screen, query);
    if (!frame) return;
    this.syncTarget.setSize(frame.width, frame.height);
    const buffer = new Uint8Array(frame.width * frame.height * 4),
      started = performance.now();
    this.render(frame, this.syncTarget, () => {
      const read = performance.now();
      this.renderer.readRenderTargetPixels(this.syncTarget, 0, 0, frame.width, frame.height, buffer);
      this.stats.readbackMs = performance.now() - read;
    });
    this.stats.cpuMs = performance.now() - started;
    return this.result(frame, buffer);
  }
  pickAtAsync(screen: Vec2, query?: PickQuery): Promise<PickResult | undefined> {
    if (this.disposed || this.lost) return Promise.resolve(undefined);
    if (this.active)
      return new Promise((resolve, reject) => {
        this.latest?.resolve(undefined);
        this.latest = { screen: [...screen], query, resolve, reject };
      });
    this.active = true;
    return this.readAsync(screen, query).finally(() => {
      this.active = false;
      this.cancelPending = undefined;
      const latest = this.latest;
      this.latest = undefined;
      if (latest) this.pickAtAsync(latest.screen, latest.query).then(latest.resolve, latest.reject);
    });
  }
  invalidate(): void {
    this.epoch++;
  }
  contextLost(): void {
    this.lost = true;
    this.invalidate();
    this.cancelPending?.();
    this.latest?.resolve(undefined);
    this.latest = undefined;
  }
  contextRestored(): void {
    if (this.disposed) return;
    this.lost = false;
    this.syncTarget.dispose();
    this.syncTarget = target(1, 1);
    this.invalidate();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.contextLost();
    this.syncTarget.dispose();
  }

  private async readAsync(screen: Vec2, query?: PickQuery): Promise<PickResult | undefined> {
    this.flush();
    const frame = this.frame(screen, query);
    if (!frame) return;
    const renderTarget = target(frame.width, frame.height),
      buffer = new Uint8Array(frame.width * frame.height * 4);
    const cancelled = new Promise<undefined>((resolve) => {
      this.cancelPending = () => resolve(undefined);
    });
    let read!: Promise<Uint8Array>;
    const started = performance.now();
    try {
      this.render(frame, renderTarget, () => {
        read = this.renderer.readRenderTargetPixelsAsync(renderTarget, 0, 0, frame.width, frame.height, buffer) as Promise<Uint8Array>;
      });
      // renderer 状态在 render() 的 finally 中已恢复, 不跨 await 持有 pick 材质或 target 状态.
      this.stats.cpuMs = performance.now() - started;
      const result = await Promise.race([read, cancelled]);
      this.stats.readbackMs = performance.now() - started;
      if (!result || this.disposed || this.lost) return;
      return this.result(frame, buffer);
    } finally {
      renderTarget.dispose();
    }
  }
  private frame(screen: Vec2, query?: PickQuery): QueryFrame | undefined {
    if (!this.viewport.drawable || !screen.every(Number.isFinite)) return;
    const cssSize = this.viewport.cssSize,
      size = this.renderer.getDrawingBufferSize(new THREE.Vector2()),
      bufferSize: Vec2 = [size.x, size.y];
    if (screen[0] < 0 || screen[1] < 0 || screen[0] >= cssSize[0] || screen[1] >= cssSize[1]) return;
    const scale = this.viewport.state.scale;
    const features = this.batches.features(scale, query).filter((feature) => {
      if (!feature.pickable || feature.opacity < feature.hit.alphaThreshold) return false;
      const bounds = this.batches.bounds(feature, scale);
      if (!Number.isFinite(bounds[0][0])) return false;
      const a = this.viewport.worldToScreen(bounds[0]),
        b = this.viewport.worldToScreen(bounds[1]);
      const dx = Math.max(Math.min(a[0], b[0]) - screen[0], 0, screen[0] - Math.max(a[0], b[0]));
      const dy = Math.max(Math.min(a[1], b[1]) - screen[1], 0, screen[1] - Math.max(a[1], b[1]));
      return Math.hypot(dx, dy) <= feature.hit.tolerancePx + 1;
    });
    if (!features.length) return;
    const radius = features.reduce((max, feature) => Math.max(max, feature.hit.tolerancePx), 0),
      sx = size.x / cssSize[0],
      sy = size.y / cssSize[1];
    const x = Math.floor(screen[0] * sx),
      yTop = Math.floor(screen[1] * sy),
      rx = Math.ceil(radius * sx),
      ry = Math.ceil(radius * sy);
    const x0 = Math.max(0, x - rx),
      x1 = Math.min(size.x - 1, x + rx),
      y0 = Math.max(0, yTop - ry),
      y1 = Math.min(size.y - 1, yTop + ry);
    const origin: Vec2 = [x0, size.y - 1 - y1];
    return {
      features,
      screen: [...screen],
      width: x1 - x0 + 1,
      height: y1 - y0 + 1,
      origin,
      bufferSize,
      cssSize,
      viewportRevision: this.viewport.revision,
      layerRevision: this.layers.revision,
      hitRevision: this.registry.hitRevision,
      epoch: this.epoch,
      identities: new Map(features.map((feature) => [feature.pickId, { feature, generation: (feature.handle as import("../primitives/PrimitiveHandle").BasePrimitive).generation }])),
    };
  }
  private render(frame: QueryFrame, renderTarget: THREE.WebGLRenderTarget, read: () => void): void {
    const r = this.renderer,
      previousTarget = r.getRenderTarget(),
      scissorTest = r.getScissorTest(),
      clearColor = r.getClearColor(new THREE.Color()).clone(),
      clearAlpha = r.getClearAlpha(),
      autoClear = r.autoClear;
    const gl = r.getContext() as WebGL2RenderingContext;
    const pixelPackBuffer = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING) as WebGLBuffer | null;
    const calls = r.info.render.calls;
    try {
      const scene = this.batches.build(
        {
          pass: "pick",
          scale: this.viewport.state.scale,
          dpr: this.viewport.dpr,
          cssSize: frame.cssSize,
          drawingBufferSize: frame.bufferSize,
          pick: { centerCss: frame.screen, originPx: frame.origin, sizePx: [frame.width, frame.height] },
        },
        frame.features,
      );
      // target.viewport 已经使用物理像素. setViewport 会再乘 renderer DPR, 此处不能重复设置.
      r.setRenderTarget(renderTarget);
      r.setScissorTest(false);
      r.autoClear = false;
      r.setClearColor(0, 0);
      r.clear(true, false, false);
      r.render(scene, this.viewport.camera);
      read();
      this.stats.passes++;
      this.stats.calls += r.info.render.calls - calls;
    } finally {
      // r170 的异步读回在 await 前保留 PBO 绑定. 立即恢复, 让期间的同步点击仍能读入 TypedArray.
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pixelPackBuffer);
      r.setScissorTest(scissorTest);
      r.setRenderTarget(previousTarget);
      r.setClearColor(clearColor, clearAlpha);
      r.autoClear = autoClear;
    }
  }
  private result(frame: QueryFrame, buffer: Uint8Array): PickResult | undefined {
    if (frame.epoch !== this.epoch || frame.viewportRevision !== this.viewport.revision || frame.layerRevision !== this.layers.revision || frame.hitRevision !== this.registry.hitRevision) return;
    let chosen: { feature: RenderFeature; distance: number } | undefined;
    const centerX = Math.floor((frame.screen[0] * frame.bufferSize[0]) / frame.cssSize[0]),
      centerY = frame.bufferSize[1] - 1 - Math.floor((frame.screen[1] * frame.bufferSize[1]) / frame.cssSize[1]);
    for (let y = 0; y < frame.height; y++)
      for (let x = 0; x < frame.width; x++) {
        const offset = (y * frame.width + x) * 4,
          id = buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16),
          identity = frame.identities.get(id);
        if (!identity) continue;
        const handle = this.registry.byPickId(id);
        if (!handle || handle.generation !== identity.generation || handle.disposed) continue;
        const px = x + frame.origin[0],
          py = y + frame.origin[1];
        const distance = px === centerX && py === centerY ? 0 : Math.hypot(((px + 0.5) * frame.cssSize[0]) / frame.bufferSize[0] - frame.screen[0], ((frame.bufferSize[1] - py - 0.5) * frame.cssSize[1]) / frame.bufferSize[1] - frame.screen[1]);
        const feature = identity.feature;
        if (!chosen || feature.hit.priority > chosen.feature.hit.priority || (feature.hit.priority === chosen.feature.hit.priority && (distance < chosen.distance || (distance === chosen.distance && comparePaint(feature, chosen.feature) > 0)))) chosen = { feature, distance };
      }
    if (!chosen) return;
    const o = chosen.feature.options;
    return {
      primitiveId: chosen.feature.handle.id,
      ownerId: o.ownerId,
      partId: o.partId,
      layerId: o.layer,
      screen: frame.screen,
      world: this.viewport.screenToWorld(frame.screen),
    };
  }
}
