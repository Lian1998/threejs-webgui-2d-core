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

/**
 * 帧调度器(不依赖 Three.js)  
 * GUI制作时存在相机变化(MotionController.invalidate), 模型/状态变化(PrimitiveFactory.invalidate)时才进行渲染操作, 避免重复渲染(静态查看时不会持续消耗GPU)  
 * 保证一个 Viewer 共用一个 Clock 和 RAF, 在同一次 RAF 中合并标脏(invalidate)  
 *
 * run函数中:  
 * 优先运行 onFrame 接口以同步动画更新, flushUpdates(绑定上下文中注册)同步所有的逻辑状态, renderColor执行绘制, 最后调用afterFrame.  
 * 脏更新或持续帧令牌存在时继续排帧 */
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

  /** 标脏 */
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

  /**
   * 连续渲染
   * ```javascript
   * const stopBlinking = scheduler.acquireContinuous("blink");
   * stopBlinking();
   * ``` */
  acquireContinuous(_reason: string): () => void {
    if (this.disposed) throw new Error("FrameScheduler has been disposed");
    // 申请一个连续渲染令牌, 只要令牌存在, 帧调度器每一帧结束后就会继续调度下一帧
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

  /** 立即渲染
   * 正常情况需要等待浏览器的下一次 RAF  
   * 但某些操作需要立即更新画面: 点击后立即同步当前画面(Interaction) 拖拽前更新相机姿态 确保渲染完成后再执行下一步同步逻辑(拾取)  
   */
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

  /** 暂停与恢复 */
  setPaused(paused: boolean): void {
    if (this.disposed || this.paused === paused) return;
    this.paused = paused; // 停止调度新帧
    if (paused) {
      if (this.rafId !== undefined) this.cancelFrame(this.rafId); // 取消已经排队的 RAF
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

  /** 排帧 */
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

  /** 核心执行逻辑: 浏览器通知开始新的一帧, 更新动画/相机/时间的相关状态, 同步所有待处理的逻辑更新, 绘制当前场景, 执行渲染完成之后的回调函数, 通知观察者 */
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
