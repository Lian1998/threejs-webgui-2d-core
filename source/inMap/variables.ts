import * as THREE from "three";

import { GpuPickManager } from "@core/index";

export const ThreejsGroups = {
  BaseMap: new THREE.Group(),
  Represents: new THREE.Group(),
  Meshes: new THREE.Group(),
};

ThreejsGroups.BaseMap.name = "BaseMap";
ThreejsGroups.Represents.name = "Represents";
ThreejsGroups.Meshes.name = "Meshes";

export enum ThreejsLayers {
  PickBufferLayer = GpuPickManager.PickBufferLayer,
}

export enum ThreejsRenderOrder {
  PLACEHOLDER0,

  BLOCK_NO,

  BLOCK_PREDEFINE, // 预设禁行区
  BLOCK_PREDEFINE_LABEL, // 预设禁行区

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
