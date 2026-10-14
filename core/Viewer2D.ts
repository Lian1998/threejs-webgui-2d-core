import * as THREE from "three";
import type { ColorInput, ResourceLease, Vec2 } from "./contracts";
import { BatchManager } from "./batches/BatchManager";
import { EntityRegistry } from "./composition/EntityRegistry";
import { LayerManager } from "./layers/LayerManager";
import { PrimitiveFactory } from "./primitives/PrimitiveFactory";
import { PrimitiveRegistry } from "./primitives/PrimitiveRegistry";
import { FrameScheduler } from "./scheduler/FrameScheduler";
import { ResourceStore } from "./resources/ResourceStore";
import { SpriteAtlas, type SpriteImageSource, type SpriteRegion } from "./resources/sprites/SpriteAtlas";
import { FontStore, type FontSource } from "./resources/fonts/FontStore";
import { GlyphAtlas } from "./resources/fonts/GlyphAtlas";
import { SpriteBatchBackend } from "./render/sprites/SpriteBatchBackend";
import { TextBatchBackend } from "./render/text/TextBatchBackend";
import { PolygonBatchBackend } from "./render/polygons/PolygonBatchBackend";
import { LineBatchBackend } from "./render/lines/LineBatchBackend";
import { GpuPicker } from "./picking/GpuPicker";
import { InteractionController } from "./interaction/InteractionController";
import { MotionController } from "./motion/MotionController";
import { Viewport2D } from "./viewport/Viewport2D";
import type { CameraAdapter } from "./viewport/OrthographicCameraAdapter";

export interface Viewer2DOptions {
  container: HTMLElement;
  background?: ColorInput;
  maxDpr?: number;
  center?: Vec2;
  scale?: number;
  controls?: boolean;
  cameraAdapter?: CameraAdapter;
  debug?: { gui?: boolean };
  onError?: (error: unknown) => void;
}
export interface ViewerStats {
  frames: number;
  colorCalls: number;
  pickCalls: number;
  frameCpuMs: number;
  updateCpuMs: number;
  colorCpuMs: number;
  uploadedBytes: number;
  uploadRanges: number;
  rebuiltBatches: number;
  batchCount: number;
  batchUtilization: number;
  activeMotionCount: number;
}

/** 业务仅管理逻辑图元. renderer, 资源, 帧循环和拾取全部按 Viewer 组合与释放. */
export class Viewer2D {
  readonly canvas: HTMLCanvasElement;
  readonly viewport: Viewport2D;
  readonly scheduler: FrameScheduler;
  readonly registry = new PrimitiveRegistry();
  readonly layers: LayerManager;
  readonly primitives: PrimitiveFactory;
  readonly motion: MotionController;
  readonly entities = new EntityRegistry();
  readonly picking: GpuPicker;
  readonly interaction: InteractionController;
  readonly resources: {
    sprites: { register(source: SpriteImageSource): Promise<void>; unregister(id: string): void };
    fonts: { register(source: FontSource): Promise<void>; unregister(id: string): void };
  };
  private renderer: THREE.WebGLRenderer;
  private resourceStore: ResourceStore;
  private spriteAtlas: SpriteAtlas;
  private glyphAtlas: GlyphAtlas;
  private batches: BatchManager;
  private textBackend: TextBatchBackend;
  private preloaded = new Map<string, ResourceLease<SpriteRegion>>();
  private imageRequests = new Map<string, object>();
  private cleanups: (() => void)[] = [];
  private debugCleanup?: () => void;
  private disposal = new Set<() => void>();
  private disposedValue = false;
  private contextLost = false;
  private lastUpload = { bytes: 0, ranges: 0, rebuiltBatches: 0 };
  private frameStart = 0;
  private statsValue: ViewerStats = {
    frames: 0,
    colorCalls: 0,
    pickCalls: 0,
    frameCpuMs: 0,
    updateCpuMs: 0,
    colorCpuMs: 0,
    uploadedBytes: 0,
    uploadRanges: 0,
    rebuiltBatches: 0,
    batchCount: 0,
    batchUtilization: 0,
    activeMotionCount: 0,
  };

