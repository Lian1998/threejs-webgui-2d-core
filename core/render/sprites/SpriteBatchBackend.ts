import type { PrimitiveHandle, PrimitiveRenderBackend, RenderContext, RenderFeature, RenderItem, RenderPassKind, ResourceLease, SpriteOptions, UploadStats } from "../../contracts";
import { SpriteAtlas, type SpriteRegion } from "../../resources/sprites/SpriteAtlas";
import { colorComponents, pickComponents } from "../shared/material";
import { MAX_QUAD_INSTANCES, QuadBatch, type QuadInstance } from "./QuadBatch";

interface PreparedSprite {
  imageId: string;
  lease: ResourceLease<SpriteRegion>;
}
/** 将已就绪的 SpriteRegion 和 handle 状态转为 QuadInstance, 按连续纹理页分批.
 * prepare 用请求 token 丢弃迟到图片, build 复用 QuadBatch, remove 释放区域 lease. */
export class SpriteBatchBackend implements PrimitiveRenderBackend {
  readonly kind = "sprite" as const;
  readonly stats: UploadStats = { bytes: 0, ranges: 0, rebuiltBatches: 0 };
  private readonly prepared = new Map<string, PreparedSprite>();
  private readonly pending = new Map<string, { imageId: string; promise: Promise<void>; token: object }>();
  private readonly batches = new Map<string, QuadBatch>();
  private readonly used = new Set<string>();
  private disposed = false;
  constructor(
    private readonly atlas: SpriteAtlas,
    private readonly onReady: () => void = () => {},
  ) {}

  prepare(handle: PrimitiveHandle<SpriteOptions>): Promise<void> {
    if (this.disposed) return Promise.reject(new Error("SpriteBatchBackend has been disposed"));
    const imageId = handle.getOptions().image;
    if (this.prepared.get(handle.id)?.imageId === imageId && !this.pending.has(handle.id)) return Promise.resolve();
    const existing = this.pending.get(handle.id);
    if (existing?.imageId === imageId) return existing.promise;
    const token = {};
    const promise = this.atlas
      .acquire(imageId)
      .then((lease) => {
        if (this.disposed || handle.disposed || this.pending.get(handle.id)?.token !== token) {
          lease.release();
          return;
        }
        const previous = this.prepared.get(handle.id);
        this.prepared.set(handle.id, { imageId, lease });
        previous?.lease.release();
        this.onReady();
      })
      .finally(() => {
        if (this.pending.get(handle.id)?.token === token) this.pending.delete(handle.id);
      });
    this.pending.set(handle.id, { imageId, promise, token });
    return promise;
  }
  beginFrame(_pass: RenderPassKind): void {
    this.used.clear();
  }
  build(runKey: string, features: readonly RenderFeature[], context: RenderContext): readonly RenderItem[] {
    if (this.disposed) return [];
    const groups: { key: string; region: SpriteRegion; instances: QuadInstance[] }[] = [];
    for (const feature of features) {
      const prepared = this.prepared.get(feature.handle.id);
      if (!prepared || !feature.visible || (context.pass === "pick" && !feature.pickable)) continue;
      const region = prepared.lease.value;
      let group = groups[groups.length - 1];
      if (!group || group.region.bindingKey !== region.bindingKey || group.instances.length >= MAX_QUAD_INSTANCES) {
        group = { key: `${context.pass}:${runKey}:${groups.length}:${region.bindingKey}`, region, instances: [] };
        groups.push(group);
      }
      const options = feature.options as Readonly<SpriteOptions>;
      const [w, h] = options.size,
        [ax, ay] = options.anchor ?? [0.5, 0.5];
      const tint = colorComponents(options.tint ?? "#ffffff");
      group.instances.push({
        primitiveId: feature.handle.id,
        matrix: feature.matrix.elements,
        rect: [-w * ax, -h * ay, w, h],
        uv: region.uv,
        color: [...tint, feature.opacity],
        pick: pickComponents(feature.pickId),
        hit: [feature.hit.alphaThreshold, feature.hit.tolerancePx],
        style: [options.sizeMode === "screen" ? 1 : 0, 0, 0, 0],
        outline: [0, 0, 0],
        bounds: feature.hit.mode === "bounds" ? 1 : 0,
      });
    }
    this.stats.bytes += this.atlas.flush(new Set(groups.map((group) => group.region.texture)));
    return groups.map((group) => {
      let batch = this.batches.get(group.key);
      if (!batch) {
        batch = new QuadBatch(group.key, "sprite", group.region.texture, this.stats);
        this.batches.set(group.key, batch);
      }
      this.used.add(group.key);
      batch.sync(group.instances, context);
      return {
        object: batch.mesh,
        key: group.key,
        primitiveIds: group.instances.map((instance) => instance.primitiveId),
      };
    });
  }
  endFrame(pass: RenderPassKind): void {
    for (const [key, batch] of this.batches)
      if (key.startsWith(`${pass}:`) && !this.used.has(key)) {
        batch.dispose();
        this.batches.delete(key);
      }
  }
  remove(id: string): void {
    this.pending.delete(id);
    this.prepared.get(id)?.lease.release();
    this.prepared.delete(id);
    for (const [key, batch] of this.batches)
      if (batch.removePrimitive(id)) {
        batch.dispose();
        this.batches.delete(key);
        this.used.delete(key);
      }
  }
  contextRestored(): void {
    this.atlas.contextRestored();
    for (const batch of this.batches.values()) batch.contextRestored();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const value of this.prepared.values()) value.lease.release();
    this.prepared.clear();
    this.pending.clear();
    for (const batch of this.batches.values()) batch.dispose();
    this.batches.clear();
    this.used.clear();
  }
}
