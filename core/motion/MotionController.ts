import type { TransformTarget, Vec2 } from "../contracts";
import type { FrameScheduler } from "../scheduler/FrameScheduler";

export interface MotionSample {
  position: Vec2;
  rotation: number;
  timestampMs?: number;
}
export interface MotionOptions {
  mode?: "latest" | "timestamped";
  durationMs?: number;
  delayMs?: number;
  normalizeTime?: (timestampMs: number) => number;
  maxSamples?: number;
  maxBufferedMs?: number;
  staleAfterMs?: number;
  snapDistance?: number;
  maxGapMs?: number;
}
export interface MotionHandle {
  readonly state: "idle" | "moving" | "stale" | "disposed";
  push(sample: MotionSample): void;
  snap(sample: MotionSample): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}
interface Pose {
  position: Vec2;
  rotation: number;
}
interface TimedPose extends Pose {
  time: number;
}
interface Transition {
  from: Pose;
  to: Pose;
  start: number;
}

export function shortestAngleDelta(from: number, to: number): number {
  const tau = Math.PI * 2;
  return ((((to - from + Math.PI) % tau) + tau) % tau) - Math.PI;
}
export function interpolatePose(from: Pose, to: Pose, progress: number): Pose {
  const t = Math.max(0, Math.min(1, progress));
  return {
    position: [from.position[0] + (to.position[0] - from.position[0]) * t, from.position[1] + (to.position[1] - from.position[1]) * t],
    rotation: from.rotation + shortestAngleDelta(from.rotation, to.rotation) * t,
  };
}

function samplePose(sample: MotionSample): Pose {
  if (sample.position.length !== 2 || !sample.position.every(Number.isFinite) || !Number.isFinite(sample.rotation)) {
    throw new Error("Motion sample must contain a finite position and rotation");
  }
  return { position: [...sample.position], rotation: sample.rotation };
}

/** 把多个 TransformTarget 绑定到 Viewer 的同一个 FrameScheduler.
 * 活动目标共同持有一个持续帧令牌, 最终通过 setPosition/setRotation 走普通脏更新链路. */
export class MotionController {
  private readonly bindings = new Map<TransformTarget, MotionBinding>();
  private readonly active = new Set<MotionBinding>();
  private releaseContinuous?: () => void;
  private readonly unsubscribe: () => void;
  private disposed = false;

  constructor(readonly scheduler: FrameScheduler) {
    this.unsubscribe = scheduler.onFrame((frame) => {
      for (const binding of [...this.active]) binding.advance(frame.nowMs);
    });
  }

  bind(target: TransformTarget, options: MotionOptions = {}): MotionHandle {
    if (this.disposed) throw new Error("MotionController has been disposed");
    if (this.bindings.has(target)) throw new Error("A target can only have one motion binding");
    const binding = new MotionBinding(this, target, options);
    this.bindings.set(target, binding);
    binding.attachLifetime();
    return binding;
  }

  getBinding(target: TransformTarget): MotionHandle | undefined {
    return this.bindings.get(target);
  }

  get activeCount(): number {
    return this.active.size;
  }
  get bindingCount(): number {
    return this.bindings.size;
  }

  setActive(binding: MotionBinding, active: boolean): void {
    if (this.disposed) return;
    if (active) this.active.add(binding);
    else this.active.delete(binding);
    if (this.active.size && !this.releaseContinuous) this.releaseContinuous = this.scheduler.acquireContinuous("motion");
    if (!this.active.size && this.releaseContinuous) {
      this.releaseContinuous();
      this.releaseContinuous = undefined;
    }
  }

  remove(target: TransformTarget, binding: MotionBinding): void {
    if (this.bindings.get(target) === binding) this.bindings.delete(target);
    this.setActive(binding, false);
  }

  dispose(): void {
    if (this.disposed) return;
    for (const binding of [...this.bindings.values()]) binding.dispose();
    this.disposed = true;
    this.unsubscribe();
    this.releaseContinuous?.();
    this.releaseContinuous = undefined;
    this.active.clear();
    this.bindings.clear();
  }
}

