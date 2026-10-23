import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";

const page = unit("精准拾取", "直接以世界坐标发起 GPU 查询, 无需点击.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const area = view.primitives.addPolygon({
    id: "area",
    layer: "default",
    geometry: {
      type: "Polygon",
      polygon: {
        outer: [
          [-5, -5],
          [5, -5],
          [5, 5],
          [-5, 5],
        ],
      },
    },
    fill: "#528ea6",
  });
  await view.resources.sprites.register({ id: "ring", url: "/debug/ring.svg" });
  const ring = view.primitives.addSprite({
    id: "ring",
    layer: "default",
    image: "ring",
    size: [8, 8],
    order: 1,
  });
  await ring.ready();
  view.flush();
  const center = view.viewport.worldToScreen([0, 0]);
  page.check(view.picking.pickAt(center)?.primitiveId === area.id, "透明孔洞穿透到下层图元");
  ring.update({ hit: { mode: "bounds" } });
  page.check(view.picking.pickAt(center)?.primitiveId === ring.id, "bounds 模式覆盖上层矩形");
  area.update({ hit: { priority: 10 } });
  page.check(view.picking.pickAt(center)?.primitiveId === area.id, "业务优先级可覆盖画家顺序");
  page.check(!view.picking.pickAt(center, { layers: [] }), "空图层过滤无命中");
  const asyncHit = await view.picking.pickAtAsync(center);
  page.check(asyncHit?.primitiveId === area.id, "异步读回保留逻辑 ID");
  page.observe(view);
});
