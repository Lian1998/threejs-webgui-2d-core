import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";
import { Vector3 } from "three";

const page = unit("组合设备", "一个设备跨两个图层, 自动检查父变换和独立部件生命周期.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  view.layers.add({ id: "route", order: -1 });
  const entity = view.entities.create({ id: "device" });
  const body = view.primitives.addPolygon({
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
  const route = view.primitives.addLine({
    layer: "route",
    points: [
      [-4, 0],
      [4, 0],
    ],
    color: "#ffd07a",
    width: 8,
  });
  entity.addPart("body", body).addPart("route", route);
  entity.setPosition([4, 3]).setRotation(Math.PI / 2);
  view.flush();
  const world = new Vector3().setFromMatrixPosition(body.getEffectiveMatrix());
  page.check(Math.abs(world.x - 4) < 1e-6 && Math.abs(world.z + 3) < 1e-6, "Entity 父矩阵传递到部件有效矩阵");
  page.check(body.getOptions().ownerId === entity.id && route.getOptions().partId === "route", "跨层部件保持归属");
  entity.removePart("route");
  page.check(!route.disposed && !route.getOptions().ownerId, "分离部件保留图元并清除 owner");
  entity.dispose();
  page.check(body.disposed && !route.disposed, "销毁组合仅释放仍归属的部件");
  page.observe(view);
});