  constructor(private options: Viewer2DOptions) {
    const container = options.container;
    if (!container) throw new Error("Viewer2D 需要有效 container.");
    this.canvas = container.ownerDocument.createElement("canvas");
    this.canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;border:0;outline:none";
    this.canvas.tabIndex = 0;
    // 构造途中失败时按相反顺序释放已创建模块, 不遗留 canvas, observer 或 RAF.
    const initialized: (() => void)[] = [];
    const own = <T extends { dispose(): void }>(value: T): T => {
      initialized.push(() => value.dispose());
      return value;
    };
    try {
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: true,
          powerPreference: "high-performance",
        });
      } catch (error) {
        throw new Error(`无法创建 WebGL2 视口: ${error instanceof Error ? error.message : String(error)}`);
      }
      own(this.renderer);
      container.appendChild(this.canvas);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.setClearColor(options.background ?? "#17242b", 1);
      this.renderer.info.autoReset = false;
      const invalidate = () => {
        if (!this.disposedValue) this.scheduler?.invalidate("viewer");
      };
      this.viewport = own(
        new Viewport2D(this.canvas, {
          container,
          center: options.center,
          scale: options.scale,
          controls: options.controls,
          dprLimit: options.maxDpr,
          cameraAdapter: options.cameraAdapter,
          onResize: (size, dpr) => {
            this.renderer.setPixelRatio(dpr);
            this.renderer.setSize(Math.max(1, size[0]), Math.max(1, size[1]), false);
            invalidate();
          },
        }),
      );
      this.layers = own(new LayerManager(this.registry, invalidate));
      this.resourceStore = own(new ResourceStore({ invalidate, onError: (error) => this.report(error) }));
      this.spriteAtlas = own(new SpriteAtlas(this.resourceStore, { invalidate, maxTextureSize: this.renderer.capabilities.maxTextureSize }));
      this.glyphAtlas = own(
        new GlyphAtlas(new FontStore(this.resourceStore), {
          invalidate,
          maxTextureSize: this.renderer.capabilities.maxTextureSize,
        }),
      );
      this.batches = own(new BatchManager(this.registry, this.layers));
      this.textBackend = new TextBatchBackend(this.glyphAtlas, invalidate);
      this.batches.register(new PolygonBatchBackend());
      this.batches.register(new LineBatchBackend());
      this.batches.register(new SpriteBatchBackend(this.spriteAtlas, invalidate));
      this.batches.register(this.textBackend);
      this.scheduler = own(
        new FrameScheduler(
          {
            flushUpdates: () => this.flushUpdates(),
            renderColor: () => this.renderColor(),
            afterRender: () => {
              this.interaction?.afterFrame();
              this.collectFrameStats();
              this.statsValue.frameCpuMs = performance.now() - this.frameStart;
            },
          },
          { onError: (error) => this.report(error) },
        ),
      );
      // 在 MotionController 注册之前计时, updateCpuMs 同时包含插帧和批次同步成本.
      this.cleanups.push(
        this.scheduler.onFrame(() => {
          this.frameStart = performance.now();
        }),
      );
      this.primitives = new PrimitiveFactory(
        this.registry,
        this.layers,
        (handle) => this.batches.prepare(handle),
        invalidate,
        (error) => this.report(error),
      );
      this.motion = own(new MotionController(this.scheduler));
      this.picking = own(
        new GpuPicker(this.renderer, this.viewport, this.batches, this.registry, this.layers, () => {
          if (!this.scheduler.isRunning) this.scheduler.flushNow();
        }),
      );
      this.interaction = own(
        new InteractionController(this.canvas, {
          registry: this.registry,
          layers: this.layers,
          viewport: this.viewport,
          scheduler: this.scheduler,
          picker: this.picking,
          getBounds: (handle) => {
            const scale = this.viewport.state.scale;
            const feature = this.batches.features(scale).find((f) => f.handle === handle);
            return feature ? this.batches.bounds(feature, scale) : undefined;
          },
          onError: (error) => this.report(error),
        }),
      );
      this.resources = {
        sprites: {
          register: (source) => this.registerImage(source),
          unregister: (id) => {
            this.imageRequests.delete(id);
            this.preloaded.get(id)?.release();
            this.preloaded.delete(id);
            this.spriteAtlas.unregister(id);
          },
        },
        fonts: {
          register: (source) => {
            this.assertAlive();
            return this.glyphAtlas.register(source);
          },
          unregister: (id) => this.glyphAtlas.unregister(id),
        },
      };
      this.layers.add({ id: "default", order: 0 });
      this.cleanups.push(
        this.viewport.onChange(() => {
          invalidate();
          this.interaction.revalidate();
        }),
      );
      this.cleanups.push(
        this.layers.onChange(() => {
          this.picking.invalidate();
          this.interaction.revalidate();
        }),
      );
      this.bindContextLifecycle();
      this.scheduler.invalidate("init");
      if (__WEBGUI_DEBUG__ && options.debug?.gui) {
        void import("./dev/gui/attachDebugTools")
          .then(async ({ attachDebugTools }) => {
            if (this.disposedValue) return;
            const tools = attachDebugTools(this);
            if (this.disposedValue) tools?.dispose();
            else this.debugCleanup = tools ? () => tools.dispose() : undefined;
          })
          .catch((error) => this.report(error));
      }
    } catch (error) {
      this.disposedValue = true;
      for (const cleanup of [...this.cleanups.splice(0), ...initialized.reverse()]) {
        try {
          cleanup();
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }
      this.registry.dispose();
      this.entities.dispose();
      this.canvas.remove();
      throw error;
    }
  }
  get disposed(): boolean {
    return this.disposedValue;
  }
  onDispose(listener: () => void): () => void {
    this.assertAlive();
    this.disposal.add(listener);
    return () => this.disposal.delete(listener);
  }
  get stats(): Readonly<ViewerStats> {
    return { ...this.statsValue, frames: this.scheduler.stats.frames, pickCalls: this.picking.stats.calls };
  }
  flush(): void {
    this.assertAlive();
    this.scheduler.flushNow();
  }
  snapshot() {
    return {
      stats: this.stats,
      primitives: this.registry.list().length,
      layers: this.layers.list().length,
      entities: this.entities.list().length,
      sprites: this.spriteAtlas.snapshot(),
      fonts: this.glyphAtlas.snapshot(),
      text: this.textBackend.snapshot(),
      resources: this.resourceStore.snapshot(),
      pick: { ...this.picking.stats },
      viewport: { ...this.viewport.state, cssSize: this.viewport.cssSize, dpr: this.viewport.dpr },
      webgl: {
        revision: THREE.REVISION,
        multiDraw: this.renderer.extensions.has("WEBGL_multi_draw"),
        maxTextureSize: this.renderer.capabilities.maxTextureSize,
      },
    };
  }
  dispose(): void {
    if (this.disposedValue) return;
    this.disposedValue = true;
    for (const listener of [...this.disposal]) {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    }
    this.disposal.clear();
    this.debugCleanup?.();
    this.debugCleanup = undefined;
    this.interaction.dispose();
    this.picking.dispose();
    this.motion.dispose();
    this.scheduler.dispose();
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    this.entities.dispose();
    this.registry.dispose();
    this.batches.dispose();
    this.layers.dispose();
    this.preloaded.forEach((lease) => lease.release());
    this.preloaded.clear();
    this.imageRequests.clear();
    this.glyphAtlas.dispose();
    this.spriteAtlas.dispose();
    this.resourceStore.dispose();
    this.viewport.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
  private async registerImage(source: SpriteImageSource): Promise<void> {
    this.assertAlive();
    this.spriteAtlas.register(source);
    if (this.preloaded.has(source.id)) return;
    const token = {};
    this.imageRequests.set(source.id, token);
    const lease = await this.spriteAtlas.acquire(source.id);
    if (this.disposedValue || this.imageRequests.get(source.id) !== token) {
      lease.release();
      return;
    }
    this.preloaded.get(source.id)?.release();
    this.preloaded.set(source.id, lease);
    this.imageRequests.delete(source.id);
  }
  private flushUpdates(): void {
    if (!this.viewport.drawable || this.contextLost) return;
    // 变更通知中的业务写入也先合入逻辑状态, 再生成本帧颜色/拾取共用的数据.
    this.registry.flushChanges();
    if (this.disposedValue || this.contextLost) return;
    const buffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.batches.build({
      pass: "color",
      scale: this.viewport.state.scale,
      dpr: this.viewport.dpr,
      cssSize: this.viewport.cssSize,
      drawingBufferSize: [buffer.x, buffer.y],
    });
    this.statsValue.updateCpuMs = performance.now() - this.frameStart;
  }
  private collectFrameStats(): void {
    // hover 的 pick 批次也可能首次分配/上传, 在颜色与拾取提交后统一累计本帧字节.
    const current = this.batches.statistics();
    this.statsValue.uploadedBytes = current.bytes - this.lastUpload.bytes;
    this.statsValue.uploadRanges = current.ranges - this.lastUpload.ranges;
    this.statsValue.rebuiltBatches = current.rebuiltBatches - this.lastUpload.rebuiltBatches;
    this.lastUpload = current;
    this.statsValue.batchCount = current.batches;
    this.statsValue.batchUtilization = current.utilization;
    this.statsValue.activeMotionCount = this.motion.activeCount;
  }
  private renderColor(): void {
    if (!this.viewport.drawable || this.contextLost) {
      this.statsValue.colorCalls = 0;
      return;
    }
    const started = performance.now();
    this.renderer.info.reset();
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.batches.colorScene, this.viewport.camera);
    this.statsValue.colorCalls = this.renderer.info.render.calls;
    this.statsValue.colorCpuMs = performance.now() - started;
  }
  private bindContextLifecycle(): void {
    const lost = (event: Event) => {
      event.preventDefault();
      this.contextLost = true;
      this.picking.contextLost();
      this.scheduler.setPaused(true);
    };
    const restored = () => {
      if (this.disposedValue) return;
      this.contextLost = false;
      // r170 重建 WebGLBackground 后 clearColor 回到默认值, 恢复 Viewer 的业务背景.
      this.renderer.setClearColor(this.options.background ?? "#17242b", 1);
      this.batches.contextRestored();
      this.picking.contextRestored();
      this.scheduler.setPaused(this.canvas.ownerDocument.hidden);
      this.scheduler.invalidate("context-restored");
    };
    const visibility = () => this.scheduler.setPaused(this.contextLost || this.canvas.ownerDocument.hidden);
    this.canvas.addEventListener("webglcontextlost", lost);
    this.canvas.addEventListener("webglcontextrestored", restored);
    this.canvas.ownerDocument.addEventListener("visibilitychange", visibility);
    this.cleanups.push(() => {
      this.canvas.removeEventListener("webglcontextlost", lost);
      this.canvas.removeEventListener("webglcontextrestored", restored);
      this.canvas.ownerDocument.removeEventListener("visibilitychange", visibility);
    });
  }
  private assertAlive(): void {
    if (this.disposedValue) throw new Error("Viewer2D 已销毁.");
  }
  private report(error: unknown): void {
    if (this.disposedValue) return;
    if (this.options.onError) this.options.onError(error);
    else console.error(error);
  }
}
