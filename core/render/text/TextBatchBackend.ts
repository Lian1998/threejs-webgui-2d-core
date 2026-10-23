import * as THREE from "three";
import type { PrimitiveHandle, PrimitiveRenderBackend, RenderContext, RenderFeature, RenderItem, RenderPassKind, TextOptions, UploadStats } from "../../contracts";
import { GlyphAtlas } from "../../resources/fonts/GlyphAtlas";
import { colorComponents, pickComponents } from "../shared/material";
import { MAX_QUAD_INSTANCES, QuadBatch, type QuadInstance } from "../sprites/QuadBatch";
import { layoutSignature, layoutText, type TextLayout } from "./layoutText";

interface PreparedText {
  signature: string;
  layout: TextLayout;
}
interface Group {
  key: string;
  texture?: THREE.Texture;
  instances: QuadInstance[];
}

/** 先异步 layoutText, 再把背景和各字形转换为 QuadInstance, 交给 QuadBatch.
 * 标签可能跨纹理页和多个批次, 但每个字形携带相同逻辑 pickId, 对外仍是一个 handle. */
export class TextBatchBackend implements PrimitiveRenderBackend {
  readonly kind = "text" as const;
  readonly stats: UploadStats = { bytes: 0, ranges: 0, rebuiltBatches: 0 };
  private readonly prepared = new Map<string, PreparedText>();
  private readonly pending = new Map<string, { signature: string; promise: Promise<void>; token: object }>();
  private readonly batches = new Map<string, QuadBatch>();
  private readonly used = new Set<string>();
  private disposed = false;
  private layoutCount = 0;
  constructor(
    private readonly atlas: GlyphAtlas,
    private readonly onReady: () => void = () => {},
  ) {}

  prepare(handle: PrimitiveHandle<TextOptions>): Promise<void> {
    if (this.disposed) return Promise.reject(new Error("TextBatchBackend has been disposed"));
    const options = handle.getOptions();
    const signature = layoutSignature(options);
    if (this.prepared.get(handle.id)?.signature === signature && !this.pending.has(handle.id)) return Promise.resolve();
    const existing = this.pending.get(handle.id);
    if (existing?.signature === signature) return existing.promise;
    const token = {};
    const promise = layoutText(options, this.atlas)
      .then((layout) => {
        if (this.disposed || handle.disposed || this.pending.get(handle.id)?.token !== token) {
          layout.leases.forEach((lease) => lease.release());
          return;
        }
        const previous = this.prepared.get(handle.id);
        this.prepared.set(handle.id, { signature, layout });
        previous?.layout.leases.forEach((lease) => lease.release());
        this.layoutCount++;
        this.onReady();
      })
      .finally(() => {
        if (this.pending.get(handle.id)?.token === token) this.pending.delete(handle.id);
      });
    this.pending.set(handle.id, { signature, promise, token });
    return promise;
  }
  beginFrame(_pass: RenderPassKind): void {
    this.used.clear();
  }
  build(runKey: string, features: readonly RenderFeature[], context: RenderContext): readonly RenderItem[] {
    if (this.disposed) return [];
    const groups: Group[] = [];
    const append = (texture: THREE.Texture | undefined, instance: QuadInstance) => {
      let group = groups[groups.length - 1];
      if (!group || group.texture !== texture || group.instances.length >= MAX_QUAD_INSTANCES) {
        group = {
          key: `${context.pass}:${runKey}:${groups.length}:${texture?.uuid ?? "plain"}`,
          texture,
          instances: [],
        };
        groups.push(group);
      }
      group.instances.push(instance);
    };
    for (const feature of features) {
      const prepared = this.prepared.get(feature.handle.id);
      if (!prepared || !feature.visible || (context.pass === "pick" && !feature.pickable)) continue;
      const layout = prepared.layout;
      if (!layout.size[0] || !layout.size[1]) continue;
      const options = feature.options as Readonly<TextOptions>;
      const color = colorComponents(options.color ?? "#ffffff");
      const outline = colorComponents(options.outline?.color ?? options.color ?? "#ffffff");
      const common = {
        primitiveId: feature.handle.id,
        matrix: feature.matrix.elements,
        pick: pickComponents(feature.pickId),
        hit: [feature.hit.alphaThreshold, feature.hit.tolerancePx] as const,
        outline,
        bounds: 0,
      };
      const firstTexture = layout.glyphs[0]?.region.texture;
      const screen = options.sizeMode === "screen" ? 1 : 0;
      if (context.pass === "pick" && feature.hit.mode === "bounds") {
        append(firstTexture, {
          ...common,
          rect: layout.rect,
          uv: [0, 0, 1, 1],
          color: [...color, feature.opacity],
          style: [screen, 0, 0, 0],
          type: 3,
        });
        continue;
      }
      // 同一字形页的背景/文字共用实例 shader, 保持顺序同时避免每标签两次 draw.
      if (options.background && options.background.opacity > 0)
        append(firstTexture, {
          ...common,
          rect: layout.rect,
          uv: [0, 0, 1, 1],
          color: [...colorComponents(options.background.color), feature.opacity * options.background.opacity],
          style: [screen, options.background.radius, 0, 0],
          type: 2,
        });
      for (const glyph of layout.glyphs) {
        const region = glyph.region;
        const requestedOutline = ((options.outline?.width ?? 0) * region.rasterSize) / layout.fontSize;
        const availableOutline = Math.max(0, Math.min(region.sdfPadding - 1, region.radius * (1 - region.cutoff) - 1));
        append(region.texture, {
          ...common,
          rect: glyph.rect,
          uv: region.uv,
          color: [...color, feature.opacity],
          style: [screen, 0, 1 - region.cutoff, Math.min(requestedOutline, availableOutline) / region.radius],
          type: 1,
        });
      }
    }
    this.stats.bytes += this.atlas.flush(new Set(groups.map((group) => group.texture).filter((texture): texture is THREE.Texture => Boolean(texture))));
    return groups.map((group) => {
      let batch = this.batches.get(group.key);
      if (!batch) {
        batch = new QuadBatch(group.key, "text", group.texture, this.stats);
        this.batches.set(group.key, batch);
      }
      this.used.add(group.key);
      batch.sync(group.instances, context);
      return {
        object: batch.mesh,
        key: group.key,
        primitiveIds: [...new Set(group.instances.map((instance) => instance.primitiveId))],
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
  getLayout(id: string): TextLayout | undefined {
    return this.prepared.get(id)?.layout;
  }
  snapshot() {
    return {
      labels: this.prepared.size,
      glyphs: [...this.prepared.values()].reduce((n, value) => n + value.layout.glyphs.length, 0),
      layouts: this.layoutCount,
      batches: this.batches.size,
    };
  }
  remove(id: string): void {
    this.pending.delete(id);
    this.prepared.get(id)?.layout.leases.forEach((lease) => lease.release());
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
    for (const value of this.prepared.values()) value.layout.leases.forEach((lease) => lease.release());
    this.prepared.clear();
    this.pending.clear();
    for (const batch of this.batches.values()) batch.dispose();
    this.batches.clear();
    this.used.clear();
  }
}
