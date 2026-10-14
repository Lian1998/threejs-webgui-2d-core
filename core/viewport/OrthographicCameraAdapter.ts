import { OrthographicCamera, Vector3, type Camera } from "three";
import type { Vec2 } from "../contracts";

export interface ViewState {
  center: Vec2;
  scale: number;
}

export interface CameraAdapter {
  readonly camera: Camera;
  update(state: ViewState, cssSize: Vec2): void;
  screenToWorld(screen: Vec2): Vec2;
  worldToScreen(world: Vec2): Vec2;
}

/** 从 +Y 俯视 XZ 平面, 逻辑 y 对应 -Z, 屏幕顶部对应逻辑 +y. */
export class OrthographicCameraAdapter implements CameraAdapter {
  readonly camera: OrthographicCamera;
  private size: Vec2 = [1, 1];
  private readonly point = new Vector3();

  constructor(private readonly height = 10_000) {
    if (!Number.isFinite(height) || height <= 0) throw new Error("Camera height must be positive");
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, height * 10);
    this.camera.up.set(0, 0, -1);
  }

  update(state: ViewState, cssSize: Vec2): void {
    this.size = [Math.max(1, cssSize[0]), Math.max(1, cssSize[1])];
    const halfWidth = this.size[0] / state.scale / 2;
    const halfHeight = this.size[1] / state.scale / 2;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.position.set(state.center[0], this.height, -state.center[1]);
    this.camera.lookAt(state.center[0], 0, -state.center[1]);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  screenToWorld(screen: Vec2): Vec2 {
    this.point.set((screen[0] / this.size[0]) * 2 - 1, 1 - (screen[1] / this.size[1]) * 2, 0);
    this.point.unproject(this.camera);
    return [this.point.x, -this.point.z];
  }

  worldToScreen(world: Vec2): Vec2 {
    this.point.set(world[0], 0, -world[1]).project(this.camera);
    return [((this.point.x + 1) / 2) * this.size[0], ((1 - this.point.y) / 2) * this.size[1]];
  }
}
