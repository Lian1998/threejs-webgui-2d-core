import type { PrimitiveHandle } from "../contracts";
import { EntityView, type EntityOptions } from "./EntityView";

export class EntityRegistry {
  private readonly values = new Map<string, EntityView>();
  private readonly ownership = new WeakMap<PrimitiveHandle, EntityView>();
  private readonly listeners = new Set<() => void>();
  private disposed = false;

  create(options: EntityOptions): EntityView {
    if (this.disposed) throw new Error("EntityRegistry has been disposed");
    if (this.values.has(options.id)) throw new Error(`Duplicate entity id: ${options.id}`);
    const entity = new EntityView(options, this.ownership);
    this.values.set(entity.id, entity);
    entity.onDispose(() => {
      if (this.values.get(entity.id) === entity) {
        this.values.delete(entity.id);
        this.changed();
      }
    });
    this.changed();
    return entity;
  }
  get(id: string): EntityView | undefined {
    return this.values.get(id);
  }
  list(): readonly EntityView[] {
    return [...this.values.values()];
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
    for (const entity of [...this.values.values()]) entity.dispose();
    this.values.clear();
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
