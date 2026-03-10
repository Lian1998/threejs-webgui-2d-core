import * as THREE from "three";

export type GpuPickEventType = "movein" | "moveout" | "selected" | "cancelSelected" | "doubleClicked" | "zoomTo";

export interface GpuPickEvent {
  type: GpuPickEventType;
  pickid: number;
  meshLike?: THREE.MeshLike;
  screen?: { x: number; y: number };
  nativeEvent?: MouseEvent;
}

/** 支持 GpuPickBuffer 拾取 */
export interface GpuPickFeature {
  isGpuPickFeature: true;

  onSelected?: (event?: GpuPickEvent) => void;
  onCancelSelected?: (event?: GpuPickEvent) => void;
  onDoubleClicked?: (event?: GpuPickEvent) => void;
  onMovein?: (event?: GpuPickEvent) => void;
  onMoveout?: (event?: GpuPickEvent) => void;
  onZoomTo?: (event?: GpuPickEvent) => void;
}
