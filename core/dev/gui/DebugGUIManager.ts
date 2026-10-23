import GUI, { type Controller } from "three/addons/libs/lil-gui.module.min.js";
import { DebugRegistry } from "./DebugRegistry";
import { getDebugFields, isDebugEnabled, type DebugFieldMetadata } from "./metadata";

export interface DebugGUIOptions {
  container?: HTMLElement;
  title?: string;
  onError?: (error: unknown) => void;
}
interface Binding {
  field: DebugFieldMetadata;
  model: Record<string, any>;
  properties: string[];
  controllers: Controller[];
}

/** 根据 DebugField 元数据为当前实例建立 lil-gui 控件.
 * 控件编辑的是独立 panel model, setter 经代理调用图元 API, 不直接修改冻结的状态快照. */
export class DebugGUIManager {
  readonly gui: GUI;
  private readonly selectorModel = { search: "", instance: "" };
  private selector: Controller;
  private folder?: GUI;
  private displayedId = "";
  private readonly bindings: Binding[] = [];
  private readonly unregister: () => void;
  private readonly errorElement: HTMLDivElement;
  private disposed = false;

  constructor(
    private readonly registry: DebugRegistry,
    private readonly options: DebugGUIOptions = {},
  ) {
    if (!isDebugEnabled()) throw new Error("Debug GUI is disabled in this build");
    this.gui = new GUI({ title: options.title ?? "图元调试", container: options.container, width: 340 });
    this.gui
      .add(this.selectorModel, "search")
      .name("搜索 ID/设备")
      .onChange(() => this.refreshChoices());
    this.selector = this.gui
      .add(this.selectorModel, "instance", { 未选择: "" })
      .name("实例")
      .onChange((value) => this.show(String(value)));
    this.errorElement = document.createElement("div");
    this.errorElement.style.cssText = "color:#ff8f8f;white-space:pre-wrap;padding:5px;font-size:11px";
    this.gui.domElement.append(this.errorElement);
    this.unregister = registry.onChange(() => {
      this.refreshChoices();
      if (this.selectorModel.instance && !registry.get(this.selectorModel.instance)) this.show(undefined);
    });
    this.refreshChoices();
  }

  get selectedId(): string | undefined {
    return this.selectorModel.instance || undefined;
  }

  show(id: string | undefined): void {
    if (this.disposed) return;
    const inspectable = id ? this.registry.get(id) : undefined;
    const nextId = inspectable?.debugId ?? "";
    if (this.displayedId === nextId && this.folder) {
      this.refresh();
      return;
    }
    this.folder?.destroy();
    this.folder = undefined;
    this.bindings.length = 0;
    this.selectorModel.instance = nextId;
    this.displayedId = nextId;
    this.errorElement.textContent = "";
    this.refreshChoices();
    if (!inspectable) return;
    this.folder = this.gui.addFolder(inspectable.label);
    const folders = new Map<string, GUI>();
    for (const [index, field] of getDebugFields(inspectable.target).entries()) {
      const parent = field.folder
        ? (folders.get(field.folder) ??
          (() => {
            const value = this.folder!.addFolder(field.folder!);
            folders.set(field.folder!, value);
            return value;
          })())
        : this.folder;
      const key = `field${index}`,
        model: Record<string, any> = {};
      const read = () => (field.read ? field.read(inspectable.target) : inspectable.target[field.property]);
      const write = (value: unknown) => {
        try {
          if (!this.registry.get(inspectable.debugId)) return;
          if (field.write) field.write(inspectable.target, value);
          else inspectable.target[field.property] = value;
          this.errorElement.textContent = "";
          this.refresh();
        } catch (error) {
          this.report(error);
          this.refresh();
        }
      };
      try {
        if (field.kind === "action") {
          model[key] = () => {
            try {
              if (field.write) field.write(inspectable.target, undefined);
              else (read() as (...args: never[]) => void).call(inspectable.target);
              this.refresh();
            } catch (error) {
              this.report(error);
            }
          };
          parent.add(model, key).name(field.name ?? String(field.property));
          continue;
        }
        const value = read();
        const controllers: Controller[] = [];
        const properties = field.kind === "vec2" ? ["x", "y"] : [key];
        if (field.kind === "vec2") {
          const pair = value as readonly number[];
          model.x = pair[0];
          model.y = pair[1];
          const vectorFolder = parent.addFolder(field.name ?? String(field.property));
          for (const property of properties) controllers.push(vectorFolder.add(model, property, field.min, field.max, field.step).onChange(() => write([model.x, model.y])));
        } else {
          model[key] = value;
          let controller: Controller;
          if (field.kind === "color") controller = parent.addColor(model, key);
          else if (field.kind === "select") controller = parent.add(model, key, [...(field.choices ?? [])]);
          else if (field.kind === "number") controller = parent.add(model, key, field.min, field.max, field.step);
          else controller = parent.add(model, key);
          controllers.push(controller.name(field.name ?? String(field.property)).onChange(write));
        }
        if (field.readOnly) controllers.forEach((controller) => controller.disable());
        this.bindings.push({ field, model, properties, controllers });
      } catch (error) {
        this.report(error);
      }
    }
    this.folder.open();
  }

  refresh(): void {
    if (this.disposed) return;
    const inspectable = this.registry.get(this.selectorModel.instance);
    if (!inspectable) return;
    for (const binding of this.bindings) {
      try {
        const value = binding.field.read ? binding.field.read(inspectable.target) : inspectable.target[binding.field.property];
        if (binding.field.kind === "vec2") {
          binding.model.x = (value as readonly number[])[0];
          binding.model.y = (value as readonly number[])[1];
        } else binding.model[binding.properties[0]] = value;
        binding.controllers.forEach((controller) => controller.updateDisplay());
      } catch (error) {
        this.report(error);
      }
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unregister();
    this.bindings.length = 0;
    this.folder = undefined;
    this.gui.destroy();
    this.errorElement.remove();
  }
  dispose(): void {
    this.destroy();
  }

  private refreshChoices(): void {
    if (this.disposed) return;
    const matches = this.registry.list(this.selectorModel.search);
    const values = [...matches.slice(0, 500)];
    const selected = this.registry.get(this.selectorModel.instance);
    if (selected && !values.includes(selected)) values.push(selected);
    const choices: Record<string, string> = { 未选择: "" };
    for (const value of values) choices[`${value.debugId} [${value.label}]`] = value.debugId;
    // lil-gui.options 会替换控制器并丢失回调, 必须重新绑定, 保持搜索框之后的位置.
    this.selector = this.selector.options(choices).onChange((value) => this.show(String(value)));
    this.gui.controllers[0]?.domElement.after(this.selector.domElement);
    this.selector.updateDisplay();
  }
  private report(error: unknown): void {
    this.errorElement.textContent = error instanceof Error ? error.message : String(error);
    try {
      this.options.onError?.(error);
    } catch (reportError) {
      console.error(reportError);
    }
  }
}
