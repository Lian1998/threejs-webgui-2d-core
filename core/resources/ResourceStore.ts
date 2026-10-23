import type { ResourceLease, ResourceStoreAcquireOptions } from "../contracts";

interface Waiter<T> {
  resolve: (lease: ResourceLease<T>) => void;
  reject: (error: unknown) => void;
  unlisten: () => void;
}

interface Entry<T> {
  key: string;
  controller: AbortController;
  state: "pending" | "ready";
  value?: T;
  refs: number;
  waiters: Set<Waiter<T>>;
  disposer: (value: T) => void;
  closed: boolean;
}

export interface ResourceStoreOptions {
  invalidate?: () => void;
  onError?: (error: unknown) => void;
}

export interface ResourceSnapshot {
  key: string;
  state: "pending" | "ready";
  references: number;
  waiters: number;
}

function abortError(): Error {
  const error = new Error("Resource acquisition aborted");
  error.name = "AbortError";
  return error;
}

/** 按 key 合并异步 loader, 每个消费者获得独立的引用计数 lease.
 * 不直接创建 Three.js 对象, 资源类型和 dispose 行为由具体 loader/disposer 注入. */
export class ResourceStore {
  private readonly entries = new Map<string, Entry<unknown>>();
  private disposed = false;

  constructor(private readonly options: ResourceStoreOptions = {}) {}

  acquire<T>(key: string, loader: (signal: AbortSignal) => Promise<T>, disposer: (value: T) => void, options: ResourceStoreAcquireOptions = {}): Promise<ResourceLease<T>> {
    if (this.disposed) return Promise.reject(new Error("ResourceStore has been disposed"));
    if (!key) return Promise.reject(new Error("Resource key must not be empty"));
    if (options.signal?.aborted) return Promise.reject(abortError());
    let entry = this.entries.get(key) as Entry<T> | undefined;
    let created = false;
    if (!entry) {
      entry = {
        key,
        controller: new AbortController(),
        state: "pending",
        refs: 0,
        waiters: new Set(),
        disposer,
        closed: false,
      };
      this.entries.set(key, entry as Entry<unknown>);
      created = true;
    }
    if (entry.state === "ready") return Promise.resolve(this.lease(entry));
    const current = entry;
    const result = new Promise<ResourceLease<T>>((resolve, reject) => {
      const waiter: Waiter<T> = { resolve, reject, unlisten: () => {} };
      current.waiters.add(waiter);
      if (options.signal) {
        const cancel = () => {
          if (!current.waiters.delete(waiter)) return;
          waiter.unlisten();
          reject(abortError());
          if (!current.waiters.size && !current.refs) this.close(current);
        };
        options.signal.addEventListener("abort", cancel, { once: true });
        waiter.unlisten = () => options.signal?.removeEventListener("abort", cancel);
        if (options.signal.aborted) cancel();
      }
    });
    if (created) {
      // loader 同步抛错也转为共享失败, 并在没有等待者时跳过不必要的加载.
      Promise.resolve()
        .then(() => {
          if (current.closed) throw abortError();
          return loader(current.controller.signal);
        })
        .then(
          (value) => this.loaded(current, value),
          (error) => this.failed(current, error),
        );
    }
    return result;
  }

  snapshot(): readonly ResourceSnapshot[] {
    return [...this.entries.values()].map((entry) => ({
      key: entry.key,
      state: entry.state,
      references: entry.refs,
      waiters: entry.waiters.size,
    }));
  }

  /** 上下文恢复由具体资源适配器重传, Store 不猜测字体或纹理的用途. */
  forEachReady(listener: (value: unknown, key: string) => void): void {
    for (const entry of [...this.entries.values()]) {
      if (!entry.closed && entry.state === "ready") listener(entry.value, entry.key);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of [...this.entries.values()]) {
      for (const waiter of entry.waiters) {
        waiter.unlisten();
        waiter.reject(new Error("ResourceStore has been disposed"));
      }
      entry.waiters.clear();
      this.close(entry);
    }
    this.entries.clear();
  }

  private loaded<T>(entry: Entry<T>, value: T): void {
    if (entry.closed || this.disposed) {
      // 无法中止的解码迟到完成时也必须释放, 不能复活已销毁 Viewer.
      this.destroyValue(entry, value);
      return;
    }
    entry.value = value;
    entry.state = "ready";
    const waiters = [...entry.waiters];
    entry.waiters.clear();
    for (const waiter of waiters) {
      waiter.unlisten();
      waiter.resolve(this.lease(entry));
    }
    if (!entry.refs) this.close(entry);
    else this.options.invalidate?.();
  }

  private failed<T>(entry: Entry<T>, error: unknown): void {
    if (entry.closed) return;
    for (const waiter of entry.waiters) {
      waiter.unlisten();
      waiter.reject(error);
    }
    entry.waiters.clear();
    this.close(entry);
  }

  /** 每个申请独立计数并提供幂等 release, 只有最后引用和等待者离开时才销毁资源. */
  private lease<T>(entry: Entry<T>): ResourceLease<T> {
    entry.refs++;
    let released = false;
    return {
      get value(): T {
        if (released || entry.closed) throw new Error(`Resource lease is no longer valid: ${entry.key}`);
        return entry.value as T;
      },
      release: () => {
        if (released) return;
        released = true;
        if (entry.closed) return;
        entry.refs--;
        if (!entry.refs && !entry.waiters.size) this.close(entry);
      },
    };
  }

  private close<T>(entry: Entry<T>): void {
    if (entry.closed) return;
    entry.closed = true;
    // 先摘掉索引, disposer 重入 acquire 也不会取得旧条目.
    if (this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
    entry.controller.abort();
    if (entry.state === "ready") this.destroyValue(entry, entry.value as T);
    entry.value = undefined;
    entry.refs = 0;
  }

  private destroyValue<T>(entry: Entry<T>, value: T): void {
    try {
      entry.disposer(value);
    } catch (error) {
      if (this.options.onError) {
        try {
          this.options.onError(error);
        } catch (reportError) {
          console.error(reportError);
        }
      } else console.error(error);
    }
  }
}
