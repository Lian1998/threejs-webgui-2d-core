import type { Viewer2D } from "../../Viewer2D";
import "./units.css";

/** 只提供页面外壳和生命周期, 不导入 Viewer 或聚合其他测试单元. */
export function unit(title: string, description: string) {
  document.title = `DEBUG ${title}`;
  document.body.innerHTML = `<header><a href="/debug/index.html">模块索引</a><h1></h1><p></p></header><main><div id="stage"></div><aside><h2>自动检查</h2><pre id="results"></pre><h2>当前状态</h2><pre id="details"></pre></aside></main>`;
  document.querySelector("h1")!.textContent = title;
  document.querySelector("header p")!.textContent = description;
  const results = document.querySelector<HTMLPreElement>("#results")!;
  const details = document.querySelector<HTMLPreElement>("#details")!;
  const cleanups: (() => void)[] = [];
  let disposed = false;
  const state = {
    ready: false,
    errors: [] as string[],
    checks: [] as string[],
  };
  const fail = (error: unknown) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    state.ready = false;
    state.errors.push(message);
    results.textContent += `FAIL ${message}\n`;
    console.error(error);
  };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    for (const dispose of cleanups.reverse()) {
      try {
        dispose();
      } catch (error) {
        fail(error);
      }
    }
    window.removeEventListener("pagehide", cleanup);
    state.ready = false;
  };
  window.addEventListener("pagehide", cleanup, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(cleanup);
  // 每页只暴露自己的检查状态, 便于手工读取或后续自动化接入.
  (window as any).__WEBGUI_UNIT__ = state;
  return {
    fail,
    container: document.querySelector<HTMLDivElement>("#stage")!,
    check(condition: unknown, message: string) {
      if (!condition) throw new Error(message);
      state.checks.push(message);
      results.textContent += `PASS ${message}\n`;
    },
    show(value: unknown) {
      details.textContent = JSON.stringify(value, null, 2);
    },
    own<T extends { dispose(): void }>(resource: T): T {
      if (disposed) resource.dispose();
      else cleanups.push(() => resource.dispose());
      return resource;
    },
    cleanup(dispose: () => void) {
      if (disposed) dispose();
      else cleanups.push(dispose);
    },
    observe(view: Viewer2D) {
      const refresh = () => {
        if (!view.disposed) details.textContent = JSON.stringify(view.snapshot(), null, 2);
      };
      refresh();
      cleanups.push(view.scheduler.onAfterFrame(refresh));
    },
    async run(operation: () => void | Promise<void>) {
      try {
        await operation();
        if (!disposed) state.ready = state.errors.length === 0;
      } catch (error) {
        fail(error);
      }
    },
  };
}
