import { unit } from "./harness";
import { PrimitiveRegistry } from "../../primitives/PrimitiveRegistry";
import { PrimitiveFactory } from "../../primitives/PrimitiveFactory";
import { LayerManager } from "../../layers/LayerManager";

const page = unit("图元生命周期", "只组装注册表和工厂, 不加载图片字体或 GPU.");
void page.run(async () => {
  const registry = page.own(new PrimitiveRegistry());
  const layers = page.own(new LayerManager(registry, () => {}));
  layers.add({ id: "main", order: 0 });
  const factory = new PrimitiveFactory(
    registry,
    layers,
    async () => {},
    () => {},
  );
  const handle = factory.addLine({
    id: "sample",
    layer: "main",
    points: [
      [0, 0],
      [2, 0],
    ],
    color: "#fff",
    width: 2,
    transform: { rotation: 0.5 },
  });
  handle.setPosition([3, 4]);
  page.check(handle.transform.rotation === 0.5, "部分 transform 更新保留 rotation");
  page.check(Object.isFrozen(handle.getOptions().points), "返回的状态快照不可变");
  const version = handle.version;
  handle.setPosition([3, 4]);
  page.check(handle.version === version, "无变化的更新不增加版本");
  const pickId = handle.pickId,
    generation = handle.generation;
  handle.dispose();
  handle.dispose();
  const replacement = factory.addLine({
    id: "sample",
    layer: "main",
    points: [
      [0, 0],
      [1, 1],
    ],
    color: "#fff",
    width: 1,
  });
  page.check(replacement.pickId === pickId && replacement.generation > generation, "重用拾取 ID 时递增 generation");
  let rejected = false;
  try {
    handle.setPosition([9, 9]);
  } catch {
    rejected = true;
  }
  page.check(rejected, "旧 handle 无法修改新图元");
  page.show({ id: replacement.id, pickId, generation: replacement.generation });
});
