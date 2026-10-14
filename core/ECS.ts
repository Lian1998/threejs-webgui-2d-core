export type EntityId = number;

/**
 * 组件类型描述。
 * ECSWorld 用对象引用作为组件类型 key, name 只用于调试和错误信息。
 */
export interface ComponentType<T> {
  readonly name: string;
  /** 可选默认工厂, ensure(entity, type) 会在组件不存在时调用。 */
  create?: () => T;
}

/**
 * 某一种组件的稀疏存储。
 * Map<EntityId, Component> 足够直观, 适合当前 GUI/设备指针管理阶段;
 * 后续如果要极限性能, 可以在不改上层 API 的前提下替换成 TypedArray/SoA。
 */
export class ComponentStore<T> {
  readonly type: ComponentType<T>;
  private readonly data = new Map<EntityId, T>();

  constructor(type: ComponentType<T>) {
    this.type = type;
  }

  /** 写入或覆盖某个实体的组件。 */
  set(entity: EntityId, value: T): T {
    this.data.set(entity, value);
    return value;
  }

  /** 获取组件, 不存在时用 ComponentType.create 创建一个。 */
  ensure(entity: EntityId): T {
    const existed = this.data.get(entity);
    if (existed !== undefined) return existed;
    if (!this.type.create) throw new Error(`Component ${this.type.name} has no default factory`);
    const value = this.type.create();
    this.data.set(entity, value);
    return value;
  }

  get(entity: EntityId): T | undefined {
    return this.data.get(entity);
  }

  has(entity: EntityId): boolean {
    return this.data.has(entity);
  }

  delete(entity: EntityId): boolean {
    return this.data.delete(entity);
  }

  clear(): void {
    this.data.clear();
  }

  entries(): IterableIterator<[EntityId, T]> {
    return this.data.entries();
  }
}

/**
 * 轻量 ECS 世界。
 *
 * 核心思路:
 * 1. Entity 只是数字 id, 不承载业务状态。
 * 2. 状态分散存储在 ComponentStore 中, 便于批量遍历和后续迁移到 TypedArray。
 * 3. Object3D、业务设备、拾取 feature 等指针都可以作为组件挂到实体上。
 */
export class ECSWorld {
  private nextEntityId = 1;
  /** alive 用于防止给已销毁实体继续挂组件。 */
  private readonly alive = new Set<EntityId>();
  /** ComponentType 对象引用 -> 对应组件存储。 */
  private readonly stores = new Map<ComponentType<any>, ComponentStore<any>>();

  /** 创建一个空实体, 后续通过 add/ensure 挂组件。 */
  createEntity(): EntityId {
    const entity = this.nextEntityId++;
    this.alive.add(entity);
    return entity;
  }

  /** 销毁实体时从所有组件表中移除对应数据, 避免悬挂引用。 */
  destroyEntity(entity: EntityId): void {
    if (!this.alive.delete(entity)) return;
    for (const store of this.stores.values()) store.delete(entity);
  }

  isAlive(entity: EntityId): boolean {
    return this.alive.has(entity);
  }

  /** 获取某类组件的存储表, 不存在则延迟创建。 */
  store<T>(type: ComponentType<T>): ComponentStore<T> {
    let store = this.stores.get(type);
    if (!store) {
      store = new ComponentStore(type);
      this.stores.set(type, store);
    }
    return store;
  }

  add<T>(entity: EntityId, type: ComponentType<T>, value: T): T {
    this.assertAlive(entity);
    return this.store(type).set(entity, value);
  }

  ensure<T>(entity: EntityId, type: ComponentType<T>): T {
    this.assertAlive(entity);
    return this.store(type).ensure(entity);
  }

  get<T>(entity: EntityId, type: ComponentType<T>): T | undefined {
    return this.store(type).get(entity);
  }

  remove<T>(entity: EntityId, type: ComponentType<T>): boolean {
    return this.store(type).delete(entity);
  }

  query<T extends readonly ComponentType<any>[]>(...types: T): IterableIterator<[EntityId, { [K in keyof T]: T[K] extends ComponentType<infer V> ? V : never }]> {
    const world = this;

    // 以第一个组件表作为驱动集合, 只返回同时拥有所有请求组件的实体。
    function* iterator() {
      if (types.length === 0) return;

      const first = world.store(types[0]);
      for (const [entity] of first.entries()) {
        const values: any[] = [];
        let matched = true;

        for (const type of types) {
          const value = world.store(type).get(entity);
          if (value === undefined) {
            matched = false;
            break;
          }
          values.push(value);
        }

        if (matched) yield [entity, values as any] as [EntityId, any];
      }
    }

    return iterator();
  }

  /** 清空世界内所有实体和组件, 通常用于调试重置或场景切换。 */
  clear(): void {
    this.alive.clear();
    for (const store of this.stores.values()) store.clear();
  }

  private assertAlive(entity: EntityId): void {
    if (!this.alive.has(entity)) throw new Error(`Entity ${entity} is not alive`);
  }
}

/** 定义组件类型的小工具, 让调用处保持简洁且保留泛型信息。 */
export const defineComponent = <T>(name: string, create?: () => T): ComponentType<T> => ({ name, create });
