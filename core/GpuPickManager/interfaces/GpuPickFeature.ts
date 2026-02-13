export interface GpuPickFeature {
  isGpuPickFeature: true;
  onSelected?: () => void;
  onCancelSelected?: () => void;
  onDoubleClicked?: () => void;
  onMovein?: () => void;
  onMoveout?: () => void;
  onZoomTo?: () => void;
}
