import { createRequire } from "node:module";
import fs from "node:fs";

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync("/tmp/webgui-browser-binaries"))
  process.env.PLAYWRIGHT_BROWSERS_PATH = "/tmp/webgui-browser-binaries";
const temporaryLibraries = "/tmp/webgui-browser-libs/root/usr/lib/x86_64-linux-gnu";
if (fs.existsSync(temporaryLibraries))
  process.env.LD_LIBRARY_PATH =
    temporaryLibraries + (process.env.LD_LIBRARY_PATH ? ":" + process.env.LD_LIBRARY_PATH : "");
let playwright;
try {
  playwright = createRequire(import.meta.url)("playwright");
} catch {
  playwright = createRequire(process.env.WEBGUI_PLAYWRIGHT_PACKAGE ?? "/tmp/webgui-browser/package.json")("playwright");
}

const base = process.argv[2] ?? "http://127.0.0.1:8056";
const browser = await playwright.chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
});
const results = [];
const runtimeErrors = [];
try {
  for (const dpr of [1, 1.25, 2]) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: dpr });
    await context.addInitScript(() => {
      window.__assert = (condition, message) => {
        if (!condition) throw new Error(message);
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => runtimeErrors.push({ dpr, error: error.message }));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.location().url?.includes("favicon.ico"))
        runtimeErrors.push({ dpr, error: message.text() });
    });
    const run = async (name, callback) => {
      try {
        const detail = await page.evaluate(callback);
        results.push({ dpr, name, pass: true, detail });
        console.log(`PASS DPR=${dpr} ${name}`, JSON.stringify(detail ?? ""));
      } catch (error) {
        results.push({ dpr, name, pass: false, error: error.message });
        console.log(`FAIL DPR=${dpr} ${name}: ${error.message}`);
      }
    };
    await page.goto(`${base}/debug/refactor/delivery.html`, { waitUntil: "networkidle" });
    try {
      await page.waitForFunction(() => window.__WEBGUI_DEMO__?.ready, null, { timeout: 20000 });
    } catch (error) {
      console.log("Scene failed to initialize", await page.locator("#status").textContent(), runtimeErrors);
      throw error;
    }

    await run("scene and local fonts", () => {
      const d = window.__WEBGUI_DEMO__,
        snapshot = d.viewer.snapshot();
      window.__assert(
        snapshot.webgl.revision === "170" && snapshot.primitives > 20 && document.fonts.size > 0,
        "r170 scene/fonts missing",
      );
      window.__assert(d.errors.length === 0, d.errors.join("\n"));
      return { primitives: snapshot.primitives, fontFaces: document.fonts.size, calls: snapshot.stats.colorCalls };
    });
    await run("visible alpha holes and layer filter", () => {
      const d = window.__WEBGUI_DEMO__,
        v = d.viewer,
        screen = (world) => v.viewport.worldToScreen(world);
      window.__assert(
        v.picking.pickAt(screen(d.fixtures.ring))?.primitiveId === "hole-underlay",
        "transparent sprite center must reveal underlay",
      );
      window.__assert(
        !v.picking.pickAt(screen(d.fixtures.ring), { layers: ["fixtures"] }),
        "filtered underlay must not appear",
      );
      window.__assert(
        v.picking.pickAt(screen([-15.8, 7]), { layers: ["fixtures"] })?.primitiveId === "fixture-ring",
        "ring ink missing",
      );
      window.__assert(
        !v.picking.pickAt(screen(d.fixtures.polygon), { layers: ["fixtures"] }),
        "polygon hole must be empty",
      );
      window.__assert(
        v.picking.pickAt(screen([15.5, 7]), { layers: ["fixtures"] })?.primitiveId === "fixture-polygon",
        "polygon fill missing",
      );
    });
    await run("sprite bounds, opacity and priority", () => {
      const d = window.__WEBGUI_DEMO__,
        v = d.viewer,
        ring = d.handles.get("fixture-ring"),
        under = d.handles.get("hole-underlay");
      ring.update({ hit: { mode: "bounds" } });
      window.__assert(
        v.picking.pickAt(v.viewport.worldToScreen(d.fixtures.ring))?.primitiveId === ring.id,
        "bounds must include transparent center",
      );
      ring.update({ opacity: 0 });
      window.__assert(
        v.picking.pickAt(v.viewport.worldToScreen(d.fixtures.ring))?.primitiveId === under.id,
        "opacity=0 bounds must not hit",
      );
      ring.update({ opacity: 1, hit: { mode: "visible" } });
      under.update({ hit: { priority: 100 } });
      window.__assert(
        v.picking.pickAt(v.viewport.worldToScreen([-15.8, 7]))?.primitiveId === under.id,
        "explicit priority must win",
      );
      under.update({ hit: { priority: 0 } });
    });
    await run("dash mask, per-line tolerance and crop", () => {
      const d = window.__WEBGUI_DEMO__,
        v = d.viewer,
        line = d.handles.get("fixture-dash");
      const start = v.viewport.worldToScreen([-27, -14]),
        query = { layers: ["pipelines"] };
      const hit = (offset) => v.picking.pickAt([start[0] + offset, start[1]], query)?.primitiveId;
      window.__assert(hit(8) === line.id && !hit(30), "dash ink and gap must differ");
      window.__assert(!v.picking.pickAt([start[0] + 8, start[1] + 7], query), "zero tolerance widened line");
      line.update({ hit: { tolerancePx: 4 } });
      window.__assert(
        v.picking.pickAt([start[0] + 8, start[1] + 7], query)?.primitiveId === line.id,
        "positive CSS tolerance missing",
      );
      line.update({ hit: { tolerancePx: 0 } });
    });
    await run("screen line width survives zoom", () => {
      const v = window.__WEBGUI_DEMO__.viewer,
        query = { layers: ["pipelines"] };
      for (const scale of [9, 18]) {
        v.viewport.setView({ scale });
        const start = v.viewport.worldToScreen([-27, -14]),
          center = v.viewport.cssSize[0] / 2;
        const index = Math.ceil((center - start[0]) / 40),
          x = start[0] + index * 40 + 8;
        window.__assert(
          v.picking.pickAt([x, start[1] + 2], query)?.primitiveId === "fixture-dash",
          "CSS ink width changed with zoom",
        );
        window.__assert(!v.picking.pickAt([x, start[1] + 7], query), "CSS width expanded with zoom");
      }
      v.viewport.setView({ scale: 12 });
    });
    await run("dark RGB and alpha fixture", () => {
      const d = window.__WEBGUI_DEMO__,
        v = d.viewer;
      const opaque = d.readPixel(v.viewport.worldToScreen(d.fixtures.dark));
      const alpha = d.readPixel(v.viewport.worldToScreen(d.fixtures.darkAlpha));
      window.__assert(
        [5, 10, 15].every((value, index) => Math.abs(opaque[index] - value) <= 2),
        `dark RGB changed: ${opaque}`,
      );
      window.__assert(
        alpha[0] > opaque[0] && alpha[0] < 16 && alpha[2] > opaque[2] && alpha[2] < 42,
        `alpha/blending changed: ${alpha}`,
      );
      return { opaque, alpha };
    });
    await run("same owner selection keeps actual part", () => {
      const d = window.__WEBGUI_DEMO__,
        v = d.viewer;
      let notifications = 0,
        ownerChanges = 0;
      const unsubscribe = v.interaction.onSelectionChange((change) => {
        notifications++;
        if (change.selectionChanged) ownerChanges++;
      });
      window.__assert(v.interaction.select({ ownerId: "D001", preferredPartId: "body" }), "device body not selectable");
      window.__assert(
        v.interaction.select({ ownerId: "D001", preferredPartId: "label" }),
        "device label not selectable",
      );
      window.__assert(
        v.interaction.selected.partId === "label" && notifications === 2 && ownerChanges === 1,
        "owner/part state notifications incorrect",
      );
      unsubscribe();
      v.interaction.clearSelection();
    });
    await run("new glyphs and whitespace bounds", async () => {
      const d = window.__WEBGUI_DEMO__,
        v = d.viewer,
        label = d.handles.get("fixture-text");
      const before = v.snapshot().fonts;
      label.setText("中文 新标签\n设备 009");
      await label.ready();
      v.flush();
      window.__assert(
        v.picking.pickAt(v.viewport.worldToScreen(d.fixtures.space), { layers: ["labels"] })?.primitiveId ===
          "fixture-space",
        "whitespace bounds missing",
      );
      d.handles.get("fixture-space").update({ hit: { mode: "visible" } });
      window.__assert(
        !v.picking.pickAt(v.viewport.worldToScreen(d.fixtures.space), { layers: ["labels"] }),
        "whitespace has visible ink",
      );
      return { before, after: v.snapshot().fonts };
    });
    await run("synchronous click during async GPU readback", async () => {
      const v = window.__WEBGUI_DEMO__.viewer,
        point = v.viewport.worldToScreen([-15.8, 7]),
        query = { layers: ["fixtures"] };
      const pending = v.picking.pickAtAsync(point, query);
      const immediate = v.picking.pickAt(point, query);
      const delayed = await pending;
      window.__assert(
        immediate?.primitiveId === "fixture-ring" && delayed?.primitiveId === "fixture-ring",
        "sync/async overlap lost the hit",
      );
      window.__assert(
        v.canvas.getContext("webgl2").getError() === 0,
        "PIXEL_PACK_BUFFER state leaked into synchronous readback",
      );
    });
    await run("asynchronous ID lifetime safety", async () => {
      const v = window.__WEBGUI_DEMO__.viewer;
      const options = {
        id: "lifetime-probe",
        layer: "fixtures",
        transform: { position: [-6, 8] },
        fill: "#ffffff",
        geometry: {
          type: "Polygon",
          polygon: {
            outer: [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ],
          },
        },
      };
      const first = v.primitives.addPolygon(options);
      await Promise.resolve();
      v.flush();
      const pending = v.picking.pickAtAsync(v.viewport.worldToScreen([-6, 8]), { layers: ["fixtures"] });
      first.dispose();
      const second = v.primitives.addPolygon(options);
      const hit = await pending;
      window.__assert(!hit, "old async readback resolved into recreated ID");
      second.dispose();
    });
    if (dpr === 1) {
      await run("GUI per-instance editing and id namespace collision", async () => {
        const d = window.__WEBGUI_DEMO__,
          v = d.viewer,
          dash = d.handles.get("fixture-dash"),
          elbow = d.handles.get("fixture-elbow");
        v.interaction.select({ primitiveId: dash.id });
        const root = document.querySelector(".lil-gui.root");
        const controller = (name) =>
          [...root.querySelectorAll(".controller")].find((node) => node.querySelector(".name")?.textContent === name);
        const width = controller("线宽")?.querySelector("input");
        window.__assert(width, "selected line GUI width controller absent");
        width.value = "11";
        width.dispatchEvent(new Event("input", { bubbles: true }));
        window.__assert(
          dash.getOptions().width === 11 && elbow.getOptions().width === 12,
          "GUI modified wrong instance or bypassed setter",
        );
        dash.setWidth(8);
        v.flush();
        window.__assert(Number(width.value) === 8, "programmatic update did not refresh GUI");
        const entity = v.entities.create({ id: "truck" });
        const primitive = v.primitives.addPolygon({
          id: "entity:truck",
          layer: "areas",
          fill: "#ffffff",
          visible: false,
          geometry: {
            type: "Polygon",
            polygon: {
              outer: [
                [0, 0],
                [1, 0],
                [0, 1],
              ],
            },
          },
        });
        await Promise.resolve();
        v.flush();
        const selector = controller("实例").querySelector("select");
        const matches = [...selector.options].filter((option) => option.textContent.includes("entity:truck"));
        window.__assert(
          matches.length === 2 && matches[0].value !== matches[1].value,
          "primitive/entity debug IDs collided",
        );
        const choice = matches.find((option) => option.textContent.includes("polygon:"));
        selector.value = choice.value;
        selector.dispatchEvent(new Event("change", { bubbles: true }));
        window.__assert(
          [...root.querySelectorAll(".title")].some((title) => title.textContent.includes("polygon: entity:truck")),
          "GUI options refresh lost selector callback",
        );
        primitive.dispose();
        entity.dispose();
        v.interaction.clearSelection();
      });
      await run("failed Viewer construction releases canvas/observer", () => {
        const d = window.__WEBGUI_DEMO__,
          container = document.createElement("div");
        container.style.cssText = "width:200px;height:200px";
        document.body.appendChild(container);
        const NativeObserver = window.ResizeObserver;
        let created = 0,
          disconnected = 0,
          failures = 0;
        window.ResizeObserver = class extends NativeObserver {
          constructor(callback) {
            super(callback);
            created++;
          }
          disconnect() {
            disconnected++;
            super.disconnect();
          }
        };
        try {
          try {
            new d.Viewer2D({ container, scale: 0 });
          } catch {
            failures++;
          }
          const camera = d.viewer.viewport.camera;
          try {
            new d.Viewer2D({
              container,
              cameraAdapter: {
                camera,
                update() {
                  throw new Error("intentional adapter error");
                },
                screenToWorld() {
                  return [0, 0];
                },
                worldToScreen() {
                  return [0, 0];
                },
              },
            });
          } catch {
            failures++;
          }
          window.__assert(
            failures === 2 && container.childElementCount === 0 && created === disconnected,
            "failed constructor leaked canvas/observer",
          );
          const valid = new d.Viewer2D({ container, controls: false });
          valid.dispose();
          window.__assert(
            container.childElementCount === 0 && created === disconnected,
            "normal constructor after failure leaked state",
          );
          return { failures, created, disconnected };
        } finally {
          window.ResizeObserver = NativeObserver;
          container.remove();
        }
      });
      await run("pure lifecycle and layout checks", async () => window.__WEBGUI_DEMO__.runChecks());
      await run("context restoration", async () => {
        const d = window.__WEBGUI_DEMO__,
          v = d.viewer;
        const before = d.readPixel([8, 8]);
        const extension = v.canvas.getContext("webgl2").getExtension("WEBGL_lose_context");
        if (!extension) return "unavailable";
        extension.loseContext();
        await new Promise((resolve) => setTimeout(resolve, 120));
        extension.restoreContext();
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.__assert(
          v.picking.pickAt(v.viewport.worldToScreen([-15.8, 7]), { layers: ["fixtures"] })?.primitiveId ===
            "fixture-ring",
          "restored pick coverage missing",
        );
        const after = d.readPixel([8, 8]);
        window.__assert(
          [16, 28, 42].every((value, index) => before[index] === value && after[index] === value),
          `context restoration changed background: ${before} -> ${after}`,
        );
      });
    }
    await page.evaluate(() => window.__WEBGUI_DEMO__.setRunning(false));
    if (dpr === 1) await page.screenshot({ path: "/tmp/webgui-delivery.png" });
    await page.waitForTimeout(500);
    const idleFrames = await page.evaluate(() => window.__WEBGUI_DEMO__.viewer.stats.frames);
    await page.waitForTimeout(300);
    const idleAfter = await page.evaluate(() => window.__WEBGUI_DEMO__.viewer.stats.frames);
    results.push({ dpr, name: "idle scheduling", pass: idleFrames === idleAfter, detail: [idleFrames, idleAfter] });
    await run("multiple viewers, disposal and GUI cleanup", async () => {
      const d = window.__WEBGUI_DEMO__;
      await d.createPeer();
      const peer = d.peer;
      const ownFonts = () => [...document.fonts].filter((face) => face.family.startsWith("webgui_")).length;
      window.__assert(
        document.querySelectorAll("#viewport canvas,#peer canvas").length === 2 && ownFonts() === 2,
        "Viewer/font scope isolation missing",
      );
      d.dispose();
      peer.flush();
      window.__assert(
        document.querySelectorAll("#viewport canvas").length === 0 && !peer.disposed && ownFonts() === 1,
        "disposing primary damaged peer",
      );
      window.__assert(document.querySelectorAll(".lil-gui").length === 0, "GUI survived Viewer disposal");
      await d.createPeer();
      window.__assert(ownFonts() === 0, "FontFace survived final Viewer disposal");
    });
    if (dpr === 1) {
      await page.goto(`${base}/debug/refactor/performance.html`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__WEBGUI_DEMO__?.ready);
      await run("picking toggle and layer query avoid disabled GPU passes", async () => {
        const d = window.__WEBGUI_DEMO__,
          v = d.viewer,
          enabled = document.getElementById("picking-enabled"),
          query = document.getElementById("pick-layers");
        enabled.checked = false;
        enabled.dispatchEvent(new Event("change"));
        await new Promise((resolve) => setTimeout(resolve, 50));
        const passes = v.snapshot().pick.passes,
          rect = v.canvas.getBoundingClientRect(),
          screen = v.viewport.worldToScreen([-15.8, 7]);
        v.canvas.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: rect.left + screen[0],
            clientY: rect.top + screen[1],
            bubbles: true,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 120));
        window.__assert(v.snapshot().pick.passes === passes, "disabled picking performed GPU pass");
        enabled.checked = true;
        query.value = "all";
        enabled.dispatchEvent(new Event("change"));
        v.canvas.dispatchEvent(
          new MouseEvent("click", { clientX: rect.left + screen[0], clientY: rect.top + screen[1], bubbles: true }),
        );
        window.__assert(
          v.interaction.selected?.primitiveId === "fixture-ring",
          "reenabled picking did not select visible ink",
        );
        v.canvas.dispatchEvent(new PointerEvent("pointerleave"));
      });
      await page.evaluate(async () => {
        document.getElementById("count").value = "64";
        document.getElementById("label-frequency").value = "2";
        document.getElementById("moving-ratio").value = "25";
        document.getElementById("seed").value = "31415";
        await window.__WEBGUI_DEMO__.rebuild();
        window.__WEBGUI_DEMO__.setRunning(true);
      });
      await page.waitForTimeout(1300);
      await run("performance config, frame sampling and bounded active set", () => {
        const summary = window.__WEBGUI_DEMO__.summary();
        window.__assert(
          summary.config.deviceCount === 64 && summary.config.seed === 31415 && summary.config.movingRatio === 0.25,
          "reported config differs from applied scene",
        );
        window.__assert(
          summary.frameCpuMs.samples > 0 && summary.frameCpuMs.p95 !== null && summary.uploadedBytes > 0,
          "frame CPU/upload sampling absent",
        );
        window.__assert(
          summary.activeMotionCount <= 16 && summary.meanBatchUtilization >= 0 && summary.meanBatchUtilization <= 1,
          "active ratio or utilization invalid",
        );
        window.__assert(
          summary.gpuMs === "unavailable" && summary.effectiveDpr > 0 && summary.config.pipelineCount === 16,
          "GPU/DPR/pipeline fields absent",
        );
        return {
          samples: summary.frameCpuMs.samples,
          median: summary.frameCpuMs.median,
          p95: summary.frameCpuMs.p95,
          uploadedBytes: summary.uploadedBytes,
          utilization: summary.meanBatchUtilization,
        };
      });
      await page.evaluate(() => {
        document.getElementById("label-frequency").value = "0";
        window.__WEBGUI_DEMO__.setRunning(false);
      });
      await run("consecutive synchronous frames keep upload/call samples", async () => {
        const d = window.__WEBGUI_DEMO__,
          v = d.viewer;
        document.getElementById("label-frequency").dispatchEvent(new Event("change"));
        await new Promise((resolve) => setTimeout(resolve, 250));
        const before = d.summary();
        d.devices[0].body.setTint("#ff0000");
        v.flush();
        d.devices[0].body.setTint("#00ff00");
        v.flush();
        const after = d.summary();
        window.__assert(
          after.frameCpuMs.samples === before.frameCpuMs.samples + 2,
          "onAfterFrame lost same-task flush samples",
        );
        window.__assert(
          after.uploadedBytes >= before.uploadedBytes + 32 &&
            after.colorCalls >= before.colorCalls + v.stats.colorCalls * 2,
          "same-task upload/call counters lost a frame",
        );
        return {
          sampleDelta: after.frameCpuMs.samples - before.frameCpuMs.samples,
          uploadDelta: after.uploadedBytes - before.uploadedBytes,
        };
      });
      await page.goto(`${base}/debug/offline/index.html`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__OFFLINE_CHECK__?.ready);
      results.push({ dpr, name: "offline GLSL3/GUI page", pass: true });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const summary = {
  results,
  runtimeErrors,
  passed: results.filter((result) => result.pass).length,
  failed: results.filter((result) => !result.pass).length,
};
fs.writeFileSync("/tmp/webgui-browser-results.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.failed || runtimeErrors.length) process.exitCode = 1;
