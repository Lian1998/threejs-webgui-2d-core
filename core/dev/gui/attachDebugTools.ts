import type { PrimitiveRegistry } from "../../primitives/PrimitiveRegistry";
import type { PrimitiveHandle } from "../../contracts";
import type { InteractionController } from "../../interaction/InteractionController";
import type { MotionController } from "../../motion/MotionController";
import type { EntityRegistry } from "../../composition/EntityRegistry";
import { DebugRegistry } from "./DebugRegistry";
import { DebugGUIManager, type DebugGUIOptions } from "./DebugGUIManager";
import { createDebugProxy, EntityDebugProxy } from "./DebugProxy";
import { isDebugEnabled } from "./metadata";

export interface DebugViewerHost {
  readonly registry: PrimitiveRegistry;
  readonly interaction: InteractionController;
  readonly motion: MotionController;
  readonly entities?: EntityRegistry;
  readonly disposed?: boolean;
  onDispose?: (listener: () => void) => () => void;
}
export interface DebugTools {
  registry: DebugRegistry;
  manager: DebugGUIManager;
  dispose(): void;
}

/** Viewer 只在 __WEBGUI_DEBUG__ 分支动态导入此模块, 核心图元不静态依赖 GUI. */
export function attachDebugTools(viewer: DebugViewerHost, options: DebugGUIOptions = {}): DebugTools | undefined {
  if (!isDebugEnabled() || viewer.disposed) return undefined;
  const registry = new DebugRegistry(),
    manager = new DebugGUIManager(registry, options);
  const primitives = new Map<string, { debugId: string; cleanup: () => void }>(),
    entities = new Map<string, () => void>();
  const cleanups: Array<() => void> = [];
  let disposed = false;
  const uniqueDebugId = (preferred: string, prefix: string): string => {
    let id = preferred;
    while (registry.get(id)) id = `${prefix}:${id}`;
    return id;
  };
  const registerPrimitive = (handle: PrimitiveHandle<any>) => {
    if (disposed || handle.disposed || primitives.has(handle.id)) return;
    const debugId = uniqueDebugId(handle.id, "primitive");
    const unregister = registry.register({
      debugId,
      label: `${handle.kind}: ${handle.id}`,
      target: createDebugProxy(handle, viewer.motion),
      get ownerId() {
        return handle.getOptions().ownerId;
      },
    });
    const unlisten = handle.onDispose(() => removePrimitive(handle.id));
    primitives.set(handle.id, {
      debugId,
      cleanup: () => {
        unlisten();
        unregister();
      },
    });
  };
  const removePrimitive = (id: string) => {
    const registration = primitives.get(id);
    primitives.delete(id);
    registration?.cleanup();
  };
  const syncEntities = () => {
    if (!viewer.entities || disposed) return;
    const present = new Set(viewer.entities.list().map((entity) => entity.id));
    for (const [id, cleanup] of entities)
      if (!present.has(id)) {
        entities.delete(id);
        cleanup();
      }
    for (const entity of viewer.entities.list()) {
      if (entity.disposed || entities.has(entity.id)) continue;
      const unregister = registry.register({
        debugId: uniqueDebugId(`entity:${entity.id}`, "entity"),
        label: `设备: ${entity.id}`,
        ownerId: entity.id,
        target: new EntityDebugProxy(entity, viewer.motion),
      });
      const unlisten = entity.onDispose(() => {
        const cleanup = entities.get(entity.id);
        entities.delete(entity.id);
        cleanup?.();
      });
      entities.set(entity.id, () => {
        unlisten();
        unregister();
      });
    }
  };
  const tools: DebugTools = {
    registry,
    manager,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      manager.destroy();
      for (const cleanup of cleanups.splice(0)) cleanup();
      for (const registration of primitives.values()) registration.cleanup();
      for (const cleanup of entities.values()) cleanup();
      primitives.clear();
      entities.clear();
      registry.dispose();
    },
  };
  try {
    viewer.registry.list().forEach(registerPrimitive);
    syncEntities();
    cleanups.push(viewer.registry.onAdded(registerPrimitive));
    cleanups.push(viewer.registry.onRemoved((handle) => removePrimitive(handle.id)));
    cleanups.push(
      viewer.registry.onChanged(() => {
        syncEntities();
        manager.refresh();
      }),
    );
    if (viewer.entities) cleanups.push(viewer.entities.onChange(syncEntities));
    const showPrimitive = (id: string | undefined) => manager.show(id ? primitives.get(id)?.debugId : undefined);
    cleanups.push(viewer.interaction.onSelectionChange((change) => showPrimitive(change.current?.primitiveId)));
    showPrimitive(viewer.interaction.selected?.primitiveId);
    if (viewer.onDispose) cleanups.push(viewer.onDispose(tools.dispose));
  } catch (error) {
    tools.dispose();
    throw error;
  }
  return tools;
}
