import * as THREE from "three";

export const SPRITE_PADDING = 8;
export const ATLAS_TEXTURE_SIZE = 1024;

import { DEBUG_SPRITE_ATLAS_BUFFER_RENDER_PERFORMANCE } from "./index";

type ImageProps = {
  url: string;
  image: HTMLImageElement;
  width: number; // 原始宽
  height: number; // 原始高
  scaledWidth?: number; // 放进 atlas 后的宽
  scaledHeight?: number; // 放进 atlas 后的高
  scale?: number; // 缩放比例(<=1.0)
};

type SpriteAtlasProperty = {
  page: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  imageProps: ImageProps;
};

export class SpriteAtlas {
  /** 烘焙贴图标记 */ static prepared: boolean = false;

  private static _instance: SpriteAtlas | null = null;

  /** atlas pages(可能有多页) */
  private atlasCanvases: HTMLCanvasElement[] = [];
  private atlasCtxs: (CanvasRenderingContext2D | null)[] = [];

  /** sprite 映射表 */
  spriteMap: Map<string, SpriteAtlasProperty> = new Map();

  private constructor() {
    this.createNewPage(); // 初始创建第一页
  }

  /** 获取单例 */
  static getInstance(): SpriteAtlas {
    if (!SpriteAtlas._instance) SpriteAtlas._instance = new SpriteAtlas();
    return SpriteAtlas._instance;
  }

  /** 保证资源被初始化 */
  private static ensurePrepared() {
    if (!SpriteAtlas.prepared) {
      throw new Error("SpriteAtlas: 还未生成 sprite atlas 贴图, 请先调用 prepareSprite()");
    }
  }

  private createNewPage(): number {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_TEXTURE_SIZE;
    canvas.height = ATLAS_TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("SpriteAtlas: 当前浏览器不支持 Canvas 2D API, 无法获取 Canvas 2D Context");
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, ATLAS_TEXTURE_SIZE, ATLAS_TEXTURE_SIZE);

