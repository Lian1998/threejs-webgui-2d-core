import type { PickResult, SpriteOptions, Vec2 } from "../../contracts";
import { PrimitiveRegistry } from "../../primitives/PrimitiveRegistry";
import { BasePrimitive } from "../../primitives/PrimitiveHandle";
import { LayerManager } from "../../layers/LayerManager";
import { InteractionController, selectionKey } from "../../interaction/InteractionController";
import { FrameScheduler } from "../../scheduler/FrameScheduler";
import type { Viewport2D } from "../../viewport/Viewport2D";

function assert(value: unknown, message: string): void {
  if (!value) throw new Error(`Interaction check failed: ${message}`);
}

/** 用真实逻辑注册表和事件目标验证状态, 无 DOM 排版或 GPU 依赖. */
export async function runInteractionChecks(): Promise<string[]> {
  const registry = new PrimitiveRegistry();
  const scheduler = new FrameScheduler({ flushUpdates: () => registry.flushChanges(), renderColor: () => {} }, { now: () => 0, requestFrame: () => 1, cancelFrame: () => {} });
  const layers = new LayerManager(registry, () => scheduler.invalidate());
  layers.add({ id: "devices", order: 1 });
  const context = {
    validateLayer: (id: string) => layers.assert(id),
    changed: (handle: BasePrimitive<any>, dirty: any) => registry.mark(handle, dirty),
    removed: (handle: BasePrimitive<any>) => registry.remove(handle),
  };
  const make = (id: string, ownerId: string) => {
    const handle = new BasePrimitive<SpriteOptions>("sprite", { id, ownerId, partId: id, layer: "devices", image: "test", size: [1, 1] }, registry.identity(id), context);
    registry.add(handle);
    return handle;
  };
  const body = make("body", "a"),
    label = make("label", "a"),
    other = make("other", "b");
  const canvas = new EventTarget() as HTMLCanvasElement;
  const viewport = {
    state: { center: [0, 0], scale: 10 },
    revision: 0,
    isPanning: false,
    onChange: () => () => {},
    clientToScreen: (value: Vec2) => value,
    worldToScreen: (value: Vec2) => value,
    wasRecentlyPanning: () => false,
  } as unknown as Viewport2D;
  const hit = (handle: BasePrimitive<any>, screen: Vec2): PickResult => ({
    primitiveId: handle.id,
    ownerId: handle.getOptions().ownerId,
    partId: handle.getOptions().partId,
    layerId: "devices",
    screen,
    world: screen,
  });
  const resolveAt = (screen: Vec2) => (screen[0] < 2 ? hit(body, screen) : screen[0] < 3 ? hit(label, screen) : screen[0] < 4 ? hit(other, screen) : undefined);
  let resolveHover!: (hit: PickResult | undefined) => void;
  const controller = new InteractionController(canvas, {
    registry,
    layers,
    viewport,
    scheduler,
    picker: {
      pickAt: resolveAt,
      pickAtAsync: () =>
        new Promise((resolve) => {
          resolveHover = resolve;
        }),
    },
  });
  const events: string[] = [],
    changes: boolean[] = [];
  for (const handle of [body, label, other]) for (const event of ["select", "deselect", "pointerenter", "pointerleave"] as const) handle.on(event, () => events.push(`${handle.id}:${event}`));
  controller.onSelectionChange((change) => changes.push(change.selectionChanged));
  const dispatch = (type: string, x: number) => {
    const event = new Event(type);
    Object.defineProperties(event, { clientX: { value: x }, clientY: { value: 0 }, button: { value: 0 } });
    canvas.dispatchEvent(event);
  };
  dispatch("click", 1);
  dispatch("click", 2);
  assert(events.join(",") === "body:select" && controller.selected?.primitiveId === "label", "same owner selection is stable while active part changes");
  assert(changes.join(",") === "true,false", "GUI receives same-owner part changes");
  dispatch("click", 3);
  assert(events.slice(-2).join(",") === "body:deselect,other:select", "new owner deselects original event target");
  assert(selectionKey(hit(body, [0, 0])) !== selectionKey({ ...hit(body, [0, 0]), ownerId: undefined }), "owner and primitive namespaces differ");
  dispatch("pointermove", 1);
  controller.afterFrame();
  dispatch("pointermove", 2);
  resolveHover(hit(body, [1, 0]));
  for (let index = 0; index < 5; index++) await Promise.resolve();
  assert(!controller.hovered, "stale pointer result is discarded");
  controller.afterFrame();
  resolveHover(hit(label, [2, 0]));
  for (let index = 0; index < 5; index++) await Promise.resolve();
  assert(controller.hovered?.primitiveId === "label", "latest pointer result is accepted");
  label.dispose();
  assert(!controller.hovered && events.includes("label:pointerleave"), "deletion leaves before listeners are released");
  other.dispose();
  assert(!controller.selected && events.includes("other:deselect"), "selection cannot survive disposed handle");
  controller.dispose();
  controller.dispose();
  registry.dispose();
  layers.dispose();
  scheduler.dispose();
  return ["interaction: owner/part selection, event ordering, stale hover, deletion, idempotent disposal"];
}
