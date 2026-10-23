import { unit } from "./harness";
import { FrameScheduler } from "../../scheduler/FrameScheduler";

const page = unit("帧调度", "注入时钟和 RAF 队列, 确定性检查同帧合并与暂停.");
void page.run(async () => {
  let now = 0,
    next = 0;
  const queue = new Map<number, (time: number) => void>();
  const calls: string[] = [];
  const scheduler = page.own(
    new FrameScheduler(
      {
        flushUpdates: () => calls.push("flush"),
        renderColor: () => calls.push("render"),
      },
      {
        now: () => now,
        requestFrame: (callback) => {
          queue.set(++next, callback);
          return next;
        },
        cancelFrame: (id) => {
          queue.delete(id);
        },
      },
    ),
  );
  const tick = () => {
    now += 16;
    const pending = [...queue.values()];
    queue.clear();
    pending.forEach((callback) => callback(now));
  };
  scheduler.invalidate();
  scheduler.invalidate();
  scheduler.invalidate();
  page.check(queue.size === 1, "多次 invalidate 只排一个 RAF");
  tick();
  page.check(calls.join(",") === "flush,render" && queue.size === 0, "先同步再绘制, 静止后停止");
  const release = scheduler.acquireContinuous("unit");
  tick();
  page.check(queue.size === 1, "动画持有期间继续排帧");
  release();
  page.check(queue.size === 0, "释放最后一个动画令牌后停止");
  scheduler.setPaused(true);
  scheduler.invalidate();
  page.check(queue.size === 0, "暂停时不排帧");
  scheduler.setPaused(false);
  tick();
  page.show(scheduler.stats);
});
