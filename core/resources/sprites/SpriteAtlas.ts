import * as THREE from "three";
import type { ResourceLease, Vec2 } from "../../contracts";
import { ResourceStore } from "../ResourceStore";

export interface SpriteImageSource {
  id: string;
  url: string;
}
export interface SpriteRegion {
  readonly imageId: string;
  readonly bindingKey: string;
  readonly page: number;
  readonly uv: readonly [number, number, number, number];
  readonly sourceSize: Vec2;
  readonly contentSize: Vec2;
  readonly texture: THREE.DataTexture;
}
export interface SpriteAtlasOptions {
  pageSize?: number;
  maxPages?: number;
  padding?: number;
  maxTextureSize?: number;
  oversized?: "reject" | "downscale";
  invalidate?: () => void;
}
interface AtlasPage {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.DataTexture;
  data: Uint16Array;
  x: number;
  y: number;
  rowHeight: number;
  dirty: boolean;
}
interface ImageEntry {
  source: SpriteImageSource;
  controller: AbortController;
  loading?: Promise<SpriteRegion>;
  image?: ResourceLease<ImageBitmap>;
  region?: SpriteRegion;
  references: number;
  registered: boolean;
}

/** 页与 UV 只追加, 不重排仍被使用的区域. 注册和区域引用分别持有资源. */
export class SpriteAtlas {
  private readonly entries = new Map<string, ImageEntry>();
  private readonly pages: AtlasPage[] = [];
  private readonly size: number;
  private readonly padding: number;
  private disposed = false;
  private uploadedBytes = 0;

  constructor(
    private readonly resources: ResourceStore,
    private readonly options: SpriteAtlasOptions = {},
  ) {
    this.size = Math.min(options.pageSize ?? 1024, options.maxTextureSize ?? 4096);
    this.padding = options.padding ?? 2;
    if (!Number.isInteger(this.size) || this.size < 16 || !Number.isInteger(this.padding) || this.padding < 1 || this.padding * 2 >= this.size) throw new Error("Invalid sprite atlas pageSize/padding");
    if (!Number.isInteger(options.maxPages ?? 32) || (options.maxPages ?? 32) < 1) throw new Error("Invalid sprite atlas maxPages");
  }

  register(source: SpriteImageSource): void {
    this.assertActive();
    if (!source.id || !source.url) throw new Error("Image id and URL are required");
    const previous = this.entries.get(source.id);
    if (previous) {
      if (previous.source.url !== source.url) throw new Error(`Image id already registered with another URL: ${source.id}`);
      previous.registered = true;
      return;
    }
    this.entries.set(source.id, {
      source: { ...source },
      controller: new AbortController(),
      references: 0,
      registered: true,
    });
  }

  async acquire(imageId: string, signal?: AbortSignal): Promise<ResourceLease<SpriteRegion>> {
    this.assertActive();
    const entry = this.entries.get(imageId);
    if (!entry?.registered) throw new Error(`Image is not registered: ${imageId}`);
    if (signal?.aborted) throw abortError();
    const region = entry.region ?? (await waitFor(entry.loading ?? this.load(entry), signal));
    if (this.disposed || !entry.registered || signal?.aborted) throw abortError();
    entry.references++;
    let released = false;
    const owner = this;
    return {
      get value() {
        if (released || owner.disposed) throw new Error(`Released sprite region: ${imageId}`);
        return region;
      },
      release: () => {
        if (released) return;
        released = true;
        entry.references = Math.max(0, entry.references - 1);
        if (!entry.registered && !entry.references) this.releaseEntry(entry);
      },
    };
  }

