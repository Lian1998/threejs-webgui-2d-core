import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";
import { attachDebugTools } from "../../dev/gui/attachDebugTools";
import { createDebugProxy } from "../../dev/gui/DebugProxy";
import { getDebugFields } from "../../dev/gui/metadata";

const page = unit("每实例 GUI", "只创建一个图元, 自动绑定面板并通过代理写回 API.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const handle = view.primitives.addPolygon({
    id: "sample",
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
  const tools = attachDebugTools(view, { container: page.container });
  if (!tools) throw new Error("当前构建没有开启 __WEBGUI_DEBUG__");
  page.cleanup(() => tools.dispose());
  tools.manager.show(handle.id);
  page.check(tools.registry.list().length === 1 && tools.manager.selectedId === handle.id, "实例自动注册并显示 GUI");
  const proxy = createDebugProxy(handle, view.motion);
  page.check(
    getDebugFields(proxy).some((field) => field.property === "opacity"),
    "装饰器提供可编辑字段元数据",
  );
  proxy.opacity = 0.6;
  view.flush();
  page.check(handle.getOptions().opacity === 0.6, "代理 setter 通过 handle.update 写回");
  page.observe(view);
});
