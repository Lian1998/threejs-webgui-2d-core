import { DirtyRenderScheduler } from "@core/RenderScheduler";

type Constructor<T = object> = abstract new (...args: any[]) => T;
type GuiController = any;
type GuiFolder = any;

export type DebugGUIControlKind = "number" | "boolean" | "color" | "string" | "select" | "vector2" | "vector3" | "vector4" | "action";

export interface DebugGUIControlOptions {
  name?: string;
  folder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Record<string, any> | any[];
  listen?: boolean;
  order?: number;
  rgbScale?: number;
  onChange?: (value: any, instance: object, property: string) => void;
  onFinishChange?: (value: any, instance: object, property: string) => void;
}

export interface DebugGUIControlMeta extends DebugGUIControlOptions {
  kind: DebugGUIControlKind;
  property: string;
}

export interface DebugGUIMountOptions {
  title?: string;
  width?: number;
  container?: HTMLElement;
  autoPlace?: boolean;
  closed?: boolean;
}

/**
 * 装饰器元数据挂在构造函数上, 使用 Symbol.for 可以避免普通属性名冲突,
 * 同时在 HMR/多 bundle 场景下也能复用同一个 key。
 */
const DEBUG_GUI_METADATA = Symbol.for("webgui.debugGui.metadata");

const isDevMode = () => Boolean(import.meta.env?.DEV);

/** 只读取/创建当前类自己的元数据数组, 不直接混入父类, 继承合并由 getDebugGUIMetadata 统一处理。 */
const getOwnMeta = (ctor: Function): DebugGUIControlMeta[] => {
  if (!Object.prototype.hasOwnProperty.call(ctor, DEBUG_GUI_METADATA)) {
    Object.defineProperty(ctor, DEBUG_GUI_METADATA, { value: [], enumerable: false });
  }
  return ctor[DEBUG_GUI_METADATA] as DebugGUIControlMeta[];
};

/**
 * 收集实例或类上的 GUI 元数据。
 * 从父类到子类依次合并, 这样 Mixin/继承链上的调试字段都能显示,
 * 子类同名字段也能覆盖或避免重复显示。
 */
export const getDebugGUIMetadata = (instanceOrCtor: object | Function): DebugGUIControlMeta[] => {
  const ctor = typeof instanceOrCtor === "function" ? instanceOrCtor : instanceOrCtor.constructor;
  const chain: Function[] = [];
  let cursor: any = ctor;

  while (cursor && cursor !== Function.prototype) {
    chain.unshift(cursor);
    const proto = Object.getPrototypeOf(cursor.prototype);
    cursor = proto?.constructor;
  }

  const result: DebugGUIControlMeta[] = [];
  const used = new Set<string>();

  for (const item of chain) {
    const list = (item as any)[DEBUG_GUI_METADATA] as DebugGUIControlMeta[] | undefined;
    if (!list) continue;
    for (const meta of list) {
      const key = `${meta.folder ?? ""}/${meta.property}`;
      if (used.has(key)) continue;
      used.add(key);
      result.push(meta);
    }
  }

  return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

/** 生成属性/方法装饰器, 装饰器本身只登记元数据, 不创建 lil-gui 控件。 */
const createDecorator = (kind: DebugGUIControlKind, options: DebugGUIControlOptions = {}): PropertyDecorator & MethodDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    const ctor = target.constructor;
    const meta = getOwnMeta(ctor);
    const property = String(propertyKey);
    const existed = meta.find((item) => item.property === property && item.folder === options.folder);
    const next = { ...options, kind, property };

    if (existed) Object.assign(existed, next);
    else meta.push(next);
  };
};

/** 对外暴露一组语义化装饰器, 使用时比手写 kind 字符串更直观。 */
export const DebugGUI = {
  number: (options?: DebugGUIControlOptions) => createDecorator("number", options),
  boolean: (options?: DebugGUIControlOptions) => createDecorator("boolean", options),
  color: (options?: DebugGUIControlOptions) => createDecorator("color", options),
  string: (options?: DebugGUIControlOptions) => createDecorator("string", options),
  select: (options?: DebugGUIControlOptions) => createDecorator("select", options),
  vector2: (options?: DebugGUIControlOptions) => createDecorator("vector2", options),
  vector3: (options?: DebugGUIControlOptions) => createDecorator("vector3", options),
  vector4: (options?: DebugGUIControlOptions) => createDecorator("vector4", options),
  action: (options?: DebugGUIControlOptions) => createDecorator("action", options),
};