  unregister(imageId: string): void {
    const entry = this.entries.get(imageId);
    if (!entry) return;
    entry.registered = false;
    // 使用中的精灵仍拥有区域 lease, 注销只阻止新的 acquire.
    if (!entry.references) this.releaseEntry(entry);
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
      pages: this.pages.length,
      images: this.entries.size,
      references: [...this.entries.values()].reduce((n, e) => n + e.references, 0),
      uploadedBytes: this.uploadedBytes,
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.entries.values()) this.releaseEntry(entry);
    this.entries.clear();
    for (const page of this.pages) {
      page.texture.dispose();
      page.canvas.width = page.canvas.height = 0;
    }
    this.pages.length = 0;
  }

  private load(entry: ImageEntry): Promise<SpriteRegion> {
    const task = this.resources
      .acquire<ImageBitmap>(
        `image:${entry.source.url}`,
        async (signal) => {
          const response = await fetch(entry.source.url, { signal });
          if (!response.ok) throw new Error(`Image load failed (${response.status}): ${entry.source.url}`);
          const blob = await response.blob();
          const bitmap = await decodeBitmap(blob);
          if (signal.aborted) {
            bitmap.close();
            throw abortError();
          }
          return bitmap;
        },
        (bitmap) => bitmap.close(),
        { signal: entry.controller.signal },
      )
      .then((lease) => {
        if (this.disposed || !entry.registered) {
          lease.release();
          throw abortError();
        }
        try {
          const region = this.insert(entry.source.id, lease.value);
          entry.image = lease;
          entry.region = region;
          this.options.invalidate?.();
          return region;
        } catch (error) {
          lease.release();
          throw error;
        }
      })
      .finally(() => {
        if (entry.loading === task) entry.loading = undefined;
      });
    entry.loading = task;
    return task;
  }

  private insert(imageId: string, image: ImageBitmap): SpriteRegion {
    const available = this.size - this.padding * 2;
    const ratio = Math.min(1, available / image.width, available / image.height);
    if (ratio < 1 && (this.options.oversized ?? "downscale") === "reject") throw new Error(`Image exceeds atlas page size: ${imageId}`);
    const width = Math.max(1, Math.floor(image.width * ratio));
    const height = Math.max(1, Math.floor(image.height * ratio));
    const blockWidth = width + this.padding * 2,
      blockHeight = height + this.padding * 2;
    let page = this.pages[this.pages.length - 1];
    if (!page) page = this.createPage();
    if (page.x + blockWidth > this.size) {
      page.x = 0;
      page.y += page.rowHeight;
      page.rowHeight = 0;
    }
    if (page.y + blockHeight > this.size) page = this.createPage();
    const x = page.x + this.padding,
      y = page.y + this.padding;
    const ctx = page.context;
    ctx.drawImage(image, x, y, width, height);
    const pixels = ctx.getImageData(x, y, width, height).data;
    // 先从 sRGB 转线性并预乘 alpha, 再采样插值. shader 还原直通 RGB 后统一输出,
    // 避免透明 PNG 边缘黑色 RGB 被插值后再次乘 alpha 产生暗边.
    const p = this.padding;
    for (let dy = -p; dy < height + p; dy++)
      for (let dx = -p; dx < width + p; dx++) {
        const sx = Math.max(0, Math.min(width - 1, dx)),
          sy = Math.max(0, Math.min(height - 1, dy));
        const source = (sy * width + sx) * 4,
          target = ((y + dy) * this.size + x + dx) * 4;
        const alpha = pixels[source + 3] / 255;
        for (let channel = 0; channel < 3; channel++) {
          const value = pixels[source + channel] / 255;
          const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          page.data[target + channel] = THREE.DataUtils.toHalfFloat(linear * alpha);
        }
        page.data[target + 3] = THREE.DataUtils.toHalfFloat(alpha);
      }
    page.x += blockWidth;
    page.rowHeight = Math.max(page.rowHeight, blockHeight);
    page.dirty = true;
    const index = this.pages.indexOf(page);
    return Object.freeze({
      imageId,
      bindingKey: `sprite:${page.texture.uuid}`,
      page: index,
      uv: Object.freeze([x / this.size, y / this.size, (x + width) / this.size, (y + height) / this.size]) as SpriteRegion["uv"],
      sourceSize: Object.freeze([image.width, image.height]) as Vec2,
      contentSize: Object.freeze([width, height]) as Vec2,
      texture: page.texture,
    });
  }

  private createPage(): AtlasPage {
    if (this.pages.length >= (this.options.maxPages ?? 32)) throw new Error("Sprite atlas page capacity exceeded");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = this.size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas2D is required for sprite atlases");
    // WebGL2 的 RGBA16F 可线性过滤, 不需要 32-bit float 的过滤扩展.
    // 半浮点保留暗色的线性值, 避免 RGBA8 在 sRGB 转线性后把 RGB 5-15 量化为 0.
    const data = new Uint16Array(this.size * this.size * 4);
    const texture = new THREE.DataTexture(data, this.size, this.size, THREE.RGBAFormat, THREE.HalfFloatType);
    texture.colorSpace = THREE.NoColorSpace; // 图片输入已在 CPU 端完成一次 sRGB -> linear.
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.premultiplyAlpha = false;
    const page = { canvas, context, texture, data, x: 0, y: 0, rowHeight: 0, dirty: true };
    this.pages.push(page);
    return page;
  }

  private releaseEntry(entry: ImageEntry): void {
    entry.controller.abort();
    entry.image?.release();
    entry.image = undefined;
    if (this.entries.get(entry.source.id) === entry) this.entries.delete(entry.source.id);
  }
  private assertActive(): void {
    if (this.disposed) throw new Error("SpriteAtlas has been disposed");
  }
}

function abortError(): Error {
  return new DOMException("Image acquisition aborted", "AbortError");
}
function waitFor<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(abortError());
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        if (!signal.aborted) resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

/** SVG 同样先由浏览器解码为位图, 不把 SVG DOM 或着色器代码带入渲染后端. */
async function decodeBitmap(blob: Blob): Promise<ImageBitmap> {
  if (!blob.type.includes("svg")) return createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) throw new Error("SVG requires finite intrinsic dimensions");
    ctx.drawImage(image, 0, 0);
    return await createImageBitmap(canvas, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