    this.atlasCanvases.push(canvas);
    this.atlasCtxs.push(ctx);
    return this.atlasCanvases.length - 1;
  }

  async prepareSprite(urls: string[] = []): Promise<void> {
    if (!urls || urls.length === 0) {
      SpriteAtlas.prepared = true;
      return;
    }

    const loader = new THREE.ImageLoader(); // 使用threejs默认的LoadingManager

    type Loaded = { url: string; image: HTMLImageElement; width: number; height: number };
    const loadedList: Loaded[] = [];
    const loadPromises = urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        loader.load(
          url,
          (image) => {
            loadedList.push({ url, image, width: image.width, height: image.height });
            resolve();
          },
          undefined,
          (err) => {
            // 如果某张图加载失败, 记录错误并继续(或选择 reject) -- 这里选择 reject, 以便调用者知道
            reject(new Error(`SpriteAtlas: 图片加载失败 ${url}`));
          },
        );
      });
    });
    await Promise.all(loadPromises);

    //  排序 使用最大长边排序以提高 packing 效率
    loadedList.sort((a, b) => {
      const ma = Math.max(a.width, a.height);
      const mb = Math.max(b.width, b.height);
      return mb - ma;
    });

    // 打包 使用按行放置的简单 Shelf 算法
    let pageIndex = 0;
    let currentX = SPRITE_PADDING;
    let currentY = SPRITE_PADDING;
    let rowHeight = 0;

    for (const item of loadedList) {
      const maxAllowedW = ATLAS_TEXTURE_SIZE - 2 * SPRITE_PADDING;
      const maxAllowedH = ATLAS_TEXTURE_SIZE - 2 * SPRITE_PADDING;

      // 计算是否需要缩放(等比缩放, 且在任一维度超限时缩小)
      let scale = 1;
      if (item.width > maxAllowedW || item.height > maxAllowedH) {
        scale = Math.min(maxAllowedW / item.width, maxAllowedH / item.height);
      }

      const scaledW = Math.max(1, Math.floor(item.width * scale));
      const scaledH = Math.max(1, Math.floor(item.height * scale));

      // 如果当前行放不下, 则换行
      if (currentX + scaledW + SPRITE_PADDING > ATLAS_TEXTURE_SIZE) {
        currentX = SPRITE_PADDING;
        currentY += rowHeight + SPRITE_PADDING;
        rowHeight = 0;
      }

      // 如果当前页高度不够放, 则新建页
      if (currentY + scaledH + SPRITE_PADDING > ATLAS_TEXTURE_SIZE) {
        pageIndex = this.createNewPage();
        currentX = SPRITE_PADDING;
        currentY = SPRITE_PADDING;
        rowHeight = 0;
      }

      // 绘制到当前页 canvas(如果 scale != 1 则在 drawImage 时缩放)
      const ctx = this.atlasCtxs[pageIndex];
      if (!ctx) throw new Error("SpriteAtlas: Canvas context 缺失");

      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(item.image, 0, 0, item.width, item.height, currentX, currentY, scaledW, scaledH);

      // 计算 UV(注意: u,v 均以 0..1 为范围, v 从顶端到下端)
      const u0 = currentX / ATLAS_TEXTURE_SIZE;
      const v0 = currentY / ATLAS_TEXTURE_SIZE;
      const u1 = (currentX + scaledW) / ATLAS_TEXTURE_SIZE;
      const v1 = (currentY + scaledH) / ATLAS_TEXTURE_SIZE;

      // 填入 spriteMap(包含 scaled info)
      const imageProps: ImageProps = {
        url: item.url,
        image: item.image,
        width: item.width,
        height: item.height,
        scaledWidth: scaledW,
        scaledHeight: scaledH,
        scale,
      };

      const prop: SpriteAtlasProperty = {
        page: pageIndex,
        u0,
        v0,
        u1,
        v1,
        imageProps,
      };

      this.spriteMap.set(item.url, prop);

      // advance cursor
      currentX += scaledW + SPRITE_PADDING;
      rowHeight = Math.max(rowHeight, scaledH);
    }

    SpriteAtlas.prepared = true;
  }

  /** 检查是否包含某贴图 */
  hasSprite(url: string): boolean {
    return this.spriteMap.has(url);
  }

  /** 获取贴图信息 */
  getSpriteAtlas(url: string): SpriteAtlasProperty {
    SpriteAtlas.ensurePrepared();
    const p = this.spriteMap.get(url);
    if (!p) throw new Error(`SpriteAtlas: sprite '${url}' 未找到`);
    return p;
  }

  /** 获取某一页的 canvas(默认第0页) */
  getPageCanvas(page: number = 0): HTMLCanvasElement {
    SpriteAtlas.ensurePrepared();
    const c = this.atlasCanvases[page];
    if (!c) throw new Error(`SpriteAtlas: page ${page} 不存在`);
    return c;
  }

  /** 返回所有页的 canvas 列表(只读拷贝) */
  getAllPages(): HTMLCanvasElement[] {
    SpriteAtlas.ensurePrepared();
    return this.atlasCanvases.slice();
  }

  /** 导出某页为 dataURL */
  toDataURL(page: number = 0, type: string = "image/png", quality?: any): string {
    const c = this.getPageCanvas(page);
    return c.toDataURL(type, quality);
  }

  /** 清除并允许重新生成(如果需要在运行时重新生成 atlas, 可调用此函数) */
  reset(): void {
    this.atlasCanvases.length = 0;
    this.atlasCtxs.length = 0;
    this.spriteMap.clear();

    // 重新创建第一页
    this.createNewPage();

    SpriteAtlas.prepared = false;
  }

  /** 如果需要彻底销毁单例(谨慎使用) */
  static destroyInstance(): void {
    if (SpriteAtlas._instance) {
      SpriteAtlas._instance.reset();
      SpriteAtlas._instance = null;
      SpriteAtlas.prepared = false;
    }
  }
}

export const spriteAtlas = SpriteAtlas.getInstance();
