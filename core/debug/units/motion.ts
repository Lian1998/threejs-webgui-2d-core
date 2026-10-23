import { unit } from "./harness";
import { FrameScheduler } from "../../scheduler/FrameScheduler";
import { MotionController, shortestAngleDelta } from "../../motion/MotionController";
import type { Vec2 } from "../../contracts";

const page = unit("实时插帧", "独立时钟驱动一个目标, 检查半程姿态和角度最短路径.");
void page.run(async () => {
  let now = 0;
  const scheduler = page.own(new FrameScheduler({ flushUpdates() {}, renderColor() {} }, { now: () => now, requestFrame: () => 1, cancelFrame: () => {} }));
  const controller = page.own(new MotionController(scheduler));
  const target = {
    position: [0, 0] as Vec2,
    rotation: 0,
    setPosition(value: Vec2) {
      this.position = value;
      return this;
    },
    setRotation(value: number) {
      this.rotation = value;
      return this;
    },
  };
  const motion = controller.bind(target, {
    durationMs: 1000,
    snapDistance: 100,
  });
  motion.snap({ position: [0, 0], rotation: 0 });
  motion.push({ position: [10, 0], rotation: Math.PI / 2 });
  now = 500;
  scheduler.flushNow();
  page.check(Math.abs(target.position[0] - 5) < 1e-6, "半程位置按时钟插值");
  page.check(Math.abs(target.rotation - Math.PI / 4) < 1e-6, "半程旋转插值");
  page.check(Math.abs(shortestAngleDelta((350 * Math.PI) / 180, (10 * Math.PI) / 180) - (20 * Math.PI) / 180) < 1e-6, "跨零角度沿最短路径");
  now = 1000;
  scheduler.flushNow();
  page.check(controller.activeCount === 0 && scheduler.continuousCount === 0, "到达目标后释放持续帧令牌");
  page.show(target);
});
