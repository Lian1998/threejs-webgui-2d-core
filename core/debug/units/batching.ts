import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";

const page = unit("自动批渲染", "只构造多边形和线, 直接观察连续区段合批与更新上传.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const a = view.primitives.addPolygon({
    layer: "default",
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
    order: 0,
  });
  const b = view.primitives.addPolygon({
    layer: "default",
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
    order: 1,
    transform: { position: [8, 0] },
  });
  view.flush();
  page.check(view.stats.batchCount === 1, "连续同类多边形合为一个颜色批次");
  view.primitives.addLine({
    layer: "default",
    points: [
      [-4, 0],
      [4, 0],
    ],
    color: "#ffd07a",
    width: 8,
    order: 0.5,
  });
  view.flush();
  page.check(view.stats.batchCount === 3, "中间插入另一种图元后保留三个绘制区段");
  a.setFill("#edb75e");
  view.flush();
  page.check(view.stats.uploadedBytes > 0 && view.stats.rebuiltBatches === 0, "改色产生局部上传, 无需扩容重建");
  b.dispose();
  view.flush();
  page.check(view.registry.list().length === 2, "删除逻辑图元后更新批次");
  page.observe(view);
});
