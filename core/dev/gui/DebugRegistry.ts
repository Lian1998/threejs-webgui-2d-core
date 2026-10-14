import { isDebugEnabled } from "./metadata";

export interface DebugInspectable {
  readonly debugId: string;
  readonly target: object;
  readonly label: string;
  readonly ownerId?: string;
}
export class DebugRegistry {
  private readonly instances = new Map<string, DebugInspectable>();
  private readonly listeners = new Set<() => void>();
  private disposed = false;

  register(instance: DebugInspectable): () => void {
    if (!isDebugEnabled()) return () => {};
    if (this.disposed) throw new Error("DebugRegistry has been disposed");
    if (this.instances.has(instance.debugId)) throw new Error(`Duplicate debug id: ${instance.debugId}`);
    this.instances.set(instance.debugId, instance);
    this.changed();
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      if (this.instances.get(instance.debugId) === instance) {
        this.instances.delete(instance.debugId);
        this.changed();
      }
    };
  }
  get(id: string): DebugInspectable | undefined {
    return this.instances.get(id);
  }
  list(search = ""): readonly DebugInspectable[] {
    const query = search.toLocaleLowerCase();
    return [...this.instances.values()].filter((value) => `${value.debugId} ${value.label} ${value.ownerId ?? ""}`.toLocaleLowerCase().includes(query));
  }
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.instances.clear();
    this.changed();
    this.listeners.clear();
  }
  private changed(): void {
    for (const listener of [...this.listeners])
      if (this.listeners.has(listener)) {
        try {
          listener();
        } catch (error) {
          console.error(error);
        }
      }
  }
}
