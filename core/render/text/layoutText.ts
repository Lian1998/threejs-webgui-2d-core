import type { DeepReadonly, ResourceLease, TextOptions, Vec2 } from "../../contracts";
import { GlyphAtlas, type GlyphRegion } from "../../resources/fonts/GlyphAtlas";

export interface LayoutGlyph {
  region: GlyphRegion;
  rect: readonly [number, number, number, number];
}
export interface TextLayout {
  readonly size: Vec2;
  readonly rect: readonly [number, number, number, number];
  readonly glyphs: readonly LayoutGlyph[];
  readonly leases: readonly ResourceLease<GlyphRegion>[];
  readonly fontSize: number;
}
interface Line {
  entries: { region: GlyphRegion; x: number }[];
  width: number;
}

export function layoutSignature(options: DeepReadonly<TextOptions>): string {
  return JSON.stringify([options.text, options.font, options.fontSize, options.lineHeight, options.letterSpacing, options.maxWidth, options.align, options.anchor, options.padding]);
}

/** 只布局当前标签. 字形边距用于 SDF 采样, 不作为字符 advance 或标签 padding. */
export async function layoutText(options: DeepReadonly<TextOptions>, atlas: GlyphAtlas): Promise<TextLayout> {
  if (!options.text) return { size: [0, 0], rect: [0, 0, 0, 0], glyphs: [], leases: [], fontSize: options.fontSize };
  const text = options.text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
  const characters = [...new Set([...text].filter((character) => character !== "\n"))];
  const results = await Promise.allSettled(characters.map((character) => atlas.acquire(options.font, character)));
  const leases: ResourceLease<GlyphRegion>[] = [];
  let error: unknown;
  const regions = new Map<string, GlyphRegion>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      leases.push(result.value);
      regions.set(characters[index], result.value.value);
    } else error ??= result.reason;
  });
  if (error) {
    leases.forEach((lease) => lease.release());
    throw error;
  }
  try {
    const lineHeight = options.lineHeight ?? options.fontSize * 1.2;
    const spacing = options.letterSpacing ?? 0;
    const lines: Line[] = [{ entries: [], width: 0 }];
    let ascent = options.fontSize * 0.8,
      descent = options.fontSize * 0.2;
    for (const character of text) {
      if (character === "\n") {
        lines.push({ entries: [], width: 0 });
        continue;
      }
      const region = regions.get(character)!;
      const unit = options.fontSize / region.rasterSize;
      const advance = region.advance * unit;
      let line = lines[lines.length - 1];
      let x = line.width + (line.entries.length ? spacing : 0);
      if (options.maxWidth && x + advance > options.maxWidth && line.entries.length) {
        line = { entries: [], width: 0 };
        lines.push(line);
        x = 0;
      }
      line.entries.push({ region, x });
      line.width = x + advance;
      ascent = Math.max(ascent, region.bearing[1] * unit);
      descent = Math.max(descent, (region.inkSize[1] - region.bearing[1]) * unit);
    }
    const contentWidth = lines.reduce((width, line) => Math.max(width, line.width), 0);
    const contentHeight = ascent + descent + Math.max(0, lines.length - 1) * lineHeight;
    const [top, right, bottom, left] = options.padding ?? [0, 0, 0, 0];
    const width = contentWidth + left + right,
      height = contentHeight + top + bottom;
    const anchor = options.anchor ?? [0.5, 0.5];
    const originX = -width * anchor[0],
      originY = -height * anchor[1];
    const glyphs: LayoutGlyph[] = [];
    for (let row = 0; row < lines.length; row++) {
      const line = lines[row];
      const alignment = options.align === "right" ? contentWidth - line.width : options.align === "center" ? (contentWidth - line.width) / 2 : 0;
      const baseline = originY + height - top - ascent - row * lineHeight;
      for (const entry of line.entries) {
        const region = entry.region;
        if (!region.inkSize[0] || !region.inkSize[1]) continue;
        const unit = options.fontSize / region.rasterSize;
        const w = region.bitmapSize[0] * unit,
          h = region.bitmapSize[1] * unit;
        const x = originX + left + alignment + entry.x + (region.bearing[0] - region.sdfPadding) * unit;
        const y = baseline + (region.bearing[1] + region.sdfPadding) * unit - h;
        glyphs.push({ region, rect: [x, y, w, h] });
      }
    }
    return {
      size: [width, height],
      rect: [originX, originY, width, height],
      glyphs,
      leases,
      fontSize: options.fontSize,
    };
  } catch (failure) {
    leases.forEach((lease) => lease.release());
    throw failure;
  }
}
