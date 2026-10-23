import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";

const page = unit("图层与顺序", "两个重叠多边形, 自动检查顺序切换, 显隐和 LOD.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const lower = view.layers.add({ id: "lower", order: 1 });
  view.layers.add({ id: "upper", order: 2 });
  view.primitives.addPolygon({
    id: "a",
    layer: "lower",
    geometry: {
      type: "Polygon",
      polygon: {
        outer: [
          [-3, -2],
          [3, -2],
          [3, 2],
          [-3, 2],
        ],
      },
    },
    fill: "#58bdd3",
  });
  view.primitives.addPolygon({
    id: "b",
    layer: "upper",
    geometry: {
      type: "Polygon",
      polygon: {
        outer: [
          [-3, -2],
          [3, -2],
          [3, 2],
          [-3, 2],
        ],
      },
    },
    fill: "#f0ad62",
  });
  view.flush();
  const center = view.viewport.worldToScreen([0, 0]);
  page.check(view.picking.pickAt(center)?.primitiveId === "b", "高 order 图层绘制在上方");
  lower.update({ order: 3 });
  page.check(view.picking.pickAt(center)?.primitiveId === "a", "图层重排改变顶层命中");
  lower.setVisible(false);
  page.check(view.picking.pickAt(center)?.primitiveId === "b", "隐藏层不参与拾取");
  lower.update({ visible: true, minScale: 20 });
  page.check(!view.layers.effective("lower", 16).visible, "minScale 控制 LOD");
  page.observe(view);
});
