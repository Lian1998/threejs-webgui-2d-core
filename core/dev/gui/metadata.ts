declare const __WEBGUI_DEBUG__: boolean;

export type DebugControlKind = "number" | "boolean" | "color" | "string" | "select" | "vec2" | "action";
export interface DebugFieldOptions {
  kind: DebugControlKind;
  name?: string;
  folder?: string;
  order?: number;
  min?: number;
  max?: number;
  step?: number;
  choices?: readonly string[];
  readOnly?: boolean;
  read?: (instance: object) => unknown;
  write?: (instance: object, value: unknown) => void;
}
export interface DebugFieldMetadata extends DebugFieldOptions {
  property: string | symbol;
}
const fieldsSymbol = Symbol("webgui.debug.fields");
export function isDebugEnabled(): boolean {
  return typeof __WEBGUI_DEBUG__ !== "undefined" && __WEBGUI_DEBUG__;
}

/** 显式字段元数据, 不依赖被编译擦除的 TypeScript 接口或 reflect-metadata. */
export function DebugField(options: DebugFieldOptions): PropertyDecorator & MethodDecorator {
  return ((target: object, property: string | symbol) => {
    if (!isDebugEnabled()) return;
    if (!Object.prototype.hasOwnProperty.call(target, fieldsSymbol)) {
      Object.defineProperty(target, fieldsSymbol, {
        value: new Map<string | symbol, DebugFieldMetadata>(),
        configurable: true,
      });
    }
    (target[fieldsSymbol] as Map<string | symbol, DebugFieldMetadata>).set(property, {
      ...options,
      choices: options.choices ? [...options.choices] : undefined,
      property,
    });
  }) as PropertyDecorator & MethodDecorator;
}

export function getDebugFields(instance: object): readonly DebugFieldMetadata[] {
  if (!isDebugEnabled()) return [];
  const prototypes: object[] = [];
  let prototype: object | null = Object.getPrototypeOf(instance);
  while (prototype && prototype !== Object.prototype) {
    prototypes.unshift(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }
  const fields = new Map<string | symbol, DebugFieldMetadata>();
  for (const current of prototypes) {
    if (!Object.prototype.hasOwnProperty.call(current, fieldsSymbol)) continue;
    for (const [key, value] of current[fieldsSymbol] as Map<string | symbol, DebugFieldMetadata>) fields.set(key, { ...value, choices: value.choices ? [...value.choices] : undefined });
  }
  return [...fields.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
