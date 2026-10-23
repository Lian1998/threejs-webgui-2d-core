import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";

const page = unit("精灵实例", "只加载一张本地图片, 检查透明孔洞与 bounds 模式.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  await view.resources.sprites.register({ id: "ring", url: "/debug/ring.svg" });
  const sprite = view.primitives.addSprite({
    id: "ring",
    layer: "default",
    image: "ring",
    size: [8, 8],
  });
  await sprite.ready();
  view.flush();
  const center = view.viewport.worldToScreen([0, 0]);
  page.check(!view.picking.pickAt(center), "visible 模式穿过透明中心");
  sprite.update({ hit: { mode: "bounds" } });
  page.check(view.picking.pickAt(center)?.primitiveId === sprite.id, "bounds 模式命中矩形范围");
  sprite.update({ hit: { mode: "visible" }, tint: "#9de2ff" });
  sprite.setPosition([2, 0]);
  view.flush();
  page.check(view.stats.rebuiltBatches === 0, "移动和改色保留实例批次");
  page.observe(view);
});
