import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";

const page = unit("粗线与虚线", "只测试线宽, 虚线间隙和路径拓扑变更.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const dashed = view.primitives.addLine({
    id: "dash",
    layer: "default",
    points: [
      [-8, 0],
      [8, 0],
    ],
    width: 8,
    widthMode: "screen",
    color: "#f8c46a",
    dash: { length: 16, gap: 16 },
  });
  view.primitives.addLine({
    layer: "default",
    points: [
      [-6, 3],
      [0, 5],
      [6, 3],
    ],
    width: 0.5,
    widthMode: "world",
    color: "#64cad8",
    join: "bevel",
    cap: "round",
  });
  view.flush();
  page.check(view.picking.pickAt(view.viewport.worldToScreen([-7.5, 0]))?.primitiveId === dashed.id, "虚线实段有覆盖");
  page.check(!view.picking.pickAt(view.viewport.worldToScreen([-6.5, 0])), "虚线间隙不命中");
  dashed.setPoints([
    [-8, 0],
    [-8, 0],
    [0, -4],
    [8, 0],
  ]);
  view.flush();
  page.check(view.picking.pickAt(view.viewport.worldToScreen([-7.75, -0.125]))?.primitiveId === dashed.id, "重复点被清理后仍能生成有效线段");
  dashed.setPoints([[0, 0]]);
  view.flush();
  page.check(!view.picking.pickAt(view.viewport.worldToScreen([-7.75, -0.125])), "退化为单点后移除旧路径覆盖");
  page.observe(view);
});
