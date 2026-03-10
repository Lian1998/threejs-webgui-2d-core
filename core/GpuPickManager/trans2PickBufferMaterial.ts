import * as THREE from "three";

import type { GpuPickFeatureData } from "./GpuPickManager";

const PickBufferShaderCache: Record<string, THREE.WebGLProgramParametersWithUniforms> = {};
window["PickBufferShaderCache"] = PickBufferShaderCache;

const PICKABLE_SHADER_NAMES = new Set(["Sprite2DMaterial", "SDFText2DMaterial", "MeshLineMaterial", "MeshPolygonMaterial"]);

/**
 * 将原材质转换为 pickBuffer 材质。
 */
export const trans2PickBufferMaterial = (meshLike: THREE.MeshLike, materialIn: THREE.Material, materialOut: THREE.Material, featureData: GpuPickFeatureData) => {
  materialOut.defines = { ...(materialOut.defines ?? {}), USE_PICK_BUFFER: 1 };

  if (featureData.mode === "uniform") {
    materialOut.defines.USE_PICK_BUFFER_UNIFORM = 1;
    delete materialOut.defines.USE_PICK_BUFFER_ATTRIBUTE;
  } else {
    materialOut.defines.USE_PICK_BUFFER_ATTRIBUTE = 1;
    delete materialOut.defines.USE_PICK_BUFFER_UNIFORM;
  }

  materialOut.onBeforeCompile = (shaderObject: THREE.WebGLProgramParametersWithUniforms) => {
    if (featureData.mode === "uniform") {
      shaderObject.uniforms["uPickColor"] = featureData.uniforms.uPickColor;
    }

    if (PICKABLE_SHADER_NAMES.has(shaderObject.shaderName)) {
      PickBufferShaderCache[shaderObject.shaderName] = shaderObject;
    }
  };

  materialOut.needsUpdate = true;
};
