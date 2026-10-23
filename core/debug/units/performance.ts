import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";
import { PerformanceObserver, seededRandom } from "../refactor/PerformanceObserver";

const page = unit("性能观察", "只测同类多边形的批次与局部更新, URL 可用 count=512 调整数量.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const rawCount = Number(new URLSearchParams(location.search).get("count") ?? 128);
  const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(5000, Math.floor(rawCount))) : 128;
  const observer = page.own(
    new PerformanceObserver(
      view,
      {
        deviceCount: count,
        movingRatio: 0,
        updateHz: 0,
        labelsVisible: false,
        labelChangeHz: 0,
        pipelineCount: 0,
        pointsPerPipeline: 0,
        dpr: view.viewport.dpr,
        seed: 42,
      },
      0,
    ),
  );
  const random = seededRandom(42);
  const handles = Array.from({ length: count }, (_, i) =>
    view.primitives.addPolygon({
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
      transform: { position: [(i % 32) * 8, Math.floor(i / 32) * 6] },
    }),
  );
  view.viewport.fitBounds([
    [-4, -3],
    [Math.min(32, count) * 8, Math.ceil(count / 32) * 6],
  ]);
  view.flush();
  observer.markReady();
  const initialCalls = view.stats.colorCalls;
  view.flush();
  page.check(view.stats.uploadedBytes === 0, "静态状态重复绘制不上传图元属性");
  handles[0].setFill("#ffcc66");
  view.flush();
  page.check(view.stats.uploadedBytes > 0 && view.stats.rebuiltBatches === 0, "单图元改色只更新已有缓冲");
  for (let frame = 0; frame < 12; frame++) {
    handles[0].setPosition([random(), random()]);
    view.flush();
  }
  page.show({ count, initialCalls, summary: observer.summary() });
});
