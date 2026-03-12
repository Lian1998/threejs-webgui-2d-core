import * as THREE from "three";

export interface GpuBatchFeature {
  isGpuBatchFeature: true;

  primitives: Record<string, { ava: THREE.Object3D; mesh: THREE.Object3D }>;
}
