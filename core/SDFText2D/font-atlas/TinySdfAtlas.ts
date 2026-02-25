import TinySDF from "tiny-sdf";
import { SDF_FONT_SIZE } from "./tinySdfWrapper";
import { SDF_BUFFER } from "./tinySdfWrapper";
import { SDF_SIZE } from "./tinySdfWrapper";
import { tinySdfInstance } from "./tinySdfWrapper";
import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";

export const ATLAS_TEXTURE_SIZE = 1024; // 同你原始代码的常量

/** atlas 基本属性 */
export type AtlasProperty = {
  page: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  glyph: ReturnType<TinySDF["draw"]>;

  // tinySdfInstance.draw 返回参数含义如下:
  // data: 字形buffer(1维)
  // width: 字形buffer对应的width
  // height: 字形buffer对应的height
  // glyphWidth: 字形实际绘制区域的width
  // glyphHeight: 字形实际绘制区域的height
  // glyphTop: 字形顶部到baseline的像素距离
  // glyphLeft: 字形左边到当前光标位置的水平偏移
  // glyphAdvance: 绘制完当前字形后, 光标应当右移的距离
};

export class TinySDFAtlas {
  /** 单例标记(全局只生成一次) */
  static prepared: boolean = false;

  /** 常用基础字形(会自动合并到 prepareGlyph 的输入中) */
  static readonly commonGlyph = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789▢ ";

  private static _instance: TinySDFAtlas | null = null;

  /** atlas pages(可能有多页) */
  private atlasCanvases: HTMLCanvasElement[] = [];
  private atlasCtxs: (CanvasRenderingContext2D | null)[] = [];

  /** glyph 映射表 */
  glyphMap: Map<string, AtlasProperty> = new Map();

  private constructor() {
    // 初始创建第一页
    this.createNewPage();
  }

  /** 获取单例 */
  static getInstance(): TinySDFAtlas {
    if (!TinySDFAtlas._instance) TinySDFAtlas._instance = new TinySDFAtlas();
    return TinySDFAtlas._instance;
  }

  private static ensurePrepared() {
    if (!TinySDFAtlas.prepared) {
      throw new Error("TinySDFAtlas: 还未生成 tinysdf 的 glyph atlas 贴图, 请先调用 prepareGlyph()");
    }
  }

  private createNewPage(): number {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_TEXTURE_SIZE;
    canvas.height = ATLAS_TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("TinySDFAtlas: 当前浏览器不支持 Canvas 2D API, 无法获取 Canvas 2D Context");
    ctx.fillStyle = "black"; // 背景设为黑, 有字形的地方有数值
    ctx.fillRect(0, 0, ATLAS_TEXTURE_SIZE, ATLAS_TEXTURE_SIZE);

    this.atlasCanvases.push(canvas);
    this.atlasCtxs.push(ctx);
    return this.atlasCanvases.length - 1;
  }

  /**
   * 预加载字形并烘焙到 atlas(只能被调用一次)
   * @param characters 用户自定义的字形, 会和 TinySDFAtlas.commonGlyph 合并
   */
  prepareGlyph(characters: string = "你好世界!岸桥场桥:装船卸船移箱集装箱主小车门架小车任务指令状态数值％角度°速度故障模式~，。（）-繁华声遁入空门折煞了世人"): void {
    console.time("TinySDFAtlas: 生成基础字形贴图");
    if (TinySDFAtlas.prepared) {
      console.warn("TinySDFAtlas.prepareGlyph 已经被调用过(prepared), 此次调用将被忽略。");
      console.timeEnd("生成基础字形贴图");
      return;
    }

    // 合并并去重字符
    const combined = TinySDFAtlas.commonGlyph + characters;
    const uniqueChars = Array.from(new Set(combined.split("")));

    // packing状态, 以当前页最后位置为起点
    let pageIndex = 0;
    let x = 0;
    let y = 0;
    let rowHeight = 0;

    for (const ch of uniqueChars) {
      if (this.glyphMap.has(ch)) continue; // 如果已存在则跳过(避免重复烘焙)

      const glyph = tinySdfInstance.draw(ch);
      const { data, width, height, glyphWidth, glyphHeight, glyphLeft, glyphTop, glyphAdvance } = glyph;

      // 如果当前行放不下, 换行
      if (x + SDF_SIZE > ATLAS_TEXTURE_SIZE) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }

      // 如果当前页剩余高度不足, 创建新页
      if (y + SDF_SIZE > ATLAS_TEXTURE_SIZE) {
        pageIndex = this.createNewPage();
        x = 0;
        y = 0;
        rowHeight = 0;
      }

      // 写入 imageData
      const ctx = this.atlasCtxs[pageIndex];
      if (!ctx) {
        console.warn(`atlas 页面 ${pageIndex} 的 ctx 丢失, 跳过字符 ${ch}`);
        continue;
      }

      const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);
      ctx.putImageData(imageData, x, y);

      // 存 glyph 元信息(uv 以整个页为参考)
      this.glyphMap.set(ch, {
        page: pageIndex,
        u0: x / ATLAS_TEXTURE_SIZE,
        v0: y / ATLAS_TEXTURE_SIZE,
        u1: (x + width) / ATLAS_TEXTURE_SIZE,
        v1: (y + height) / ATLAS_TEXTURE_SIZE,
        glyph,
      });

      // advance packing cursor
      x += SDF_SIZE;
      rowHeight = Math.max(rowHeight, SDF_SIZE);
    }

    TinySDFAtlas.prepared = true;
    console.timeEnd("TinySDFAtlas: 生成基础字形贴图");

    console.info(`TinySDFAtlas:  glyphMap size ${this.glyphMap.size}`);
  }

  /** 检查是否包含某字形 */
  hasGlyph(ch: string): boolean {
    return this.glyphMap.has(ch);
  }

  /** 获取字形信息(确保已 prepare) */
  getGlyphAtlas(ch: string): AtlasProperty {
    TinySDFAtlas.ensurePrepared();
    if (this.glyphMap.has(ch)) return this.glyphMap.get(ch);
    return this.glyphMap.get("▢");
  }

  /** 获取某一页的 canvas(默认第0页) */
  getPageCanvas(page: number = 0): HTMLCanvasElement {
    TinySDFAtlas.ensurePrepared();
    const c = this.atlasCanvases[page];
    if (!c) throw new Error(`TinySDFAtlas: page ${page} 不存在`);
    return c;
  }

  /** 返回所有页的 canvas 列表(只读拷贝) */
  getAllPages(): HTMLCanvasElement[] {
    TinySDFAtlas.ensurePrepared();
    return this.atlasCanvases.slice();
  }

  /** 导出某页为 dataURL */
  toDataURL(page: number = 0, type: string = "image/png", quality?: any): string {
    const c = this.getPageCanvas(page);
    return c.toDataURL(type, quality);
  }

  /** 清除并允许重新生成(如果需要在运行时重新生成 atlas, 可调用此函数) */
  reset(): void {
    // 清理 canvas 引用以便 GC
    this.atlasCanvases.length = 0;
    this.atlasCtxs.length = 0;
    this.glyphMap.clear();
    TinySDFAtlas.prepared = false;
    // 保持单例实例存在, 但允许再次 prepareGlyph
  }

  /** 如果需要彻底销毁单例(谨慎使用) */
  static destroyInstance(): void {
    if (TinySDFAtlas._instance) {
      TinySDFAtlas._instance.reset();
      TinySDFAtlas._instance = null;
      TinySDFAtlas.prepared = false;
    }
  }
}

/** 导出单例快捷使用 */
export const tinySDFAtlas = TinySDFAtlas.getInstance();
