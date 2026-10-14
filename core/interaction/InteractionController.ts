import type { PickQuery, PickResult, PrimitiveHandle, Vec2 } from "../contracts";
import type { PrimitiveRegistry } from "../primitives/PrimitiveRegistry";
import type { BasePrimitive } from "../primitives/PrimitiveHandle";
import type { LayerManager } from "../layers/LayerManager";
import type { Viewport2D } from "../viewport/Viewport2D";
import type { FrameScheduler } from "../scheduler/FrameScheduler";

export interface InteractionPicker {
  pickAt(screen: Vec2, query?: PickQuery): PickResult | undefined;
  pickAtAsync(screen: Vec2, query?: PickQuery): Promise<PickResult | undefined>;
}
export interface InteractionOptions {
  registry: PrimitiveRegistry;
  layers: LayerManager;
  viewport: Viewport2D;
  scheduler: FrameScheduler;
  picker: InteractionPicker;
  hover?: boolean;
  selectionMode?: "primitive" | "owner";
  clickMoveTolerancePx?: number;
  doubleClickDelayMs?: number;
  query?: PickQuery;
  getBounds?: (handle: PrimitiveHandle<any>) => readonly [Vec2, Vec2] | undefined;
  onError?: (error: unknown) => void;
}
export type SelectionTarget = { primitiveId: string } | { ownerId: string; preferredPartId?: string };
export interface SelectionOptions {
  focus?: boolean;
  scale?: number;
  durationMs?: number;
}
export interface SelectionChange {
  previous?: PickResult;
  current?: PickResult;
  selectionChanged: boolean;
}

export function selectionKey(hit: PickResult | undefined, mode: "primitive" | "owner" = "owner"): string | undefined {
  if (!hit) return undefined;
  return mode === "owner" && hit.ownerId ? `owner:${hit.ownerId}` : `primitive:${hit.primitiveId}`;
}
function copyHit(hit: PickResult): PickResult {
  return { ...hit, screen: [...hit.screen], world: [...hit.world] };
}

