import type { Viewer2D } from "../Viewer2D";
import type { EntityView } from "../composition/EntityView";
import type { LineHandle, MotionHandle, PolygonHandle, SpriteHandle, TextHandle, TransformTarget, Vec2 } from "../public";

/** 组合设备用法示例, 把多个图元连接到 EntityView 和 MotionController.
 * 业务示例不属于底层渲染机制, 独立模块调试不需要加载完整设备场景. */
export class SimulatedDevice implements TransformTarget {
  readonly entity: EntityView;
  readonly body: SpriteHandle;
  readonly head: SpriteHandle;
  readonly box: PolygonHandle;
  readonly label?: TextHandle;
  readonly route?: LineHandle;
  readonly movement: MotionHandle;
  private disposed = false;

  constructor(
    readonly view: Viewer2D,
    readonly id: string,
    position: Vec2,
    withLabel = true,
    withRoute = true,
  ) {
    this.entity = view.entities.create({ id, transform: { position } });
    this.body = view.primitives.addSprite({ id: `${id}/body`, layer: "devices", image: "body", size: [2.2, 3.7] });
    this.head = view.primitives.addSprite({
      id: `${id}/head`,
      layer: "devices",
      image: "head",
      size: [1.9, 0.95],
      transform: { position: [0, 1.35] },
    });
    this.box = view.primitives.addPolygon({
      id: `${id}/box`,
      layer: "cargo",
      fill: "#b8cfde",
      opacity: 0.85,
      geometry: {
        type: "Polygon",
        polygon: {
          outer: [
            [-0.66, -0.9],
            [0.66, -0.9],
            [0.66, 0.55],
            [-0.66, 0.55],
          ],
        },
      },
    });
    this.entity.addPart("body", this.body).addPart("head", this.head).addPart("box", this.box);
    if (withLabel) {
      this.label = view.primitives.addText({
        id: `${id}/label`,
        layer: "labels",
        font: "demo",
        text: `设备 ${id}`,
        fontSize: 12,
        sizeMode: "screen",
        transform: { position: [0, -2.65] },
        color: "#e8f5fb",
        background: { color: "#253648", opacity: 0.9, radius: 3 },
        padding: [3, 5, 3, 5],
      });
      this.entity.addPart("label", this.label);
    }
    if (withRoute) {
      // 历史路线关联设备 owner, 使用世界坐标且不纳入车身的父变换.
      this.route = view.primitives.addLine({
        id: `${id}/route`,
        ownerId: id,
        partId: "route",
        layer: "routes",
        points: [position, [position[0] + 7, position[1] + 2]],
        color: "#47727f",
        width: 1.5,
        widthMode: "screen",
        dash: { length: 4, gap: 6 },
      });
    }
    this.movement = view.motion.bind(this.entity, { durationMs: 180 });
    this.movement.push({ position, rotation: 0 });
  }
  setPosition(position: Vec2): this {
    this.entity.setPosition(position);
    return this;
  }
  setRotation(radians: number): this {
    this.entity.setRotation(radians);
    return this;
  }
  update(position: Vec2, rotation: number, status = "正常"): void {
    this.movement.push({ position, rotation });
    this.body.setTint(status === "故障" ? "#ff8966" : "#ffffff");
    this.label?.setText(`设备 ${this.id} ${status}`);
  }
  async ready(): Promise<void> {
    await Promise.all([this.body.ready(), this.head.ready(), this.label?.ready()]);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.movement.dispose();
    this.route?.dispose();
    this.entity.dispose();
  }
}
