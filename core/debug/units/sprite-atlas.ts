import { DataUtils } from "three";
import { unit } from "./harness";
import { ResourceStore } from "../../resources/ResourceStore";
import { SpriteAtlas } from "../../resources/sprites/SpriteAtlas";

const page = unit("图片图集", "独立创建 SpriteAtlas, 显示图集页并检查区域复用.");
void page.run(async () => {
  const resources = page.own(new ResourceStore());
  const atlas = page.own(new SpriteAtlas(resources, { pageSize: 256 }));
  atlas.register({ id: "ring", url: "/debug/ring.svg" });
  const a = await atlas.acquire("ring");
  const b = await atlas.acquire("ring");
  page.check(a.value.texture === b.value.texture && a.value.uv === b.value.uv, "重复图片共享纹理区域");
  page.cleanup(() => a.release());
  page.cleanup(() => b.release());
  const region = a.value;
  const image = region.texture.image;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const pixels = new Uint8ClampedArray(image.width * image.height * 4);
  // SpriteAtlas 使用半浮点预乘数据, 预览时还原直通颜色, 不把 Uint16 当 RGBA8.
  for (let i = 0; i < image.width * image.height; i++) {
    const alpha = DataUtils.fromHalfFloat(image.data[i * 4 + 3]);
    for (let channel = 0; channel < 3; channel++) {
      const linear = alpha > 0 ? DataUtils.fromHalfFloat(image.data[i * 4 + channel]) / alpha : 0;
      const srgb = linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
      pixels[i * 4 + channel] = srgb * 255;
    }
    pixels[i * 4 + 3] = alpha * 255;
  }
  canvas.getContext("2d")!.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
  page.container.append(canvas);
  atlas.unregister("ring");
  page.check(a.value === region, "注销后已有 lease 仍有效");
  page.show({
    uv: region.uv,
    page: region.page,
    bindingKey: region.bindingKey,
    snapshot: atlas.snapshot(),
  });
});
