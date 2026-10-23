import * as THREE from "three";
import TinySDF from "tiny-sdf";
import type { ResourceLease, Vec2 } from "../../contracts";
import { FontStore, type FontSource, type LoadedFont } from "./FontStore";

export interface GlyphRegion {
  readonly fontId: string;
  readonly glyph: string;
  readonly bindingKey: string;
  readonly page: number;
  readonly uv: readonly [number, number, number, number];
  readonly advance: number;
  readonly bearing: Vec2;
  readonly inkSize: Vec2;
  readonly bitmapSize: Vec2;
  readonly sdfPadding: number;
  readonly rasterSize: number;
  readonly radius: number;
  readonly cutoff: number;
  readonly texture: THREE.DataTexture;
  readonly fallback: boolean;
}
export interface GlyphAtlasOptions {
  pageSize?: number;
  maxPages?: number;
  rasterSize?: number;
  radius?: number;
  cutoff?: number;
  maxTextureSize?: number;
  invalidate?: () => void;
  ownsFontStore?: boolean;
}
interface GlyphPage {
  data: Uint8Array;
  texture: THREE.DataTexture;
  x: number;
  y: number;
  rowHeight: number;
  dirty: boolean;
}
interface FontState {
  id: string;
  source: FontSource;
  lease: ResourceLease<LoadedFont>;
  sdf: TinySDF;
  glyphs: Map<string, GlyphRegion>;
  references: number;
  registered: boolean;
}

/** 使用 TinySDF 光栅化字形, 记录 advance/bearing/UV, 写入单通道 DataTexture.
 * 按需追加字形并解析 fallback 字体, 页容量有上限, 已分配区域不重排. */
export class GlyphAtlas {
  private readonly states = new Map<string, FontState>();
  private readonly pending = new Map<string, Promise<FontState>>();
  private readonly pages: GlyphPage[] = [];
  private readonly controllers = new Map<string, AbortController>();
  private readonly size: number;
  private readonly rasterSize: number;
  private readonly radius: number;
  private readonly cutoff: number;
  private readonly buffer: number;
  private disposed = false;
  private generated = 0;
  private fallbacks = 0;
  private uploadedBytes = 0;
  /** 默认组合拥有 FontStore. 显式共享它时可传 ownsFontStore:false, 由外部最后持有者销毁. */
  constructor(
    readonly fonts: FontStore,
    private readonly options: GlyphAtlasOptions = {},
  ) {
    this.size = Math.min(options.pageSize ?? 1024, options.maxTextureSize ?? 4096);
    this.rasterSize = options.rasterSize ?? 64;
    this.radius = options.radius ?? 16;
    this.cutoff = options.cutoff ?? 0.25;
    this.buffer = Math.ceil(this.radius);
    if (!Number.isInteger(this.size) || this.size < 32 || !Number.isInteger(this.rasterSize) || this.rasterSize < 8 || this.rasterSize + this.buffer * 4 > this.size || !Number.isFinite(this.radius) || this.radius <= 0 || this.cutoff <= 0 || this.cutoff >= 1) throw new Error("Invalid glyph atlas configuration");
    if (!Number.isInteger(options.maxPages ?? 32) || (options.maxPages ?? 32) < 1) throw new Error("Invalid glyph atlas maxPages");
  }
  async register(source: FontSource): Promise<void> {
    this.fonts.register(source);
    await this.ready(source.id);
  }
  async ready(fontId: string): Promise<void> {
    await this.getState(fontId);
  }

  async acquire(fontId: string, glyph: string): Promise<ResourceLease<GlyphRegion>> {
    const state = await this.resolveFont(fontId, glyph, new Set());
    if (this.disposed) throw new Error("GlyphAtlas has been disposed");
    let region = state.glyphs.get(glyph);
    if (!region) {
      try {
        region = this.insert(state, glyph, false);
      } catch (error) {
        region = state.glyphs.get("□");
        if (!region) throw error;
        this.fallbacks++;
        region = Object.freeze({ ...region, fallback: true });
        state.glyphs.set(glyph, region);
      }
    }
    state.references++;
    let released = false;
    const owner = this;
    return {
      get value() {
        if (released || owner.disposed) throw new Error("Released glyph region");
        return region!;
      },
      release: () => {
        if (released) return;
        released = true;
        state.references = Math.max(0, state.references - 1);
        if (!state.registered && !state.references) {
          state.lease.release();
          if (this.states.get(state.id) === state) this.states.delete(state.id);
        }
      },
    };
  }

