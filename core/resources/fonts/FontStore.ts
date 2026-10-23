import type { ResourceLease } from "../../contracts";
import { ResourceStore } from "../ResourceStore";

export interface FontSource {
  id: string;
  url: string;
  family: string;
  weight?: string;
  style?: string;
  fallbackIds?: readonly string[];
  coverage?: readonly string[];
}
export interface LoadedFont {
  readonly source: FontSource;
  readonly family: string;
  readonly face: FontFace;
}
let storeSequence = 0;

/** 借助 ResourceStore 加载 FontFace, 按 Viewer 隔离内部 family 并注册到 document.fonts.
 * 提供字体和 coverage 声明, 字形光栅化由 GlyphAtlas 负责. */
export class FontStore {
  private readonly sources = new Map<string, FontSource>();
  private readonly familyPrefix = `webgui_${++storeSequence}_`;
  private disposed = false;
  constructor(private readonly resources: ResourceStore) {}

  register(source: FontSource): void {
    if (this.disposed) throw new Error("FontStore has been disposed");
    if (!source.id || !source.url || !source.family) throw new Error("Font id, local URL and family are required");
    const previous = this.sources.get(source.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(source)) throw new Error(`Font id already registered: ${source.id}`);
    this.sources.set(source.id, {
      ...source,
      fallbackIds: source.fallbackIds && [...source.fallbackIds],
      coverage: source.coverage && [...source.coverage],
    });
  }
  getSource(id: string): FontSource {
    const source = this.sources.get(id);
    if (!source) throw new Error(`Font is not registered: ${id}`);
    return source;
  }
  acquire(id: string, signal?: AbortSignal): Promise<ResourceLease<LoadedFont>> {
    if (this.disposed) return Promise.reject(new Error("FontStore has been disposed"));
    const source = this.getSource(id);
    const variant = JSON.stringify([source.url, source.weight ?? "normal", source.style ?? "normal"]);
    return this.resources.acquire<LoadedFont>(
      `font:${this.familyPrefix}${id}:${variant}`,
      async (loadSignal) => {
        const response = await fetch(source.url, { signal: loadSignal });
        if (!response.ok) throw new Error(`Font load failed (${response.status}): ${source.url}`);
        const data = await response.arrayBuffer();
        let hash = 2166136261;
        for (const character of variant) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
        const family = this.familyPrefix + [...id].map((character) => character.codePointAt(0)!.toString(16)).join("_") + "_" + (hash >>> 0).toString(16);
        const face = new FontFace(family, data, { weight: source.weight ?? "normal", style: source.style ?? "normal" });
        await face.load();
        if (loadSignal.aborted) throw new DOMException("Font load aborted", "AbortError");
        document.fonts.add(face);
        return { source, family, face };
      },
      (value) => document.fonts.delete(value.face),
      { signal },
    );
  }
  unregister(id: string): void {
    this.sources.delete(id);
  }
  dispose(): void {
    this.disposed = true;
    this.sources.clear();
  }
}
