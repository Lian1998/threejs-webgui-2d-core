import { unit } from "./harness";
import { Viewer2D } from "../../index";

const page = unit("公共 API 示例", "使用 core/index.ts 导出的实际 API, 演示创建, 更新和完整销毁.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const entity = view.entities.create({ id: "demo" });
  const body = view.primitives.addPolygon({
    id: "demo/body",
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
  });
  entity.addPart("body", body).setPosition([2, 1]);
  view.flush();
  page.check(view.registry.list().length === 1 && view.entities.list().length === 1, "公共 API 完成最小设备创建");
  page.show({ beforeDispose: view.snapshot() });
  view.dispose();
  view.dispose();
  page.check(body.disposed && entity.disposed && !view.canvas.isConnected, "Viewer 幂等销毁图元, 设备和 canvas");
});