class MotionBinding implements MotionHandle {
  private readonly mode: "latest" | "timestamped";
  private readonly durationMs: number;
  private readonly delayMs: number;
  private readonly staleAfterMs: number;
  private readonly maxSamples: number;
  private readonly maxBufferedMs: number;
  private readonly maxGapMs: number;
  private readonly snapDistance: number;
  private pose?: Pose;
  private transition?: Transition;
  private samples: TimedPose[] = [];
  private receiptMs = -Infinity;
  private playedUntil = -Infinity;
  private paused = false;
  private disposed = false;
  private moving = false;
  private lifetimeUnsubscribe?: () => void;

  constructor(
    private readonly controller: MotionController,
    private readonly target: TransformTarget,
    private readonly options: MotionOptions,
  ) {
    this.mode = options.mode ?? "latest";
    if (this.mode !== "latest" && this.mode !== "timestamped") throw new Error("Invalid motion mode");
    this.durationMs = options.durationMs ?? 160;
    this.delayMs = options.delayMs ?? 100;
    this.staleAfterMs = options.staleAfterMs ?? 5_000;
    this.maxSamples = options.maxSamples ?? 120;
    this.maxBufferedMs = options.maxBufferedMs ?? 60_000;
    this.maxGapMs = options.maxGapMs ?? Infinity;
    this.snapDistance = options.snapDistance ?? Infinity;
    if (![this.durationMs, this.delayMs, this.staleAfterMs, this.maxBufferedMs].every((value) => Number.isFinite(value) && value >= 0) || !Number.isInteger(this.maxSamples) || this.maxSamples < 2 || this.maxGapMs <= 0 || this.snapDistance < 0 || Number.isNaN(this.maxGapMs) || Number.isNaN(this.snapDistance)) {
      throw new Error("Invalid motion options");
    }
    if (this.mode === "timestamped" && !options.normalizeTime) throw new Error("timestamped mode requires normalizeTime");
  }

  attachLifetime(): void {
    const target = this.target as TransformTarget & {
      disposed?: boolean;
      onDispose?: (listener: () => void) => () => void;
    };
    if (target.disposed) {
      this.dispose();
      throw new Error("Cannot bind a disposed target");
    }
    this.lifetimeUnsubscribe = target.onDispose?.(() => this.dispose());
  }

  get state(): MotionHandle["state"] {
    if (this.disposed) return "disposed";
    if (this.pose && this.controller.scheduler.now() - this.receiptMs >= this.staleAfterMs) return "stale";
    return this.moving ? "moving" : "idle";
  }

  /** latest 从当前显示姿态过渡到新样本, timestamped 则缓冲归一化时间并延迟播放. */
  push(sample: MotionSample): void {
    this.assertAlive();
    const next = samplePose(sample);
    const now = this.controller.scheduler.now();
    if (this.mode === "timestamped") {
      const time = this.normalizedTime(sample);
      if (time < this.playedUntil) return;
      const last = this.samples[this.samples.length - 1];
      if (last && time > last.time && (time - last.time > this.maxGapMs || Math.hypot(next.position[0] - last.position[0], next.position[1] - last.position[1]) > this.snapDistance)) {
        this.samples = [];
        if (!this.paused) this.write(next);
      }
      const index = this.samples.findIndex((value) => value.time >= time);
      const value = { ...next, time };
      if (index < 0) this.samples.push(value);
      else if (this.samples[index].time === time) this.samples[index] = value;
      else this.samples.splice(index, 0, value);
      while (this.samples.length > this.maxSamples) this.samples.shift();
      while (this.samples.length > 1 && this.samples[this.samples.length - 1].time - this.samples[0].time > this.maxBufferedMs) this.samples.shift();
      this.receiptMs = now;
      if (!this.pose && !this.paused) this.write(next);
      if (!this.paused) this.advance(now);
      return;
    }
    if (this.transition && !this.paused) this.advance(now);
    const largeGap = this.pose && now - this.receiptMs > this.maxGapMs;
    const far = this.pose && Math.hypot(next.position[0] - this.pose.position[0], next.position[1] - this.pose.position[1]) > this.snapDistance;
    this.receiptMs = now;
    if (!this.pose || this.durationMs === 0 || largeGap || far) {
      this.transition = { from: next, to: next, start: now };
      if (!this.paused) {
        this.write(next);
        this.finish();
      }
    } else {
      this.transition = { from: this.pose, to: next, start: now };
      this.setMoving(!this.paused);
    }
    this.controller.scheduler.invalidate("motion-sample");
  }

