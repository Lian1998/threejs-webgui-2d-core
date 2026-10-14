import type { Viewer2D } from "../../Viewer2D";

export interface SceneLoad {
  deviceCount: number;
  movingRatio: number;
  updateHz: number;
  labelsVisible: boolean;
  labelChangeHz: number;
  pipelineCount: number;
  pointsPerPipeline: number;
  dpr: number; // Viewer 的 DPR 上限, 摘要同时显示实际生效值.
  seed: number;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function distribution(values: readonly number[]) {
  if (!values.length) return { samples: 0, median: null, p95: null };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    median: sorted[Math.floor((sorted.length - 1) / 2)],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
  };
}

/** 只观察现有帧, 不增加 RAF. afterFrame 在整帧完成后同步取值, 连续 flushNow 也不丢样本. */
export class PerformanceObserver {
  private readonly stop: () => void;
  private disposed = false;
  private enabled = true;
  private readonly cpu: number[] = [];
  private readonly update: number[] = [];
  private readonly color: number[] = [];
  private readonly intervals: number[] = [];
  private readonly createdAt = performance.now();
  private started = performance.now();
  private readyAt = Infinity;
  private lastFrame = -1;
  private previousMoving = false;
  private uploadBytes = 0;
  private uploadRanges = 0;
  private colorCalls = 0;
  private coldFrames = 0;
  private baselinePick = { calls: 0, passes: 0 };
  private baselineFrames = 0;

  constructor(
    private readonly viewer: Viewer2D,
    public config: Readonly<SceneLoad>,
    private readonly warmupMs = 600,
  ) {
    this.reset();
    this.stop = viewer.scheduler.onAfterFrame((frame) => {
      if (this.disposed || !this.enabled || viewer.disposed) return;
      const stats = viewer.stats;
      if (stats.frames === this.lastFrame) return;
      this.lastFrame = stats.frames;
      if (performance.now() < this.readyAt + this.warmupMs) {
        this.coldFrames++;
        return;
      }
      this.cpu.push(stats.frameCpuMs);
      this.update.push(stats.updateCpuMs);
      this.color.push(stats.colorCpuMs);
      const moving = stats.activeMotionCount > 0;
      if (moving && this.previousMoving && frame.deltaMs > 0 && frame.deltaMs < 250) this.intervals.push(frame.deltaMs);
      this.previousMoving = moving;
      this.uploadBytes += stats.uploadedBytes;
      this.uploadRanges += stats.uploadRanges;
      this.colorCalls += stats.colorCalls;
      // 滚动窗口上限明确, 长时间观察不会无限保存样本.
      for (const values of [this.cpu, this.update, this.color, this.intervals]) if (values.length > 1200) values.shift();
    });
  }
  markReady(): void {
    this.readyAt = performance.now();
  }
  setConfig(config: Readonly<SceneLoad>): void {
    this.config = config;
    this.reset();
  }
  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) this.reset();
  }
  reset(): void {
    this.started = performance.now();
    this.cpu.length = this.update.length = this.color.length = this.intervals.length = 0;
    this.uploadBytes = this.uploadRanges = this.colorCalls = this.coldFrames = 0;
    this.previousMoving = false;
    this.baselineFrames = this.viewer.stats.frames;
    this.baselinePick = { ...this.viewer.snapshot().pick };
  }
  summary() {
    const snapshot = this.viewer.snapshot();
    const interval = distribution(this.intervals);
    return {
      config: { ...this.config },
      sampling: this.enabled,
      durationMs: Math.round(performance.now() - this.started),
      resourceReadyMs: Number.isFinite(this.readyAt) ? Math.round(this.readyAt - this.createdAt) : null,
      cpuWindowMaxFrames: 1200,
      warmed: performance.now() >= this.readyAt + this.warmupMs,
      warmupMs: this.warmupMs,
      excludedColdFrames: this.coldFrames,
      cssSize: snapshot.viewport.cssSize,
      center: snapshot.viewport.center,
      scale: snapshot.viewport.scale,
      drawingBuffer: [this.viewer.canvas.width, this.viewer.canvas.height],
      physicalDpr: devicePixelRatio,
      effectiveDpr: snapshot.viewport.dpr,
      webgl: snapshot.webgl,
      browser: navigator.userAgent,
      frameCpuMs: distribution(this.cpu),
      updateCpuMs: distribution(this.update),
      colorSubmitCpuMs: distribution(this.color),
      activeRenderIntervalMs: interval,
      activeFps: interval.median ? Math.round(1000 / interval.median) : "idle/unavailable",
      renderedFrames: snapshot.stats.frames - this.baselineFrames,
      colorCalls: this.colorCalls,
      pickCalls: snapshot.pick.calls - this.baselinePick.calls,
      pickPasses: snapshot.pick.passes - this.baselinePick.passes,
      lastPickCpuMs: snapshot.pick.cpuMs,
      lastReadbackMs: snapshot.pick.readbackMs,
      uploadedBytes: this.uploadBytes,
      uploadRanges: this.uploadRanges,
      batchCount: snapshot.stats.batchCount,
      meanBatchUtilization: snapshot.stats.batchUtilization,
      activeMotionCount: snapshot.stats.activeMotionCount,
      glyphs: snapshot.fonts.glyphs,
      fontPages: snapshot.fonts.pages,
      spritePages: snapshot.sprites.pages,
      layouts: snapshot.text.layouts,
      gpuMs: "unavailable",
      gpuTimerUsed: false,
      notes: "CPU 调用耗时不等于 GPU 完成时间. 上传量为框架提交范围, 包含实际绑定的脏纹理页. 固定机器/窗口/DPR/热机状态比较.",
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
  }
}
