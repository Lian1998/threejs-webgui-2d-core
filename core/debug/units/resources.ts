import { unit } from "./harness";
import { ResourceStore } from "../../resources/ResourceStore";

const page = unit("共享资源", "只测试异步申请和引用计数, 不创建场景.");
void page.run(async () => {
  const store = page.own(new ResourceStore());
  let loads = 0,
    disposals = 0;
  const loader = async () => {
    loads++;
    return { value: 42 };
  };
  const dispose = () => {
    disposals++;
  };
  const [a, b] = await Promise.all([store.acquire("shared", loader, dispose), store.acquire("shared", loader, dispose)]);
  page.check(loads === 1 && a.value === b.value, "同 key 并发申请只执行一次 loader");
  a.release();
  a.release();
  page.check(disposals === 0 && store.snapshot()[0].references === 1, "重复 release 幂等, 其余持有者仍有效");
  b.release();
  page.check(disposals === 1 && store.snapshot().length === 0, "最后一个引用释放后执行 disposer");
  const controller = new AbortController();
  controller.abort();
  let cancelled = false;
  try {
    await store.acquire("cancelled", loader, dispose, {
      signal: controller.signal,
    });
  } catch (error) {
    cancelled = (error as Error).name === "AbortError";
  }
  page.check(cancelled && loads === 1, "已取消的申请不启动 loader");
  page.show({ loads, disposals, entries: store.snapshot() });
});