  snap(sample: MotionSample): void {
    this.assertAlive();
    const next = samplePose(sample);
    const time = this.mode === "timestamped" ? this.normalizedTime(sample) : 0;
    this.receiptMs = this.controller.scheduler.now();
    this.samples = this.mode === "timestamped" ? [{ ...next, time }] : [];
    this.playedUntil = -Infinity;
    this.transition = { from: next, to: next, start: this.receiptMs };
    if (!this.paused) {
      this.write(next);
      this.finish();
    } else this.setMoving(false);
    this.controller.scheduler.invalidate("motion-snap");
  }

  pause(): void {
    this.assertAlive();
    if (this.paused) return;
    this.advance(this.controller.scheduler.now());
    this.paused = true;
    this.setMoving(false);
  }

  resume(): void {
    this.assertAlive();
    if (!this.paused) return;
    this.paused = false;
    const transform = (this.target as TransformTarget & { transform?: { position: Vec2; rotation: number } }).transform;
    if (transform) this.pose = { position: [...transform.position], rotation: transform.rotation };
    const now = this.controller.scheduler.now();
    if (this.mode === "latest" && this.transition) this.transition = { from: this.pose ?? this.transition.to, to: this.transition.to, start: now };
    this.advance(now);
    this.controller.scheduler.invalidate("motion-resume");
  }

  /** 由共享调度器驱动, 计算当前位置和最短角度插值, 完成后退出活动集合. */
  advance(now: number): void {
    if (this.disposed || this.paused) return;
    if (this.pose && now - this.receiptMs >= this.staleAfterMs) {
      this.finish();
      return;
    }
    if (this.mode === "latest") {
      if (!this.transition) {
        this.setMoving(false);
        return;
      }
      const progress = this.durationMs === 0 ? 1 : (now - this.transition.start) / this.durationMs;
      this.write(interpolatePose(this.transition.from, this.transition.to, progress));
      if (progress >= 1) this.finish();
      else this.setMoving(true);
      return;
    }
    if (!this.samples.length) {
      this.setMoving(false);
      return;
    }
    const play = now - this.delayMs;
    this.playedUntil = Math.max(this.playedUntil, play);
    while (this.samples.length > 2 && this.samples[1].time <= play) this.samples.shift();
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (play <= first.time) {
      this.write(first);
      this.setMoving(this.samples.length > 1);
    } else if (play >= last.time) {
      this.write(last);
      this.setMoving(false);
    } else {
      const right = this.samples.findIndex((value) => value.time >= play);
      const a = this.samples[right - 1],
        b = this.samples[right];
      this.write(interpolatePose(a, b, (play - a.time) / (b.time - a.time)));
      this.setMoving(true);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lifetimeUnsubscribe?.();
    this.lifetimeUnsubscribe = undefined;
    this.controller.remove(this.target, this);
    this.samples = [];
    this.transition = undefined;
    this.pose = undefined;
  }

  private normalizedTime(sample: MotionSample): number {
    if (!Number.isFinite(sample.timestampMs)) throw new Error("timestamped samples require a finite timestampMs");
    const time = this.options.normalizeTime!(sample.timestampMs!);
    if (!Number.isFinite(time)) throw new Error("normalizeTime must return finite monotonic milliseconds");
    return time;
  }
  private write(pose: Pose): void {
    const old = this.pose;
    if (!old || old.position[0] !== pose.position[0] || old.position[1] !== pose.position[1]) this.target.setPosition(pose.position);
    if (this.disposed) return;
    if (!old || old.rotation !== pose.rotation) this.target.setRotation(pose.rotation);
    if (!this.disposed) this.pose = { position: [...pose.position], rotation: pose.rotation };
  }
  private setMoving(moving: boolean): void {
    this.moving = moving;
    this.controller.setActive(this, moving);
  }
  private finish(): void {
    this.transition = undefined;
    this.setMoving(false);
  }
  private assertAlive(): void {
    if (this.disposed) throw new Error("Motion binding has been disposed");
  }
}
