export interface GpuPickFeature {
  onSelected?: () => void;
  onCancelSelected?: () => void;
  onDoubleClicked?: () => void;
  onMovein?: () => void;
  onMoveout?: () => void;
  onZoomTo?: () => void;
}
