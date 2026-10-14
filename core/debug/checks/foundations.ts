import { LocalCoordinateAdapter } from "../../coordinates/CoordinateAdapter";
import { FrameScheduler } from "../../scheduler/FrameScheduler";
import { ResourceStore } from "../../resources/ResourceStore";
import { MotionController, shortestAngleDelta } from "../../motion/MotionController";
import { EntityRegistry } from "../../composition/EntityRegistry";
import { OrthographicCameraAdapter } from "../../viewport/OrthographicCameraAdapter";
import { BasePrimitive } from "../../primitives/PrimitiveHandle";
import type { SpriteOptions, TransformTarget, Vec2 } from "../../contracts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Foundation check failed: ${message}`);
}
function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

/** 可由 debug 页面直接运行, 不依赖 GPU 或额外测试框架. */
export async function runFoundationChecks(): Promise<string[]> {
  const results: string[] = [];
  let now = 0,
    sequence = 0;
  const queued = new Map<number, (time: number) => void>();
  const counts = { flush: 0, render: 0 };
  const scheduler = new FrameScheduler(
    {
      flushUpdates: () => {
        counts.flush++;
      },
      renderColor: () => {
        counts.render++;
      },
    },
    {
      now: () => now,
      requestFrame: (callback) => {
        queued.set(++sequence, callback);
        return sequence;
      },
      cancelFrame: (id) => {
        queued.delete(id);
      },
    },
  );
  const advance = (time: number) => {
    now = time;
    const callbacks = [...queued.values()];
    queued.clear();
    callbacks.forEach((callback) => callback(time));
  };
  for (let index = 0; index < 100; index++) scheduler.invalidate();
  assert(queued.size === 1, "invalidations coalesce");
  scheduler.flushNow();
  assert(queued.size === 0 && counts.flush === 1 && counts.render === 1, "flushNow consumes pending RAF");
  const releaseA = scheduler.acquireContinuous("a"),
    releaseB = scheduler.acquireContinuous("b");
  releaseA();
  advance(10);
  assert(queued.size === 1 && scheduler.continuousCount === 1, "independent continuous tokens");
  releaseB();
  assert(queued.size === 0, "no idle continuous RAF");
  results.push("scheduler: coalescing, flushNow, independent tokens");

  const coordinates = new LocalCoordinateAdapter({ origin: [485920.2, 2493695.8] });
  const local = coordinates.toLocal([485920.21, 2493695.82]);
  assert(near(local[0], 0.01) && near(local[1], 0.02), "large origin preserves centimeter differences");
  const roundtrip = coordinates.fromLocal(local);
  assert(near(roundtrip[0], 485920.21) && near(roundtrip[1], 2493695.82), "coordinate roundtrip");
  const camera = new OrthographicCameraAdapter();
  camera.update({ center: [0, 0], scale: 10 }, [800, 400]);
  const screen = camera.worldToScreen([5, -2]);
  assert(near(screen[0], 450) && near(screen[1], 220), "orthographic axis directions");
  const world = camera.screenToWorld(screen);
  assert(near(world[0], 5) && near(world[1], -2), "camera roundtrip");
  results.push("coordinates/viewport: large origin, directions, roundtrip");

  let position: Vec2 = [0, 0],
    rotation = 0;
  const target: TransformTarget = {
    setPosition(value) {
      position = [...value];
      return this;
    },
    setRotation(value) {
      rotation = value;
      return this;
    },
  };
  const motion = new MotionController(scheduler);
  const binding = motion.bind(target, { durationMs: 100 });
  binding.push({ position: [0, 0], rotation: (Math.PI * 359) / 180 });
  binding.push({ position: [10, 0], rotation: Math.PI / 180 });
  advance(60);
  assert(near(position[0], 5) && near(shortestAngleDelta(rotation, 0), 0), "latest motion follows shortest rotation arc");
  binding.push({ position: [20, 0], rotation: 0 });
  advance(110);
  assert(near(position[0], 12.5), "new target starts from displayed pose");
  advance(160);
  assert(near(position[0], 20) && queued.size === 0, "completed motion releases RAF");
  binding.pause();
  binding.push({ position: [30, 0], rotation: 0 });
  assert(near(position[0], 20), "pause accepts without writing");
  binding.resume();
  advance(260);
  assert(near(position[0], 30), "resume consumes latest paused sample");
  let timedPosition: Vec2 = [0, 0];
  const timedTarget: TransformTarget = {
    setPosition(value) {
      timedPosition = [...value];
      return this;
    },
    setRotation() {
      return this;
    },
  };
  const buffered = motion.bind(timedTarget, { mode: "timestamped", normalizeTime: (value) => value, delayMs: 100 });
  buffered.push({ position: [0, 0], rotation: 0, timestampMs: 260 });
  buffered.push({ position: [10, 0], rotation: 0, timestampMs: 360 });
  advance(410);
  assert(near(timedPosition[0], 5), "timestamped playback uses delay and neighboring samples");
  buffered.push({ position: [1000, 0], rotation: 0, timestampMs: 300 });
  advance(460);
  assert(near(timedPosition[0], 10) && queued.size === 0, "already-played samples are ignored and timestamped motion stops");
  motion.dispose();
  results.push("motion: shortest arc, target replacement, pause/resume, delayed timestamps, RAF release");

  let loads = 0,
    released = 0;
  const store = new ResourceStore();
  let resolveLoad!: (value: { n: number }) => void;
  const loader = () => {
    loads++;
    return new Promise<{ n: number }>((resolve) => {
      resolveLoad = resolve;
    });
  };
  const disposer = () => {
    released++;
  };
  const cancel = new AbortController();
  const first = store.acquire("test:image:v1", loader, disposer, { signal: cancel.signal });
  const rejected = first.catch((error) => error);
  const second = store.acquire("test:image:v1", loader, disposer);
  await Promise.resolve();
  cancel.abort();
  resolveLoad({ n: 7 });
  const lease = await second;
  assert(loads === 1 && (await rejected).name === "AbortError" && lease.value.n === 7, "shared load and isolated cancellation");
  const lease2 = await store.acquire("test:image:v1", loader, disposer);
  lease.release();
  assert(released === 0 && lease2.value.n === 7, "one release keeps other holder alive");
  lease2.release();
  lease2.release();
  assert(released === 1 && store.snapshot().length === 0, "last release disposes exactly once");
  let resolveLate!: (value: { n: number }) => void;
  const pending = store.acquire(
    "late",
    () =>
      new Promise<{ n: number }>((resolve) => {
        resolveLate = resolve;
      }),
    disposer,
  );
  const pendingRejected = pending.catch((error) => error);
  await Promise.resolve();
  store.dispose();
  resolveLate({ n: 8 });
  await pendingRejected;
  await Promise.resolve();
  assert(released === 2, "late completion after disposal is released");
  results.push("resources: de-duplication, cancellation, refcounts, late disposal");

  const entityRegistry = new EntityRegistry();
  const part = new BasePrimitive<SpriteOptions>("sprite", { layer: "test", image: "test", size: [1, 1], transform: { position: [2, 0] } }, { id: "part", sequence: 1, pickId: 1, generation: 1 }, { validateLayer: () => {}, changed: () => {}, removed: () => {} });
  const entity = entityRegistry.create({ id: "device", transform: { position: [10, 20], rotation: Math.PI / 2 } });
  entity.addPart("body", part);
  const elements = part.getEffectiveMatrix().elements;
  assert(near(elements[12], 10) && near(elements[14], -22), "entity parent composition");
  assert(part.transform.position[0] === 2 && part.getOptions().ownerId === "device", "local transform and owner association remain separate");
  entity.removePart("body");
  assert(near(part.transform.position[0], 10) && near(part.transform.position[1], 22), "detach preserves world pose");
  entity.addPart("body", part);
  part.update({ transform: { scale: [0, 1] } });
  let collapsedRejected = false;
  try {
    entity.removePart("body");
  } catch {
    collapsedRejected = true;
  }
  assert(collapsedRejected && entity.getPart("body") === part && part.getOptions().ownerId === entity.id && part.getOptions().partId === "body", "zero-scale detach must reject before changing ownership");
  part.update({ transform: { scale: [1, 1] } });
  entityRegistry.dispose();
  assert(part.disposed, "entity disposal releases parts");
  let reentered = false;
  const unsubscribe = scheduler.onFrame(() => {
    if (!reentered) {
      reentered = true;
      scheduler.flushNow();
    }
  });
  scheduler.invalidate();
  advance(500);
  assert(queued.size === 1, "frame callback flushNow is deferred without recursion");
  unsubscribe();
  advance(516);
  assert(queued.size === 0, "deferred flush is consumed once");
  scheduler.dispose();
  results.push("composition: effective matrix, local state, detach, ownership disposal");
  return results;
}
