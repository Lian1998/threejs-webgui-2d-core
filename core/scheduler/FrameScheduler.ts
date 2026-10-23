export interface FrameInfo {
  nowMs: number;
  deltaMs: number;
}

export interface FramePipeline {
  flushUpdates(): void;
  renderColor(): void;
  afterRender?(): void;
}

export interface FrameSchedulerOptions {
  now?: () => number;
  requestFrame?: (callback: (time: number) => void) => number;
  cancelFrame?: (id: number) => void;
  onError?: (error: unknown) => void;
}

/** 一个 Viewer 共用一个时钟和 RAF, 合并同帧 invalidate.
 * onFrame 更新动画, flushUpdates 同步逻辑状态, renderColor 绘制, 最后通知 afterFrame.
 * 只有脏更新或持续帧令牌存在时继续排帧, 本类本身不依赖 Three.js. */
export class FrameScheduler {
  private readonly listeners = new Set<(frame: FrameInfo) => void>();
  private readonly afterFrameListeners = new Set<(frame: FrameInfo) => void>();
  private readonly continuous = new Set<symbol>();
  private readonly clock: () => number;
  private readonly requestFrame: NonNullable<FrameSchedulerOptions["requestFrame"]>;
  private readonly cancelFrame: NonNullable<FrameSchedulerOptions["cancelFrame"]>;
  private readonly onError?: (error: unknown) => void;
  private rafId: number | undefined;
  private dirty = false;
  private running = false;
  private deferredFlush = false;
  private paused = false;
  private disposed = false;
  private previousMs: number | undefined;
  readonly stats = { frames: 0, flushes: 0, renders: 0 };

  constructor(
    private readonly pipeline: FramePipeline,
    options: FrameSchedulerOptions = {},
  ) {
    this.clock = options.now ?? (() => performance.now());
    this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    this.cancelFrame = options.cancelFrame ?? ((id) => cancelAnimationFrame(id));
    this.onError = options.onError;
  }

  now(): number {
    return this.clock();
  }

  invalidate(_reason?: string): void {
    if (this.disposed) return;
    this.dirty = true;
    this.schedule();
  }

  onFrame(listener: (frame: FrameInfo) => void): () => void {
    if (this.disposed) throw new Error("FrameScheduler has been disposed");
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 帧管线完成后观察统计. 同一任务多次 flushNow 也分别通知, 不借助额外 RAF/microtask. */
  onAfterFrame(listener: (frame: FrameInfo) => void): () => void {
    if (this.disposed) throw new Error("FrameScheduler has been disposed");
    this.afterFrameListeners.add(listener);
    return () => {
      this.afterFrameListeners.delete(listener);
    };
  }

  acquireContinuous(_reason: string): () => void {
    if (this.disposed) throw new Error("FrameScheduler has been disposed");
    const token = Symbol();
    this.continuous.add(token);
    this.invalidate("continuous");
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.continuous.delete(token);
      if (!this.continuous.size && !this.dirty && this.rafId !== undefined && !this.running) {
        this.cancelFrame(this.rafId);
        this.rafId = undefined;
      }
    };
  }

  /** 点击等操作需要立即同步当前姿态, 不重复消费已经排队的帧. */
  flushNow(): void {
    if (this.disposed || this.paused) return;
    if (this.running) {
      this.deferredFlush = true;
      return;
    }
    if (this.rafId !== undefined) this.cancelFrame(this.rafId);
    this.rafId = undefined;
    this.run(this.now());
  }

  setPaused(paused: boolean): void {
    if (this.disposed || this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      if (this.rafId !== undefined) this.cancelFrame(this.rafId);
      this.rafId = undefined;
    } else {
      // 保留真实时间间隔, 插帧在恢复时按绝对时间追到当前状态.
      this.invalidate("resume");
    }
  }

  get isPaused(): boolean {
    return this.paused;
  }
  get isDisposed(): boolean {
    return this.disposed;
  }
  get isRunning(): boolean {
    return this.running;
  }
  get continuousCount(): number {
    return this.continuous.size;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId !== undefined) this.cancelFrame(this.rafId);
    this.rafId = undefined;
    this.listeners.clear();
    this.afterFrameListeners.clear();
    this.continuous.clear();
    this.dirty = false;
  }

  private schedule(): void {
    if (this.disposed || this.paused || this.running || this.rafId !== undefined) return;
    this.rafId = this.requestFrame(() => {
      this.rafId = undefined;
      try {
        this.run(this.now());
      } catch (error) {
        if (this.onError) this.onError(error);
        else console.error(error);
      }
    });
  }

  private run(nowMs: number): void {
    if (this.disposed || this.paused) return;
    this.running = true;
    this.dirty = false;
    const frame = {
      nowMs,
      deltaMs: this.previousMs === undefined ? 0 : Math.max(0, nowMs - this.previousMs),
    };
    this.previousMs = nowMs;
    try {
      this.stats.frames++;
      for (const listener of [...this.listeners]) {
        if (this.disposed) return;
        if (this.listeners.has(listener)) listener(frame);
      }
      if (this.disposed) return;
      // 动画 listener 的 setter 已由本次 flush 消费, 不为它们额外排一帧.
      this.dirty = false;
      this.pipeline.flushUpdates();
      this.stats.flushes++;
      if (this.disposed || this.paused) return;
      this.pipeline.renderColor();
      this.stats.renders++;
      this.pipeline.afterRender?.();
      for (const listener of [...this.afterFrameListeners]) {
        if (this.disposed) return;
        if (this.afterFrameListeners.has(listener)) listener(frame);
      }
    } finally {
      this.running = false;
      if (this.deferredFlush) {
        this.dirty = true;
        this.deferredFlush = false;
      }
      if (!this.disposed && !this.paused && (this.dirty || this.continuous.size)) this.schedule();
    }
  }
}