export const GuiNumber = DebugGUI.number;
export const GuiBoolean = DebugGUI.boolean;
export const GuiColor = DebugGUI.color;
export const GuiString = DebugGUI.string;
export const GuiSelect = DebugGUI.select;
export const GuiVector2 = DebugGUI.vector2;
export const GuiVector3 = DebugGUI.vector3;
export const GuiVector4 = DebugGUI.vector4;
export const GuiAction = DebugGUI.action;

/**
 * 开发环境实例注册容器。
 * 注意这里不负责实例生命周期业务逻辑, 只记录“可以被 GUI 扫描”的对象引用。
 */
export class DebugGUIRegistry {
  private static readonly instances = new Set<object>();
  private static readonly listeners = new Set<(instance: object) => void>();

  static register(instance: object): void {
    // 生产环境不保存实例引用, 避免调试系统影响内存和打包后的行为。
    if (!isDevMode() || !instance) return;
    if (this.instances.has(instance)) return;
    this.instances.add(instance);
    for (const listener of this.listeners) listener(instance);
  }

  static unregister(instance: object): void {
    this.instances.delete(instance);
  }

  static getInstances(): object[] {
    return Array.from(this.instances);
  }

  static onRegister(listener: (instance: object) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Mixin: 构造对象时自动注册到 DebugGUIRegistry。
 * 适合 Material、Mesh、业务设备类这类希望开发期自动出现在面板里的对象。
 */
export const WithDebugGUI = <TBase extends Constructor>(Base: TBase) => {
  abstract class WithDebugGUIClass extends Base {
    constructor(...args: any[]) {
      super(...args);
      DebugGUIRegistry.register(this);
    }

    unregisterDebugGUI(): void {
      DebugGUIRegistry.unregister(this);
    }
  }

  return WithDebugGUIClass;
};

/**
 * lil-gui 面板管理器。
 * 它负责把“装饰器元数据 + 已注册实例”转换成真实 GUI 控件。
 */
export class DebugGUIManager {
  static readonly instance = new DebugGUIManager();

  gui: GuiFolder | undefined;
  private rootFolders = new Map<object, GuiFolder>();
  private folderCache = new WeakMap<GuiFolder, Map<string, GuiFolder>>();
  private unsubscribeRegister: (() => void) | undefined;

  async mount(options: DebugGUIMountOptions = {}): Promise<this> {
    if (!isDevMode()) return this;
    if (this.gui) return this;

    // 动态导入让 lil-gui 只在开发期需要时加载, 避免主包固定携带调试 UI。
    const { GUI } = await import("three_addons/libs/lil-gui.module.min.js");
    this.gui = new GUI({
      title: options.title ?? "WebGUI Debug",
      width: options.width ?? 320,
      container: options.container,
      autoPlace: options.autoPlace ?? options.container === undefined,
    });

    if (options.closed ?? false) this.gui.close();

    // mount 前已经创建的对象补建面板, mount 后创建的对象通过 onRegister 增量加入。
    for (const instance of DebugGUIRegistry.getInstances()) this.addInstance(instance);
    this.unsubscribeRegister = DebugGUIRegistry.onRegister((instance) => this.addInstance(instance));

    return this;
  }

  destroy(): void {
    this.unsubscribeRegister?.();
    this.unsubscribeRegister = undefined;
    this.rootFolders.clear();
    this.folderCache = new WeakMap();
    this.gui?.destroy();
    this.gui = undefined;
  }

  /** 当装饰器元数据或实例显示名发生变化时, 可以重建单个实例的控件树。 */
  refresh(instance: object): void {
    const folder = this.rootFolders.get(instance);
    if (folder) {
      folder.destroy();
      this.rootFolders.delete(instance);
    }
    this.addInstance(instance);
  }

  private addInstance(instance: object): void {
    if (!this.gui || this.rootFolders.has(instance)) return;

    const metadata = getDebugGUIMetadata(instance);
    if (metadata.length === 0) return;

    const label = this.getInstanceLabel(instance);
    const folder = this.gui.addFolder(label);
    this.rootFolders.set(instance, folder);

    for (const meta of metadata) this.addControl(folder, instance, meta);
  }

  private getInstanceLabel(instance: object): string {
    const ctorName = instance.constructor?.name || "Object";
    const sequenceGetter = (instance as any).getSequence;
    const sequence = typeof sequenceGetter === "function" ? sequenceGetter.call(instance) : undefined;
    return Number.isInteger(sequence) && sequence >= 0 ? `${ctorName} #${sequence}` : ctorName;
  }

  /** 支持 "Material/Line" 这种路径写法, 自动创建并缓存嵌套 folder。 */
  private getFolder(parent: GuiFolder, path?: string): GuiFolder {
    if (!path) return parent;

    const parts = path
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean);
    let cursor = parent;

    for (const part of parts) {
      let cache = this.folderCache.get(cursor);
      if (!cache) {
        cache = new Map();
        this.folderCache.set(cursor, cache);
      }

      let next = cache.get(part);
      if (!next) {
        next = cursor.addFolder(part);
        cache.set(part, next);
      }
      cursor = next;
    }

    return cursor;
  }

  private addControl(root: GuiFolder, instance: object, meta: DebugGUIControlMeta): void {
    const folder = this.getFolder(root, meta.folder);
    const name = meta.name ?? meta.property;
    let controller: GuiController | undefined;

    try {
      if (meta.kind === "color") {
        controller = folder.addColor(instance, meta.property, meta.rgbScale ?? 1).name(name);
      } else if (meta.kind === "select") {
        controller = folder.add(instance, meta.property, meta.options ?? []).name(name);
      } else if (meta.kind === "action") {
        controller = folder.add(instance, meta.property).name(name);
      } else if (meta.kind === "vector2" || meta.kind === "vector3" || meta.kind === "vector4") {
        // Vector 类对象本身不是 lil-gui 的基础类型, 拆成 x/y/z/w 子字段更便于调试。
        this.addVectorControls(folder, instance, meta, name);
        return;
      } else if (meta.kind === "number") {
        controller = folder.add(instance, meta.property, meta.min, meta.max, meta.step).name(name);
      } else {
        controller = folder.add(instance, meta.property).name(name);
      }
    } catch (error) {
      console.warn(`[DebugGUI] skip ${meta.property}`, error);
      return;
    }

    this.configureController(controller, instance, meta);
  }

  private addVectorControls(folder: GuiFolder, instance: object, meta: DebugGUIControlMeta, name: string): void {
    const value = (instance as any)[meta.property];
    if (!value) return;

    const vectorFolder = folder.addFolder(name);
    const keys = meta.kind === "vector2" ? ["x", "y"] : meta.kind === "vector3" ? ["x", "y", "z"] : ["x", "y", "z", "w"];

    for (const key of keys) {
      const controller = vectorFolder.add(value, key, meta.min, meta.max, meta.step).name(key);
      this.configureController(controller, instance, meta);
    }
  }

  private configureController(controller: GuiController, instance: object, meta: DebugGUIControlMeta): void {
    controller.onChange?.((value: any) => {
      meta.onChange?.(value, instance, meta.property);
      // GUI 修改任何可视属性后都标记一帧, 面板调参时不需要业务代码手动 render。
      DirtyRenderScheduler.invalidateDefault(`gui:${instance.constructor?.name}.${meta.property}`);
    });

    controller.onFinishChange?.((value: any) => {
      meta.onFinishChange?.(value, instance, meta.property);
      DirtyRenderScheduler.invalidateDefault(`gui-finish:${instance.constructor?.name}.${meta.property}`);
    });

    if (meta.listen) controller.listen?.();
  }
}
