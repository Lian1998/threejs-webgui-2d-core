import type { DirtyKind, EntityId, PrimitiveKind } from "../contracts";
import type { BasePrimitive } from "./PrimitiveHandle";

export interface PrimitiveChange {
  id: string;
  version: number;
  dirty: ReadonlySet<DirtyKind>;
}
/** 维护逻辑 ID, RGB24 拾取 ID 和 handle 的双向索引, 并合并待通知的脏字段.
 * pickId 可回收, generation 区分不同生命周期, 防止异步读回误命中新对象. */
export class PrimitiveRegistry {
  private handles = new Map<string, BasePrimitive<any>>();
  private pickMap = new Map<number, BasePrimitive<any>>();
  private freed: number[] = [];
  private pickGenerations = new Map<number, number>();
  private nextPick = 1;
  private sequence = 0;
  private pending = new Map<string, Set<DirtyKind>>();
  private added = new Set<(handle: BasePrimitive<any>) => void>();
  private removed = new Set<(handle: BasePrimitive<any>) => void>();
  private changed = new Set<(change: PrimitiveChange) => void>();
  private disposed = false;
  hitRevision = 0;
  revision = 0;
  constructor(private onError: (error: unknown) => void = (error) => console.error(error)) {}
  identity(id?: string): { id: string; sequence: number; pickId: number; generation: number } {
    if (this.disposed) throw new Error("图元注册表已销毁.");
    let sequence = ++this.sequence,
      logicalId = id ?? `primitive-${sequence}`;
    if (id === undefined)
      while (this.handles.has(logicalId)) {
        sequence = ++this.sequence;
        logicalId = `primitive-${sequence}`;
      }
    if (!logicalId || this.handles.has(logicalId)) throw new Error(`图元 ID 重复或无效: ${logicalId}`);
    const pickId = this.freed.pop() ?? this.nextPick++;
    if (pickId > 0xffffff) throw new Error("GPU 拾取 ID 已耗尽.");
    const generation = (this.pickGenerations.get(pickId) ?? 0) + 1;
    this.pickGenerations.set(pickId, generation);
    return { id: logicalId, sequence, pickId, generation };
  }
  releaseIdentity(identity: { pickId: number }): void {
    if (!this.pickMap.has(identity.pickId)) this.freed.push(identity.pickId);
  }
  add(handle: BasePrimitive<any>): void {
    if (this.disposed) throw new Error("图元注册表已销毁.");
    this.handles.set(handle.id, handle);
    this.pickMap.set(handle.pickId, handle);
    this.mark(handle, new Set<DirtyKind>(["geometry", "resource", "transform", "style"]));
    this.hitRevision++;
    this.notify(this.added, handle);
  }
  get(id: string): BasePrimitive<any> | undefined {
    return this.handles.get(id);
  }
  byPickId(id: number): BasePrimitive<any> | undefined {
    return this.pickMap.get(id);
  }
  list(kind?: PrimitiveKind): readonly BasePrimitive<any>[] {
    return [...this.handles.values()].filter((handle) => !kind || handle.kind === kind);
  }
  findByOwner(id: EntityId): readonly BasePrimitive<any>[] {
    return this.list().filter((handle) => handle.getOptions().ownerId === id);
  }
  mark(handle: BasePrimitive<any>, dirty: ReadonlySet<DirtyKind>): void {
    if (this.disposed) return;
    const pending = this.pending.get(handle.id) ?? new Set<DirtyKind>();
    dirty.forEach((kind) => pending.add(kind));
    this.pending.set(handle.id, pending);
    this.revision++;
    // 连续姿态更新不作废异步 hover, 结构和 mask 改动单独计数.
    if ([...dirty].some((kind) => kind !== "transform")) this.hitRevision++;
  }
  dirtyFor(id: string): ReadonlySet<DirtyKind> {
    return this.pending.get(id) ?? new Set();
  }
  /** 先换出 pending 队列, 回调中产生的新变更进入下一批通知, 避免遍历时修改当前集合. */
  flushChanges(): void {
    const pending = this.pending;
    this.pending = new Map();
    for (const [id, dirty] of pending) {
      const handle = this.handles.get(id);
      if (!handle) continue;
      const change = { id, dirty, version: handle.version };
      this.notify(this.changed, change);
    }
  }
  remove(handle: BasePrimitive<any>): void {
    if (this.handles.get(handle.id) !== handle) return;
    this.handles.delete(handle.id);
    this.pickMap.delete(handle.pickId);
    this.pending.delete(handle.id);
    this.freed.push(handle.pickId);
    this.hitRevision++;
    this.revision++;
    this.notify(this.removed, handle);
  }
  onAdded(cb: (handle: BasePrimitive<any>) => void): () => void {
    this.added.add(cb);
    return () => this.added.delete(cb);
  }
  onRemoved(cb: (handle: BasePrimitive<any>) => void): () => void {
    this.removed.add(cb);
    return () => this.removed.delete(cb);
  }
  onChanged(cb: (change: PrimitiveChange) => void): () => void {
    this.changed.add(cb);
    return () => this.changed.delete(cb);
  }
  private notify<T>(listeners: Set<(value: T) => void>, value: T): void {
    // 一个业务回调失败不能阻止后端, motion 和 GUI 释放各自的引用.
    for (const listener of [...listeners]) {
      try {
        listener(value);
      } catch (error) {
        try {
          this.onError(error);
        } catch (reportError) {
          console.error(reportError);
        }
      }
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.list().forEach((handle) => handle.dispose());
    this.added.clear();
    this.removed.clear();
    this.changed.clear();
    this.pending.clear();
    this.pickGenerations.clear();
  }
}