/** 拾取只返回事实, 交互在 Viewer 内维护悬浮/选择与真实 handle 生命周期. */
export class InteractionController {
  private hoverHit?: PickResult;
  private hoverHandle?: BasePrimitive<any>;
  private selectionHit?: PickResult;
  private selectionHandle?: BasePrimitive<any>;
  private readonly listeners = new Set<(change: SelectionChange) => void>();
  private readonly cleanups: Array<() => void> = [];
  private pointer?: Vec2;
  private pointerEpoch = 0;
  private queryEpoch = 0;
  private query: PickQuery;
  private hoverRequested = false;
  private inFlight = false;
  private lastQueriedRevision = -1;
  private disposed = false;
  private changing = false;
  private readonly pendingOperations: Array<() => void> = [];
  private down?: Vec2;
  private previousClick?: { time: number; key: string; screen: Vec2 };
  private focusCleanup?: () => void;
  private readonly clickTolerance: number;
  private readonly doubleDelay: number;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly options: InteractionOptions,
  ) {
    this.query = { layers: options.query?.layers ? [...options.query.layers] : undefined };
    this.clickTolerance = options.clickMoveTolerancePx ?? 3;
    this.doubleDelay = options.doubleClickDelayMs ?? 250;
    if (![this.clickTolerance, this.doubleDelay].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Invalid interaction thresholds");
    this.listen("pointermove", ((event: PointerEvent) => {
      const screen = options.viewport.clientToScreen([event.clientX, event.clientY]);
      if (!screen.every(Number.isFinite)) return;
      if (!this.pointer || screen[0] !== this.pointer[0] || screen[1] !== this.pointer[1]) this.pointerEpoch++;
      this.pointer = screen;
      this.requestHover();
    }) as EventListener);
    const leave = () => {
      this.pointer = undefined;
      this.pointerEpoch++;
      this.hoverRequested = false;
      this.setHovered(undefined);
    };
    this.listen("pointerleave", leave);
    this.listen("pointercancel", () => {
      this.down = undefined;
      this.previousClick = undefined;
      leave();
    });
    this.listen("pointerdown", ((event: PointerEvent) => {
      if (event.button === 0) this.down = options.viewport.clientToScreen([event.clientX, event.clientY]);
    }) as EventListener);
    this.listen("pointerup", () => this.requestHover());
    this.listen("click", ((event: MouseEvent) => this.click(event)) as EventListener);
    // 双击由两次 click 的当次拾取决胜, native dblclick 不重复派发.
    this.listen("dblclick", (event) => {
      if (this.previousClick) event.preventDefault();
    });
    this.cleanups.push(options.registry.onChanged(() => this.revalidate()));
    this.cleanups.push(options.registry.onAdded(() => this.revalidate()));
    this.cleanups.push(options.registry.onRemoved(() => this.revalidate()));
    this.cleanups.push(options.layers.onChange(() => this.revalidate()));
    this.cleanups.push(options.viewport.onChange(() => this.revalidate()));
  }

  get hovered(): PickResult | undefined {
    return this.hoverHit ? copyHit(this.hoverHit) : undefined;
  }
  get selected(): PickResult | undefined {
    return this.selectionHit ? copyHit(this.selectionHit) : undefined;
  }

  onSelectionChange(listener: (change: SelectionChange) => void): () => void {
    if (this.disposed) throw new Error("InteractionController has been disposed");
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 在颜色帧完成后调用, 不创建独立 RAF 或同时发起多个 GPU 读回. */
  afterFrame(): void {
    if (this.disposed || !this.pointer || this.options.hover === false || this.options.viewport.isPanning) return;
    if (this.options.registry.revision !== this.lastQueriedRevision) this.hoverRequested = true;
    if (!this.hoverRequested || this.inFlight) return;
    this.hoverRequested = false;
    this.inFlight = true;
    const screen = [...this.pointer] as Vec2;
    const pointerEpoch = this.pointerEpoch,
      queryEpoch = this.queryEpoch;
    const cameraRevision = this.options.viewport.revision,
      hitRevision = this.options.registry.hitRevision;
    this.lastQueriedRevision = this.options.registry.revision;
    let pending: Promise<PickResult | undefined>;
    try {
      pending = this.options.picker.pickAtAsync(screen, this.query);
    } catch (error) {
      pending = Promise.reject(error);
    }
    void pending
      .then((hit) => {
        if (this.disposed) return;
        if (pointerEpoch !== this.pointerEpoch || queryEpoch !== this.queryEpoch || cameraRevision !== this.options.viewport.revision || hitRevision !== this.options.registry.hitRevision) {
          this.hoverRequested = Boolean(this.pointer);
          return;
        }
        // GPU 查询保留候选 ID generation, 此处再以结构 revision/真实 handle 存活校验.
        // 无需为每次 hover 复制整个场景注册表.
        if (hit && !this.eligible(this.options.registry.get(hit.primitiveId))) {
          this.hoverRequested = Boolean(this.pointer);
          return;
        }
        this.setHovered(hit);
      })
      .catch((error) => {
        if (!this.disposed) this.report(error);
      })
      .finally(() => {
        this.inFlight = false;
        if (!this.disposed && this.pointer && this.hoverRequested) this.options.scheduler.invalidate("hover-latest");
      });
  }

  revalidate(): void {
    if (this.disposed) return;
    if (this.hoverHandle && !this.eligible(this.hoverHandle)) this.setHovered(undefined);
    if (this.selectionHandle && (!this.eligible(this.selectionHandle) || ((this.options.selectionMode ?? "owner") === "owner" && this.selectionHandle.getOptions().ownerId !== this.selectionHit?.ownerId))) this.clearSelection();
    else if (this.selectionHit && !this.eligible(this.options.registry.get(this.selectionHit.primitiveId))) {
      if (this.selectionHandle) this.setSelection(this.programmaticHit(this.selectionHandle));
      else this.clearSelection();
    } else if (this.selectionHit) {
      const handle = this.options.registry.get(this.selectionHit.primitiveId);
      const current = handle?.getOptions();
      if (current && (current.ownerId !== this.selectionHit.ownerId || current.partId !== this.selectionHit.partId || current.layer !== this.selectionHit.layerId)) {
        // 归属/层变化要同步选择快照, 普通位置插帧不重复派发选择通知.
        if ((this.options.selectionMode ?? "owner") === "owner" && current.ownerId !== this.selectionHit.ownerId && this.selectionHandle) {
          this.setSelection(this.programmaticHit(this.selectionHandle));
        } else
          this.setSelection({
            ...this.selectionHit,
            ownerId: current.ownerId,
            partId: current.partId,
            layerId: current.layer,
          });
      }
    }
    this.requestHover();
  }

  setQuery(query: PickQuery): void {
    if (this.disposed) return;
    this.query = { layers: query.layers ? [...query.layers] : undefined };
    this.queryEpoch++;
    this.previousClick = undefined;
    this.revalidate();
  }

  select(target: SelectionTarget, options: SelectionOptions = {}): boolean {
    if (this.disposed) return false;
    if (options.durationMs !== undefined && (!Number.isFinite(options.durationMs) || options.durationMs < 0)) throw new Error("Focus duration must be non-negative");
    if (options.scale !== undefined && (!Number.isFinite(options.scale) || options.scale <= 0)) throw new Error("Focus scale must be positive");
    let handle: BasePrimitive<any> | undefined;
    if ("primitiveId" in target) handle = this.options.registry.get(target.primitiveId);
    else {
      const candidates = this.options.registry.findByOwner(target.ownerId).filter((value) => this.eligible(value));
      const preferred = target.preferredPartId ? candidates.filter((value) => value.getOptions().partId === target.preferredPartId) : candidates;
      handle = [...preferred].sort((a, b) => this.comparePaint(b, a))[0];
    }
    if (!this.eligible(handle)) return false;
    this.setSelection(this.programmaticHit(handle!));
    if (options.focus) this.focus(handle!, target, options);
    return true;
  }

  clearSelection(): void {
    if (!this.disposed) this.setSelection(undefined);
  }

  dispose(): void {
    if (this.disposed) return;
    const hover = this.hoverHandle,
      hoverHit = this.hoverHit,
      selection = this.selectionHandle,
      selectionHit = this.selectionHit;
    this.hoverHandle = undefined;
    this.hoverHit = undefined;
    this.selectionHandle = undefined;
    this.selectionHit = undefined;
    this.disposed = true;
    // dispose 也可能从事件回调重入, 直接清理快照, 不能把它排入随后被作废的队列.
    try {
      hover?.emit("pointerleave", hoverHit);
    } catch (error) {
      this.report(error);
    }
    try {
      selection?.emit("deselect", selectionHit);
    } catch (error) {
      this.report(error);
    }
    if (selectionHit) this.notifySelection(selectionHit, undefined, true);
    this.pointerEpoch++;
    this.focusCleanup?.();
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.listeners.clear();
    this.pendingOperations.length = 0;
    this.pointer = undefined;
    this.previousClick = undefined;
    this.hoverRequested = false;
  }

  private requestHover(): void {
    if (!this.pointer || this.options.hover === false || this.disposed) return;
    this.hoverRequested = true;
    this.options.scheduler.invalidate("hover");
  }

  private eligible(handle: BasePrimitive<any> | undefined): boolean {
    if (this.disposed || !handle || handle.disposed || this.options.registry.get(handle.id) !== handle) return false;
    const o = handle.getOptions(),
      layer = this.options.layers.effective(o.layer, this.options.viewport.state.scale);
    return handle.effectiveVisible && o.pickable !== false && layer.visible && layer.pickable && (o.opacity ?? 1) * layer.opacity > 0 && (!this.query.layers || this.query.layers.includes(o.layer));
  }

  private setHovered(hit: PickResult | undefined, event?: MouseEvent | PointerEvent): void {
    this.mutate(() => {
      const next = hit ? this.options.registry.get(hit.primitiveId) : undefined;
      if (next && !this.eligible(next)) return;
      if (next === this.hoverHandle) {
        this.hoverHit = hit ? copyHit(hit) : undefined;
        return;
      }
      const previous = this.hoverHandle,
        previousHit = this.hoverHit;
      this.hoverHandle = undefined;
      this.hoverHit = undefined;
      previous?.emit("pointerleave", previousHit, event);
      if (next && this.eligible(next)) {
        this.hoverHandle = next;
        this.hoverHit = copyHit(hit!);
        next.emit("pointerenter", hit, event);
      }
    });
  }

  private setSelection(hit: PickResult | undefined, event?: MouseEvent): void {
    this.mutate(() => {
      const previous = this.selectionHit,
        previousHandle = this.selectionHandle;
      const next = hit ? this.options.registry.get(hit.primitiveId) : undefined;
      if (next && !this.eligible(next)) return;
      const same = selectionKey(previous, this.options.selectionMode) === selectionKey(hit, this.options.selectionMode) && (!previousHandle || this.eligible(previousHandle));
      if (same) {
        this.selectionHit = hit ? copyHit(hit) : undefined;
        if (previous?.primitiveId !== hit?.primitiveId || previous?.ownerId !== hit?.ownerId || previous?.partId !== hit?.partId || previous?.layerId !== hit?.layerId) this.notifySelection(previous, this.selectionHit, false);
        return;
      }
      this.selectionHandle = undefined;
      this.selectionHit = undefined;
      previousHandle?.emit("deselect", previous, event);
      if (next && this.eligible(next)) {
        this.selectionHandle = next;
        this.selectionHit = copyHit(hit!);
        next.emit("select", hit, event);
      }
      this.notifySelection(previous, this.selectionHit, true);
    });
  }

  private click(event: MouseEvent): void {
    if (this.disposed || event.button !== 0) return;
    const screen = this.options.viewport.clientToScreen([event.clientX, event.clientY]);
    const down = this.down;
    this.down = undefined;
    if (this.options.viewport.wasRecentlyPanning() || (down && Math.hypot(screen[0] - down[0], screen[1] - down[1]) > this.clickTolerance)) {
      this.previousClick = undefined;
      return;
    }
    try {
      const hit = this.options.picker.pickAt(screen, this.query);
      this.setSelection(hit, event);
      const key = selectionKey(hit, this.options.selectionMode),
        now = this.options.scheduler.now();
      if (hit && key && this.previousClick?.key === key && now - this.previousClick.time <= this.doubleDelay && Math.hypot(screen[0] - this.previousClick.screen[0], screen[1] - this.previousClick.screen[1]) <= this.clickTolerance) {
        this.options.registry.get(hit.primitiveId)?.emit("dblclick", hit, event);
        this.previousClick = undefined;
      } else this.previousClick = key ? { time: now, key, screen } : undefined;
    } catch (error) {
      this.report(error);
    }
  }

  private programmaticHit(handle: BasePrimitive<any>): PickResult {
    const options = handle.getOptions(),
      matrix = handle.getEffectiveMatrix().elements;
    const world: Vec2 = [matrix[12], -matrix[14]];
    return {
      primitiveId: handle.id,
      ownerId: options.ownerId,
      partId: options.partId,
      layerId: options.layer,
      world,
      screen: this.options.viewport.worldToScreen(world),
    };
  }
  private comparePaint(a: BasePrimitive<any>, b: BasePrimitive<any>): number {
    return (this.options.layers.get(a.getOptions().layer)?.getOptions().order ?? 0) - (this.options.layers.get(b.getOptions().layer)?.getOptions().order ?? 0) || (a.getOptions().order ?? 0) - (b.getOptions().order ?? 0) || a.insertionSequence - b.insertionSequence;
  }
  private notifySelection(previous: PickResult | undefined, current: PickResult | undefined, selectionChanged: boolean): void {
    for (const listener of [...this.listeners])
      if (this.listeners.has(listener)) {
        try {
          listener({
            previous: previous ? copyHit(previous) : undefined,
            current: current ? copyHit(current) : undefined,
            selectionChanged,
          });
        } catch (error) {
          this.report(error);
        }
      }
  }
  private mutate(action: () => void): void {
    if (this.disposed) return;
    if (this.changing) {
      this.pendingOperations.push(action);
      return;
    }
    this.changing = true;
    try {
      action();
      let count = 0;
      while (this.pendingOperations.length && !this.disposed) {
        if (++count > 100) {
          this.pendingOperations.length = 0;
          throw new Error("Interaction callback re-entry exceeded limit");
        }
        this.pendingOperations.shift()!();
      }
    } catch (error) {
      this.report(error);
    } finally {
      this.changing = false;
    }
  }
  private focus(handle: BasePrimitive<any>, target: SelectionTarget, options: SelectionOptions): void {
    this.focusCleanup?.();
    const handles = "ownerId" in target ? this.options.registry.findByOwner(target.ownerId).filter((value) => this.eligible(value)) : [handle];
    const bounds = handles.map(
      (value) =>
        this.options.getBounds?.(value) ??
        (() => {
          const e = value.getEffectiveMatrix().elements;
          return [
            [e[12] - 0.5, -e[14] - 0.5],
            [e[12] + 0.5, -e[14] + 0.5],
          ] as const;
        })(),
    );
    const min: Vec2 = [Math.min(...bounds.map((value) => value[0][0])), Math.min(...bounds.map((value) => value[0][1]))];
    const max: Vec2 = [Math.max(...bounds.map((value) => value[1][0])), Math.max(...bounds.map((value) => value[1][1]))];
    const start = this.options.viewport.state;
    if (options.scale !== undefined) this.options.viewport.setView({ center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2], scale: options.scale });
    else this.options.viewport.fitBounds([min, max]);
    const destination = this.options.viewport.state;
    const duration = options.durationMs ?? 300;
    if (!Number.isFinite(duration) || duration < 0) throw new Error("Focus duration must be non-negative");
    if (!duration) return;
    this.options.viewport.setView(start);
    const startMs = this.options.scheduler.now(),
      release = this.options.scheduler.acquireContinuous("focus");
    const unsubscribe = this.options.scheduler.onFrame((frame) => {
      const t = Math.min(1, (frame.nowMs - startMs) / duration),
        eased = 1 - (1 - t) ** 3;
      this.options.viewport.setView({
        center: [start.center[0] + (destination.center[0] - start.center[0]) * eased, start.center[1] + (destination.center[1] - start.center[1]) * eased],
        scale: Math.exp(Math.log(start.scale) + (Math.log(destination.scale) - Math.log(start.scale)) * eased),
      });
      if (t >= 1) this.focusCleanup?.();
    });
    this.focusCleanup = () => {
      unsubscribe();
      release();
      this.focusCleanup = undefined;
    };
  }
  private listen(name: string, listener: EventListener): void {
    this.canvas.addEventListener(name, listener);
    this.cleanups.push(() => this.canvas.removeEventListener(name, listener));
  }
  private report(error: unknown): void {
    if (this.options.onError) {
      try {
        this.options.onError(error);
      } catch (reportError) {
        console.error(reportError);
      }
    } else console.error(error);
  }
}
