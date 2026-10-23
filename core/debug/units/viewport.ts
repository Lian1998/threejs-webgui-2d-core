import { unit } from "./harness";
import { LocalCoordinateAdapter } from "../../coordinates/CoordinateAdapter";
import { OrthographicCameraAdapter } from "../../viewport/OrthographicCameraAdapter";

const page = unit("坐标与视口", "只检查坐标适配与相机换算, 不创建 renderer.");
void page.run(async () => {
  const adapter = new LocalCoordinateAdapter({
    origin: [1000000, 2000000],
    unitsPerMeter: 1000,
    axis: [1, -1],
  });
  const local = adapter.toLocal([1002000, 1997000]);
  page.check(local[0] === 2 && local[1] === 3, "大坐标转局部米坐标, 并翻转业务 y 轴");
  page.check(adapter.fromLocal(local)[1] === 1997000, "坐标适配可逆");
  const camera = new OrthographicCameraAdapter();
  camera.update({ center: [10, 20], scale: 8 }, [800, 600]);
  const screen = camera.worldToScreen([13, 24]);
  const world = camera.screenToWorld(screen);
  page.check(Math.hypot(world[0] - 13, world[1] - 24) < 1e-6, "OrthographicCamera 的 project/unproject 往返一致");
  page.show({ local, screen, world, camera: camera.camera.type });
});
