import type { DirtyKind, LineHandle, LineOptions, PolygonGeometry, PolygonHandle, PolygonOptions, PrimitiveKind, PrimitiveOptions, SizeMode, SpriteHandle, SpriteOptions, TextHandle, TextOptions, Vec2, ColorInput } from "../contracts";
import type { LayerManager } from "../layers/LayerManager";
import { BasePrimitive, type PrimitiveContext } from "./PrimitiveHandle";
import { PrimitiveRegistry } from "./PrimitiveRegistry";

/** 多边形业务 API, setGeometry/setFill 统一进入 BasePrimitive.update. */
export class PolygonPrimitive extends BasePrimitive<PolygonOptions> implements PolygonHandle {
  setGeometry(geometry: PolygonGeometry): this {
    return this.update({ geometry });
  }
  setFill(fill: ColorInput): this {
    return this.update({ fill });
  }
}
/** 路径业务 API, 线宽和路径变化交给线后端编码, 不直接操作 Three.Line. */
export class LinePrimitive extends BasePrimitive<LineOptions> implements LineHandle {
  setPoints(points: readonly Vec2[]): this {
    return this.update({ points });
  }
  setColor(color: ColorInput): this {
    return this.update({ color });
  }
  setWidth(width: number): this {
    return this.update({ width });
  }
}
/** 精灵业务 API, 图片资源通过 ready 等待, 实际绘制由实例化四边形完成. */
export class SpritePrimitive extends BasePrimitive<SpriteOptions> implements SpriteHandle {
  setImage(image: string): this {
    return this.update({ image });
  }
  setSize(size: Vec2, sizeMode?: SizeMode): this {
    return this.update({ size, ...(sizeMode ? { sizeMode } : {}) });
  }
  setTint(tint: ColorInput): this {
    return this.update({ tint });
  }
}
/** 标签业务 API, setText 触发异步布局准备, ready 代表最新准备任务完成. */
export class TextPrimitive extends BasePrimitive<TextOptions> implements TextHandle {
  setText(text: string): this {
    return this.update({ text });
  }
}
/** 注入注册表, 图层验证, 资源准备和 invalidate 的创建入口.
 * 创建 handle 后立即登记逻辑身份, 图片/文字在后端异步 prepare, 不为每个 handle 创建 Mesh. */
export class PrimitiveFactory {
  private context: PrimitiveContext;
  constructor(
    readonly registry: PrimitiveRegistry,
    layers: LayerManager,
    private prepare: (handle: BasePrimitive<any>) => Promise<void>,
    private invalidate: () => void,
    private onError: (error: unknown) => void = (error) => console.error(error),
  ) {
    this.context = {
      validateLayer: (id) => layers.assert(id),
      changed: (handle, dirty) => {
        registry.mark(handle, dirty);
        if ((handle.kind === "sprite" || handle.kind === "text") && (dirty.has("resource") || dirty.has("geometry"))) this.prepareHandle(handle);
        invalidate();
      },
      removed: (handle) => {
        try {
          registry.remove(handle);
        } finally {
          invalidate();
        }
      },
      onError,
    };
  }
  addPolygon(options: PolygonOptions): PolygonPrimitive {
    return this.create(PolygonPrimitive, "polygon", options);
  }
  addLine(options: LineOptions): LinePrimitive {
    return this.create(LinePrimitive, "line", options);
  }
  addSprite(options: SpriteOptions): SpritePrimitive {
    return this.create(SpritePrimitive, "sprite", options);
  }
  addText(options: TextOptions): TextPrimitive {
    return this.create(TextPrimitive, "text", options);
  }
  get(id: string): BasePrimitive<any> | undefined {
    return this.registry.get(id);
  }
  private create<T extends PrimitiveOptions, H extends BasePrimitive<T>>(constructor: new (kind: PrimitiveKind, options: T, identity: ReturnType<PrimitiveRegistry["identity"]>, context: PrimitiveContext) => H, kind: PrimitiveKind, options: T): H {
    const identity = this.registry.identity(options.id);
    let handle: H;
    try {
      handle = new constructor(kind, options, identity, this.context);
    } catch (error) {
      this.registry.releaseIdentity(identity);
      throw error;
    }
    this.registry.add(handle);
    this.invalidate();
    if (kind === "sprite" || kind === "text") this.prepareHandle(handle);
    return handle;
  }
  private prepareHandle(handle: BasePrimitive<any>): void {
    const promise = this.prepare(handle).then(
      () => {
        if (!handle.disposed) handle.touch("style");
      },
      (error) => {
        if (!handle.disposed) this.onError(error);
        throw error;
      },
    );
    handle.setReady(promise);
  }
}
