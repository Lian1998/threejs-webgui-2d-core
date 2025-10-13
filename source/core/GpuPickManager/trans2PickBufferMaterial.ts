import * as THREE from "three";

import { USER_DATA_KEY } from "./GpuPickManager";
import type { GpuPickManagerUserData } from "./GpuPickManager";

import { insertUniformBeforeMain } from "@source/utils/shader_insertUniformBeforeMain";
import { appendAfterLastFragColor } from "@source/utils/shader_appendAfterLastFragColor";

const shaderCache: Record<string, { vertexShader?: string; fragmentShader?: string }> = {};

/**
 * 根据传入的 object3d
 * @param meshLike
 * @param materialIn
 * @param materialOut
 */
export const trans2PickBufferMaterial = (meshLike: THREE.Object3D, materialIn: THREE.Material, materialOut: THREE.Material) => {
  const userData = meshLike.userData[USER_DATA_KEY] as GpuPickManagerUserData;
  materialOut.defines["USE_PICK_BUFFER"] = 1;
  materialOut.onBeforeCompile = (shaderObject: THREE.WebGLProgramParametersWithUniforms) => {
    shaderObject.uniforms["uPickColor"] = userData.uniforms.uPickColor;

    // 自定义shader
    if (materialOut.name === "Sprite2DShaderMaterial") {
      if (!shaderCache["Sprite2DShaderMaterial"]) shaderCache["Sprite2DShaderMaterial"] = {};
      const shaderCacheE = shaderCache["Sprite2DShaderMaterial"];
      if (!shaderCacheE.fragmentShader) {
        let _fragmentShader = shaderObject.fragmentShader;
        _fragmentShader = insertUniformBeforeMain(_fragmentShader, "uniform vec3 uPickColor;");
        _fragmentShader = appendAfterLastFragColor(_fragmentShader, "gl_FragColor = vec4(uPickColor, 1.0);"); // gl_FragColor.a
        shaderCacheE.fragmentShader = _fragmentShader;
      }
      shaderObject.fragmentShader = shaderCacheE.fragmentShader;
    }
  };
};
