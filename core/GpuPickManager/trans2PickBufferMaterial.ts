import * as THREE from "three";

import { GpuPickManager } from "./GpuPickManager";

/**
 * 这里使用一个对象 PickBufferShaderCache 来缓存一类材质编译之后的结果
 *
 * `console.log(window.PickBufferShaderCache['Sprite2DMaterial'].shaderObject.__vertexGlsl)`
 * `console.log(window.PickBufferShaderCache['Sprite2DMaterial'].shaderObject.__fragmentGlsl)`
 */
const PickBufferShaderCache: Record<string, THREE.WebGLProgramParametersWithUniforms> = {};
window["PickBufferShaderCache"] = PickBufferShaderCache;

/**
 * 将传入的Object3D对应的材质转化成PickBuffer渲染材质, 在这个函数中进行shader片段的处理
 * @param {THREE.MeshLike} meshLike 需要转换的Object3D, 这里保证是个会被渲染的Mesh
 * @param {THREE.Material} materialIn Object3D原本的材质
 * @param {THREE.Material} materialOut 用于渲染PickBuffer的材质
 */
export const trans2PickBufferMaterial = (meshLike: THREE.MeshLike, materialIn: THREE.Material, materialOut: THREE.Material) => {
  const featureData = GpuPickManager.featureDataMap.get(meshLike);

  materialOut.defines["USE_PICK_BUFFER"] = 1;

  // Mesh
  if ((meshLike as THREE.Mesh).isMesh) {
    materialOut.onBeforeCompile = (shaderObject: THREE.WebGLProgramParametersWithUniforms) => {
      shaderObject.uniforms["uPickColor"] = featureData.uniforms.uPickColor;

      // Sprite2DMaterial => USE_PICK_BUFFER
      if (materialIn.name === "Sprite2DMaterial") return;
      // SDFText2DMaterial => USE_PICK_BUFFER
      else if (materialIn.name === "SDFText2DMaterial") return;
    };
  }

  // InstancedMesh
  else if ((meshLike as THREE.InstancedMesh).isInstancedMesh) {
  }
};
