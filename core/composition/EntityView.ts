import { Matrix4, Quaternion, Vector3 } from "three";
import type { CommonOptions, PrimitiveHandle, Transform2D, TransformTarget, Vec2 } from "../contracts";

export interface EntityOptions {
  id: string;
  transform?: Partial<Transform2D>;
}
// 归属保存在图元本身, 跨 EntityRegistry 也可检测重复 attach, 无需全局实例注册表.
const entityOwner = Symbol("webgui.entity.owner");
interface PartPrimitive extends PrimitiveHandle<CommonOptions> {
  [entityOwner]?: EntityView;
  setParentMatrix(matrix: Matrix4 | null, parentVisible?: boolean): void;
  getEffectiveMatrix(): Matrix4;
}
interface Part {
  handle: PartPrimitive;
  unsubscribe: () => void;
}

/** 逻辑设备的部件容器, 不创建 Three.Group, 支持部件跨图层.
 * Matrix4 父变换与部件局部变换相乘后交给渲染, ownerId/partId 单独表达业务归属. */
export class EntityView implements TransformTarget {
  readonly id: string;
  private value: Transform2D;
  private readonly matrix = new Matrix4();
  private readonly parts = new Map<string, Part>();
  private readonly disposeListeners = new Set<() => void>();
  private visible = true;
  private disposedValue = false;

  constructor(
    options: EntityOptions,
    private readonly ownership = new WeakMap<PrimitiveHandle, EntityView>(),
  ) {
    if (!options.id) throw new Error("Entity id must not be empty");
    this.id = options.id;
    this.value = {
      position: options.transform?.position ? [...options.transform.position] : [0, 0],
      rotation: options.transform?.rotation ?? 0,
      scale: options.transform?.scale ? [...options.transform.scale] : [1, 1],
      height: options.transform?.height ?? 0,
    };
    this.validate(this.value);
    this.updateMatrix();
  }

  get disposed(): boolean {
    return this.disposedValue;
  }
  get isVisible(): boolean {
    return this.visible;
  }
  get transform(): Readonly<Transform2D> {
    return { ...this.value, position: [...this.value.position], scale: [...this.value.scale] };
  }

  /** 登记业务归属并注入父矩阵, 不改变部件图层, 同一图元只能归属一个设备. */
  addPart(name: string, handle: PrimitiveHandle<CommonOptions>): this {
    this.assertAlive();
    if (!name || this.parts.has(name)) throw new Error(`Duplicate or empty entity part: ${name}`);
    if (handle.disposed) throw new Error("Cannot attach a disposed primitive");
    if (this.ownership.has(handle)) throw new Error("A primitive already belongs to an entity");
    const primitive = handle as PartPrimitive;
    if (primitive[entityOwner]) throw new Error("A primitive already belongs to an entity");
    if (!Object.isExtensible(primitive)) throw new Error("Primitive must allow composition ownership metadata");
    if (typeof primitive.setParentMatrix !== "function" || typeof primitive.getEffectiveMatrix !== "function") {
      throw new Error("Primitive does not support parent composition");
    }
    primitive.update({ ownerId: this.id, partId: name });
    primitive.setParentMatrix(this.matrix, this.visible);
    const unsubscribe = primitive.onDispose(() => {
      this.parts.delete(name);
      this.ownership.delete(primitive);
      if (primitive[entityOwner] === this) delete primitive[entityOwner];
    });
    Object.defineProperty(primitive, entityOwner, { value: this, configurable: true });
    this.parts.set(name, { handle: primitive, unsubscribe });
    this.ownership.set(handle, this);
    return this;
  }

  getPart(name: string): PrimitiveHandle<CommonOptions> | undefined {
    return this.parts.get(name)?.handle;
  }

  /** 默认保留世界姿态后分离; 含剪切的矩阵无法用普通 TRS 表示时拒绝分离. */
  removePart(name: string, options: { dispose?: boolean } = {}): void {
    this.assertAlive();
    const part = this.parts.get(name);
    if (!part) return;
    let transform: Transform2D | undefined;
    if (!options.dispose && !part.handle.disposed) transform = this.decomposeWithoutShear(part.handle.getEffectiveMatrix());
    this.parts.delete(name);
    part.unsubscribe();
    this.ownership.delete(part.handle);
    if (part.handle[entityOwner] === this) delete part.handle[entityOwner];
    if (options.dispose) part.handle.dispose();
    else if (!part.handle.disposed) {
      part.handle.setParentMatrix(null);
      part.handle.update({ transform, ownerId: undefined, partId: undefined });
    }
  }

