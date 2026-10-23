import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";

const page = unit("交互与选择", "通过程序化选择验证 owner/part 和销毁事件, 无需点击.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const body = view.primitives.addPolygon({
    id: "body",
    ownerId: "device",
    partId: "body",
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
  const head = view.primitives.addLine({
    id: "head",
    ownerId: "device",
    partId: "head",
    layer: "default",
    points: [
      [-4, 0],
      [4, 0],
    ],
    color: "#ffd07a",
    width: 8,
  });
  const events: string[] = [];
  body.on("select", () => events.push("select"));
  body.on("deselect", () => events.push("deselect"));
  view.interaction.select({ primitiveId: body.id });
  page.check(view.interaction.selected?.ownerId === "device", "图元选择携带设备归属");
  view.interaction.select({ ownerId: "device", preferredPartId: "head" });
  page.check(view.interaction.selected?.primitiveId === head.id && events.join(",") === "select", "同 owner 切换部件不重复 select");
  head.dispose();
  body.dispose();
  page.check(!view.interaction.selected, "删除设备全部部件后清空选择");
  page.show({ events, selected: view.interaction.selected });
});
