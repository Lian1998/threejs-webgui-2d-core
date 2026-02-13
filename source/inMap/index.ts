import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager";

export const ThreejsGroups = {
  BaseMap: new THREE.Group(),
  Devices: new THREE.Group(),
};

export enum ThreejsLayers {
  PickBufferLayer = GpuPickManager.PickBufferLayer,
}

export enum ThreejsRenderOrder {
  PLACEHOLDER0,

  BLOCK_NO,

  AGV_BASE,
  AGV_HEADER,

  ASC_GANTRY,
  ASC_TROLLEY,

  STS_GANTRY,
  STS_TROLLEY,

  ASC_LABEL,
  STS_LABEL,
  AGV_LABEL,

  ACTIVE_LABEL, // 当前hover的Label
}

export const initializationInMapPart = (viewport: HTMLDivElement, spy: HTMLDivElement) => {};