  async ensure(fontId: string, text: string): Promise<void> {
    const glyphs = new Set([...text.replace(/\r\n?/g, "\n")].filter((ch) => ch !== "\n" && ch !== "\t"));
    // 即使其中一个字失败, 已经成功的临时申请也各自释放, 不被 Promise.all 的短路吞掉.
    await Promise.all([...glyphs].map((ch) => this.acquire(fontId, ch).then((lease) => lease.release())));
  }
  unregister(fontId: string): void {
    this.controllers.get(fontId)?.abort();
    this.controllers.delete(fontId);
    this.pending.delete(fontId);
    const state = this.states.get(fontId);
    if (state) {
      state.registered = false;
      if (!state.references) {
        state.lease.release();
        this.states.delete(fontId);
      }
    }
    this.fonts.unregister(fontId);
  }
  flush(usedTextures?: ReadonlySet<THREE.Texture>): number {
    let bytes = 0;
    for (const page of this.pages)
      if (page.dirty && (!usedTextures || usedTextures.has(page.texture))) {
        page.texture.needsUpdate = true;
        page.dirty = false;
        bytes += page.data.byteLength;
      }
    this.uploadedBytes += bytes;
    return bytes;
  }
  contextRestored(): void {
    for (const page of this.pages) page.dirty = true;
    this.options.invalidate?.();
  }
  snapshot() {
    return {
      fonts: this.states.size,
      pages: this.pages.length,
      glyphs: this.generated,
      fallbacks: this.fallbacks,
      references: [...this.states.values()].reduce((n, s) => n + s.references, 0),
      uploadedBytes: this.uploadedBytes,
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
    for (const state of this.states.values()) state.lease.release();
    this.states.clear();
    this.pending.clear();
    for (const page of this.pages) page.texture.dispose();
    this.pages.length = 0;
    if (this.options.ownsFontStore !== false) this.fonts.dispose();
  }

  private async resolveFont(fontId: string, glyph: string, visited: Set<string>, allowPlaceholder = true): Promise<FontState> {
    if (visited.has(fontId)) throw new Error(`Cyclic font fallback: ${fontId}`);
    visited.add(fontId);
    const state = await this.getState(fontId);
    const source = state.source;
    if (!source.coverage || source.coverage.includes(glyph) || glyph === "□" || glyph.trim() === "") return state;
    for (const fallbackId of source.fallbackIds ?? []) {
      try {
        return await this.resolveFont(fallbackId, glyph, new Set(visited), false);
      } catch {
        /* 下一候选字体继续处理. */
      }
    }
    if (!allowPlaceholder) throw new Error(`Font does not cover glyph: ${fontId}/${glyph}`);
    // coverage 明确指出字体不含此字时只返回占位符, 不把系统字体静默当成指定字体.
    const fallback = state.glyphs.get("□");
    if (fallback) {
      state.glyphs.set(glyph, Object.freeze({ ...fallback, fallback: true }));
      this.fallbacks++;
    }
    return state;
  }

  private getState(fontId: string): Promise<FontState> {
    if (this.disposed) return Promise.reject(new Error("GlyphAtlas has been disposed"));
    const existing = this.states.get(fontId);
    if (existing?.registered) return Promise.resolve(existing);
    const loading = this.pending.get(fontId);
    if (loading) return loading;
    const registeredSource = this.fonts.getSource(fontId);
    const controller = new AbortController();
    this.controllers.set(fontId, controller);
    const task = this.fonts
      .acquire(fontId, controller.signal)
      .then((lease) => {
        if (this.disposed || controller.signal.aborted) {
          lease.release();
          throw new Error("GlyphAtlas font acquisition aborted");
        }
        const font = lease.value;
        const state: FontState = {
          id: fontId,
          source: registeredSource,
          lease,
          sdf: new TinySDF({
            fontSize: this.rasterSize,
            buffer: this.buffer,
            radius: this.radius,
            cutoff: this.cutoff,
            fontFamily: font.family,
            fontWeight: font.source.weight,
            fontStyle: font.source.style,
          }),
          glyphs: new Map(),
          references: 0,
          registered: true,
        };
        try {
          this.insert(state, "□", true);
          this.states.set(fontId, state);
          return state;
        } catch (error) {
          lease.release();
          throw error;
        }
      })
      .finally(() => {
        if (this.pending.get(fontId) === task) this.pending.delete(fontId);
        if (this.controllers.get(fontId) === controller) this.controllers.delete(fontId);
      });
    this.pending.set(fontId, task);
    return task;
  }

  private insert(state: FontState, glyph: string, fallback: boolean): GlyphRegion {
    const bitmap = state.sdf.draw(glyph);
    const { width, height } = bitmap;
    let page = this.pages[this.pages.length - 1];
    if (!page) page = this.createPage();
    const inset = 1;
    if (page.x + width + inset * 2 > this.size) {
      page.x = 0;
      page.y += page.rowHeight;
      page.rowHeight = 0;
    }
    if (page.y + height + inset * 2 > this.size) page = this.createPage();
    const x = page.x + inset,
      y = page.y + inset;
    for (let row = 0; row < height; row++) page.data.set(bitmap.data.subarray(row * width, (row + 1) * width), (y + row) * this.size + x);
    page.x += width + inset * 2;
    page.rowHeight = Math.max(page.rowHeight, height + inset * 2);
    page.dirty = true;
    const fontId = state.id;
    const region: GlyphRegion = Object.freeze({
      fontId,
      glyph,
      bindingKey: `glyph:${page.texture.uuid}`,
      page: this.pages.indexOf(page),
      uv: Object.freeze([x / this.size, y / this.size, (x + width) / this.size, (y + height) / this.size]) as GlyphRegion["uv"],
      advance: bitmap.glyphAdvance,
      bearing: Object.freeze([bitmap.glyphLeft, bitmap.glyphTop]) as Vec2,
      inkSize: Object.freeze([bitmap.glyphWidth, bitmap.glyphHeight]) as Vec2,
      bitmapSize: Object.freeze([width, height]) as Vec2,
      sdfPadding: this.buffer,
      rasterSize: this.rasterSize,
      radius: this.radius,
      cutoff: this.cutoff,
      texture: page.texture,
      fallback,
    });
    state.glyphs.set(glyph, region);
    this.generated++;
    this.options.invalidate?.();
    return region;
  }
  private createPage(): GlyphPage {
    if (this.pages.length >= (this.options.maxPages ?? 32)) throw new Error("Glyph atlas page capacity exceeded");
    const data = new Uint8Array(this.size * this.size);
    const texture = new THREE.DataTexture(data, this.size, this.size, THREE.RedFormat, THREE.UnsignedByteType);
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    const page = { data, texture, x: 0, y: 0, rowHeight: 0, dirty: true };
    this.pages.push(page);
    return page;
  }
}
