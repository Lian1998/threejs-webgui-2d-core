import * as THREE from "three";

import { GpuPickManager } from "./GpuPickManager";

import { insertUniformBeforeMain } from "@core/utils/shader_insertUniformBeforeMain";
import { appendAfterLastFragColor } from "@core/utils/shader_appendAfterLastFragColor";

const shaderCache: Record<string, { vertexShader?: string; fragmentShader?: string }> = {};

declare type MeshLike = THREE.Mesh | THREE.InstancedMesh;

/**
 * 将传入的Object3D对应的材质转化成PickBuffer渲染材质, 在这个函数中进行shader片段的处理
 * @param {THREE.Object3D} meshLike 需要转换的Object3D, 这里保证是个会被渲染的Mesh
 * @param {THREE.Material} materialIn Object3D原本的材质
 * @param {THREE.Material} materialOut 用于渲染PickBuffer的材质
 */
export const trans2PickBufferMaterial = (meshLike: MeshLike, materialIn: THREE.Material, materialOut: THREE.Material) => {
  const featureData = GpuPickManager.featureDataMap.get(meshLike);

  // DEF
  materialOut.defines["USE_PICK_BUFFER"] = 1;

  // Mesh
  if ((meshLike as THREE.Mesh).isMesh) {
    materialOut.onBeforeCompile = (shaderObject: THREE.WebGLProgramParametersWithUniforms) => {
      shaderObject.uniforms["uPickColor"] = featureData.uniforms.uPickColor;

      // Sprite2DShaderMaterial
      if (materialIn.name === "Sprite2DShaderMaterial") {
        if (!shaderCache["Sprite2DShaderMaterial"]) shaderCache["Sprite2DShaderMaterial"] = {};
        const shaderCacheE = shaderCache["Sprite2DShaderMaterial"];
        if (!shaderCacheE.fragmentShader) {
          let _fragmentShader = shaderObject.fragmentShader;
          _fragmentShader = insertUniformBeforeMain(_fragmentShader, "uniform vec3 uPickColor;");
          _fragmentShader = appendAfterLastFragColor(
            _fragmentShader,
            // prettier-ignore
            "if (gl_FragColor.a == 0.0) {",
            "  discard;",
            "}",
            "gl_FragColor = vec4(uPickColor, 1.0);",
          );
          shaderCacheE.fragmentShader = _fragmentShader;
        }
        shaderObject.fragmentShader = shaderCacheE.fragmentShader;
      }
      // SDFText2DShaderMaterial
      else if (materialIn.name === "SDFText2DShaderMaterial") {
        if (!shaderCache["SDFText2DShaderMaterial"]) shaderCache["SDFText2DShaderMaterial"] = {};
        const shaderCacheE = shaderCache["SDFText2DShaderMaterial"];
        if (!shaderCacheE.fragmentShader) {
          let _fragmentShader = shaderObject.fragmentShader;
          _fragmentShader = insertUniformBeforeMain(_fragmentShader, "uniform vec3 uPickColor;");
          _fragmentShader = appendAfterLastFragColor(_fragmentShader, "gl_FragColor = vec4(uPickColor, 1.0);");
          shaderCacheE.fragmentShader = _fragmentShader;
        }
        shaderObject.fragmentShader = shaderCacheE.fragmentShader;
      }
    };
  }

  // InstancedMesh
  else if ((meshLike as THREE.InstancedMesh).isInstancedMesh) {
  }
};