  setPosition(position: Vec2): this {
    return this.setTransform({ position });
  }
  setRotation(radians: number): this {
    return this.setTransform({ rotation: radians });
  }
  setScale(scale: Vec2): this {
    return this.setTransform({ scale });
  }
  setHeight(height: number): this {
    return this.setTransform({ height });
  }

  setTransform(patch: Partial<Transform2D>): this {
    this.assertAlive();
    const next = {
      ...this.value,
      ...patch,
      position: patch.position ? ([...patch.position] as Vec2) : this.value.position,
      scale: patch.scale ? ([...patch.scale] as Vec2) : this.value.scale,
    };
    this.validate(next);
    if (next.position[0] === this.value.position[0] && next.position[1] === this.value.position[1] && next.rotation === this.value.rotation && next.scale[0] === this.value.scale[0] && next.scale[1] === this.value.scale[1] && next.height === this.value.height) return this;
    this.value = next;
    this.updateMatrix();
    this.syncParts();
    return this;
  }

  setVisible(visible: boolean): this {
    this.assertAlive();
    if (this.visible === visible) return this;
    this.visible = visible;
    this.syncParts();
    return this;
  }

  onDispose(listener: () => void): () => void {
    this.assertAlive();
    this.disposeListeners.add(listener);
    return () => {
      this.disposeListeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.disposedValue) return;
    this.disposedValue = true;
    const listeners = [...this.disposeListeners];
    this.disposeListeners.clear();
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    }
    for (const part of [...this.parts.values()]) {
      part.unsubscribe();
      this.ownership.delete(part.handle);
      if (part.handle[entityOwner] === this) delete part.handle[entityOwner];
      try {
        part.handle.dispose();
      } catch (error) {
        console.error(error);
      }
    }
    this.parts.clear();
  }

  private updateMatrix(): void {
    const { position, rotation, scale, height } = this.value;
    this.matrix.compose(new Vector3(position[0], height, -position[1]), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotation), new Vector3(scale[0], 1, scale[1]));
  }
  private syncParts(): void {
    for (const part of this.parts.values()) if (!part.handle.disposed) part.handle.setParentMatrix(this.matrix, this.visible);
  }
  private validate(value: Transform2D): void {
    if (value.position.length !== 2 || value.scale.length !== 2 || ![...value.position, ...value.scale, value.rotation, value.height].every(Number.isFinite) || value.scale.some((value) => value === 0)) throw new Error("Invalid entity transform");
  }
  private assertAlive(): void {
    if (this.disposedValue) throw new Error("EntityView has been disposed");
  }

  private decomposeWithoutShear(matrix: Matrix4): Transform2D {
    const x = new Vector3().setFromMatrixColumn(matrix, 0);
    const z = new Vector3().setFromMatrixColumn(matrix, 2);
    const xLength = x.length(),
      zLength = z.length();
    // 先验证可分解性, 零轴会使 Matrix4.decompose 产生 NaN, 不能先改归属再失败.
    if (!Number.isFinite(xLength) || !Number.isFinite(zLength) || xLength === 0 || zLength === 0) {
      throw new Error("Cannot detach a part with a collapsed or invalid axis; restore a nonzero finite scale first");
    }
    if (Math.abs(x.dot(z)) > xLength * zLength * 1e-7) {
      throw new Error("Cannot preserve a sheared part when detaching; dispose it or remove the shear first");
    }
    const position = new Vector3(),
      rotation = new Quaternion(),
      scale = new Vector3();
    matrix.decompose(position, rotation, scale);
    const radians = 2 * Math.atan2(rotation.y, rotation.w);
    if (![...position.toArray(), ...rotation.toArray(), ...scale.toArray(), radians].every(Number.isFinite)) {
      throw new Error("Cannot detach this part because its effective transform cannot be decomposed into finite values");
    }
    return { position: [position.x, -position.z], rotation: radians, scale: [scale.x, scale.z], height: position.y };
  }
}
