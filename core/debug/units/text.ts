import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";

const page = unit("动态中文标签", "只加载字体并创建标签, 自动检查布局更新和资源释放.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  await view.resources.fonts.register({
    id: "demo",
    family: "Noto Sans SC Demo",
    url: "/fonts/NotoSansSC-demo.woff2",
  });
  const label = view.primitives.addText({
    layer: "default",
    text: "中文 标签\n设备 001",
    font: "demo",
    fontSize: 24,
    sizeMode: "screen",
    color: "#eefaff",
    background: { color: "#38627a", opacity: 0.9, radius: 6 },
    padding: [8, 8, 8, 8],
  });
  await label.ready();
  view.flush();
  page.check(view.snapshot().text.labels === 1, "只准备当前标签的布局");
  label.setText("设备 002");
  await label.ready();
  view.flush();
  page.check(label.getOptions().text === "设备 002", "setText 完成新的异步字形布局");
  page.observe(view);
});
