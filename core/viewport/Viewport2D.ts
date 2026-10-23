import type { Vec2 } from "../contracts";
import type { Camera } from "three";
import { OrthographicCameraAdapter, type CameraAdapter, type ViewState } from "./OrthographicCameraAdapter";

export interface ViewportOptions {
  container?: HTMLElement;
  center?: Vec2;
  scale?: number;
  minScale?: number;
  maxScale?: number;
  dprLimit?: number;
  controls?: boolean;
  cameraHeight?: number;
  cameraAdapter?: CameraAdapter;
  onResize?: (cssSize: Vec2, dpr: number) => void;
}

interface DragState {
  pointerId: number;
  start: Vec2;
  center: Vec2;
  moved: boolean;
}

function finitePair(value: Vec2): void {
  if (value.length !== 2 || !value.every(Number.isFinite)) throw new Error("Expected two finite coordinates");
}

/** 维护 CSS 尺寸, DPR, 中心和每米像素数, 并处理平移缩放.
 * 相机换算交给 CameraAdapter, renderer 的实际 drawing buffer 尺寸由 onResize 同步. */
export class Viewport2D {
  readonly adapter: CameraAdapter;
  readonly camera: Camera;
  private view: ViewState;
  private size: Vec2 = [0, 0];
  private pixelRatio = 1;
  private readonly listeners = new Set<() => void>();
  private readonly cleanups: Array<() => void> = [];
  private readonly container: HTMLElement;
  private readonly minScale: number;
  private readonly maxScale: number;
  private readonly dprLimit: number;
  private observer?: ResizeObserver;
  private media?: MediaQueryList;
  private drag?: DragState;
  private disposed = false;
  private revisionValue = 0;
  private lastPanTime = -Infinity;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly options: ViewportOptions = {},
  ) {
    this.container = options.container ?? canvas.parentElement ?? canvas;
    this.minScale = options.minScale ?? 0.01;
    this.maxScale = options.maxScale ?? 10_000;
    this.dprLimit = options.dprLimit ?? 2;
    if (![this.minScale, this.maxScale, this.dprLimit].every(Number.isFinite) || this.minScale <= 0 || this.maxScale < this.minScale || this.dprLimit <= 0) {
      throw new Error("Invalid viewport scale or DPR limits");
    }
    const center = options.center ?? [0, 0];
    finitePair(center);
    const scale = options.scale ?? 10;
    if (!Number.isFinite(scale) || scale <= 0) throw new Error("View scale must be positive");
    this.view = { center: [...center], scale: this.clampScale(scale) };
    this.adapter = options.cameraAdapter ?? new OrthographicCameraAdapter(options.cameraHeight);
    this.camera = this.adapter.camera;
    try {
      if (typeof ResizeObserver !== "undefined") {
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(this.container);
      }
      const win = canvas.ownerDocument.defaultView;
      if (win) {
        this.listen(win, "resize", () => this.resize());
        this.watchDpr();
      }
      if (options.controls !== false) this.bindControls();
      this.resize();
    } catch (error) {
      // 初始化回调或注入相机失败时, 不能留下 observer/窗口监听或触摸样式.
      this.dispose();
      throw error;
    }
  }

  get state(): Readonly<ViewState> {
    return { center: [...this.view.center], scale: this.view.scale };
  }
  get cssSize(): Vec2 {
    return [...this.size];
  }
  get dpr(): number {
    return this.pixelRatio;
  }
  get revision(): number {
    return this.revisionValue;
  }
  get drawable(): boolean {
    return this.size[0] > 0 && this.size[1] > 0;
  }
  get isPanning(): boolean {
    return this.drag?.moved ?? false;
  }

  /** 交互层用同一手势状态阻止平移结束后的 click. */
  wasRecentlyPanning(durationMs = 100): boolean {
    return this.isPanning || performance.now() - this.lastPanTime < durationMs;
  }

  setView(patch: Partial<ViewState>): void {
    this.assertAlive();
    const center = patch.center ?? this.view.center;
    const scale = patch.scale ?? this.view.scale;
    finitePair(center);
    if (!Number.isFinite(scale) || scale <= 0) throw new Error("View scale must be positive");
    const nextScale = this.clampScale(scale);
    if (center[0] === this.view.center[0] && center[1] === this.view.center[1] && nextScale === this.view.scale) return;
    this.view = { center: [...center], scale: nextScale };
    this.changed();
  }

  fitBounds(bounds: readonly [Vec2, Vec2], paddingPx = 24): void {
    this.assertAlive();
    finitePair(bounds[0]);
    finitePair(bounds[1]);
    if (!Number.isFinite(paddingPx) || paddingPx < 0) throw new Error("Padding must be non-negative");
    const width = bounds[1][0] - bounds[0][0];
    const height = bounds[1][1] - bounds[0][1];
    if (width < 0 || height < 0) throw new Error("Bounds min must not exceed max");
    const availableWidth = Math.max(1, this.size[0] - paddingPx * 2);
    const availableHeight = Math.max(1, this.size[1] - paddingPx * 2);
    this.setView({
      center: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2],
      scale: Math.min(availableWidth / Math.max(width, 0.1), availableHeight / Math.max(height, 0.1)),
    });
  }

  screenToWorld(screen: Vec2): Vec2 {
    finitePair(screen);
    return this.adapter.screenToWorld(screen);
  }
  worldToScreen(world: Vec2): Vec2 {
    finitePair(world);
    return this.adapter.worldToScreen(world);
  }

  clientToScreen(client: Vec2): Vec2 {
    finitePair(client);
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return [-Infinity, -Infinity];
    return [((client[0] - rect.left) * this.size[0]) / rect.width, ((client[1] - rect.top) * this.size[1]) / rect.height];
  }

  onChange(listener: () => void): () => void {
    this.assertAlive();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  resize(): void {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const dpr = Math.min(this.dprLimit, this.canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1);
    if (width === this.size[0] && height === this.size[1] && dpr === this.pixelRatio) return;
    this.size = [width, height];
    this.pixelRatio = dpr;
    this.options.onResize?.(this.cssSize, dpr);
    this.changed();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.finishDrag();
    this.observer?.disconnect();
    this.media?.removeEventListener("change", this.onDprChange);
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.listeners.clear();
  }

  private changed(): void {
    this.adapter.update(this.view, this.size);
    this.revisionValue++;
    for (const listener of [...this.listeners])
      if (this.listeners.has(listener)) {
        try {
          listener();
        } catch (error) {
          console.error(error);
        }
      }
  }

  private clampScale(scale: number): number {
    return Math.min(this.maxScale, Math.max(this.minScale, scale));
  }
  private assertAlive(): void {
    if (this.disposed) throw new Error("Viewport2D has been disposed");
  }

  private listen(target: EventTarget, name: string, listener: EventListener, options?: AddEventListenerOptions): void {
    target.addEventListener(name, listener, options);
    this.cleanups.push(() => target.removeEventListener(name, listener, options));
  }

  private readonly onDprChange = (): void => {
    this.watchDpr();
    this.resize();
  };

  private watchDpr(): void {
    this.media?.removeEventListener("change", this.onDprChange);
    const win = this.canvas.ownerDocument.defaultView;
    if (!win?.matchMedia) return;
    this.media = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
    this.media.addEventListener("change", this.onDprChange);
  }

  private bindControls(): void {
    const previousTouchAction = this.canvas.style.touchAction;
    this.canvas.style.touchAction = "none";
    this.cleanups.push(() => {
      this.canvas.style.touchAction = previousTouchAction;
    });
    this.listen(this.canvas, "pointerdown", ((event: PointerEvent) => {
      if (event.button !== 0 || !this.drawable || this.drag) return;
      this.drag = {
        pointerId: event.pointerId,
        start: this.clientToScreen([event.clientX, event.clientY]),
        center: [...this.view.center],
        moved: false,
      };
      this.canvas.setPointerCapture(event.pointerId);
    }) as EventListener);
    this.listen(this.canvas, "pointermove", ((event: PointerEvent) => {
      const drag = this.drag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const point = this.clientToScreen([event.clientX, event.clientY]);
      const dx = point[0] - drag.start[0];
      const dy = point[1] - drag.start[1];
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;
      drag.moved = true;
      this.setView({ center: [drag.center[0] - dx / this.view.scale, drag.center[1] + dy / this.view.scale] });
    }) as EventListener);
    const stop = ((event: PointerEvent) => {
      if (this.drag?.pointerId === event.pointerId) this.finishDrag();
    }) as EventListener;
    this.listen(this.canvas, "pointerup", stop);
    this.listen(this.canvas, "pointercancel", stop);
    this.listen(this.canvas, "lostpointercapture", stop);
    this.listen(
      this.canvas,
      "wheel",
      ((event: WheelEvent) => {
        if (!this.drawable) return;
        event.preventDefault();
        const point = this.clientToScreen([event.clientX, event.clientY]);
        const before = this.screenToWorld(point);
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.size[1] : 1);
        const scale = this.clampScale(this.view.scale * Math.exp(Math.max(-4, Math.min(4, -delta * 0.001))));
        // 缩放和平移合成一次状态提交, 光标下世界点保持不动.
        this.setView({
          scale,
          center: [before[0] - (point[0] - this.size[0] / 2) / scale, before[1] + (point[1] - this.size[1] / 2) / scale],
        });
        this.finishDrag();
      }) as EventListener,
      { passive: false },
    );
  }

  private finishDrag(): void {
    if (!this.drag) return;
    const drag = this.drag;
    this.drag = undefined;
    if (drag.moved) this.lastPanTime = performance.now();
    if (this.canvas.hasPointerCapture(drag.pointerId)) this.canvas.releasePointerCapture(drag.pointerId);
  }
}
