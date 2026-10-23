import { unit } from "./harness";
import { ResourceStore } from "../../resources/ResourceStore";
import { FontStore } from "../../resources/fonts/FontStore";
import { GlyphAtlas } from "../../resources/fonts/GlyphAtlas";

const page = unit("字形图集", "独立创建字体图集, 不创建 Viewer 或其他图元.");
void page.run(async () => {
  const resources = page.own(new ResourceStore());
  const atlas = page.own(new GlyphAtlas(new FontStore(resources)));
  await atlas.register({
    id: "demo",
    family: "Noto Sans SC Demo",
    url: "/fonts/NotoSansSC-demo.woff2",
  });
  const a = await atlas.acquire("demo", "设");
  page.cleanup(() => a.release());
  const b = await atlas.acquire("demo", "设");
  page.cleanup(() => b.release());
  page.check(a.value.texture === b.value.texture && a.value.uv === b.value.uv, "重复字形复用纹理区域");
  const uv = [...a.value.uv];
  await atlas.ensure("demo", "设备 001");
  page.check(
    a.value.uv.every((value, index) => value === uv[index]),
    "追加字形不改变已有 UV",
  );
  const data = a.value.texture.image;
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const pixels = new Uint8ClampedArray(data.width * data.height * 4);
  for (let i = 0; i < data.width * data.height; i++) {
    pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = data.data[i];
    pixels[i * 4 + 3] = 255;
  }
  canvas.getContext("2d")!.putImageData(new ImageData(pixels, data.width, data.height), 0, 0);
  page.container.append(canvas);
  page.show({
    glyph: a.value.glyph,
    advance: a.value.advance,
    uv,
    atlas: atlas.snapshot(),
  });
});
