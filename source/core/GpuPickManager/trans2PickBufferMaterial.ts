import * as THREE from "three";

import { USER_DATA_KEY } from "./GpuPickManager";
import type { GpuPickManagerUserData } from "./GpuPickManager";

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

    shaderObject.fragmentShader = insertUniformBeforeMain(shaderObject.fragmentShader, "uniform vec3 uPickColor;");
    shaderObject.fragmentShader = appendAfterLastFragColor(shaderObject.fragmentShader, "gl_FragColor = vec4(uPickColor, gl_FragColor.a);");
    console.log(shaderObject.fragmentShader);
  };
};

/**
 * 在传入的代码字符串最终输出行`gl_FragColor=`后添加一行
 * @param {string} shaderCode 输入的代码字符串
 * @param {string} newAssignment 要插入的行
 * @returns {string} 输出的代码字符串
 */
const appendAfterLastFragColor = (shaderCode: string, newAssignment: string) => {
  // 支持 gl_FragColor = xxx; 后面可带注释和空格
  const regex = /gl_FragColor\s*=\s*[^;]+;\s*(?:\/\/[^\n]*)?/g;

  let match;
  let lastMatch = null;

  // 找到最后一个匹配
  while ((match = regex.exec(shaderCode)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch) {
    console.warn("没有找到 gl_FragColor 赋值");
    return shaderCode;
  }

  // lastMatch.index 是匹配起始位置，lastMatch[0].length 是匹配长度
  const insertPos = lastMatch.index + lastMatch[0].length;

  // 在完整行后插入新的 gl_FragColor
  return shaderCode.slice(0, insertPos) + `\n${newAssignment}\n` + shaderCode.slice(insertPos);
};

// // 示例用法
// let shader = `
// void main() {
//     vec4 color1 = vec4(1.0);
//     gl_FragColor = color1;
//     vec4 color2 = vec4(0.5);
//     gl_FragColor = color2; // 最后一个
// }
// `;
// let newShader = appendAfterLastFragColor(shader, "gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);");
//
// void main() {
//     vec4 color1 = vec4(1.0);
//     gl_FragColor = color1;
//     vec4 color2 = vec4(0.5);
//     gl_FragColor = color2; // 最后一个
//     gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
// }

/**
 * 在代码字符串 `void main()` 函数前添加一行
 * @param {string} shaderCode 输入的代码字符串
 * @param {string} uniformLine 要插入的行
 * @returns {string} 输出的代码字符串
 */
const insertUniformBeforeMain = (shaderCode: string, uniformLine: string): string => {
  // 匹配 "void main" 前的位置（忽略前面的空格或注释）
  const regex = /(^|\n)\s*void\s+main\s*\(/;

  const match = shaderCode.match(regex);
  if (!match) {
    console.warn("没有找到 void main() 函数");
    return shaderCode;
  }

  // 找到 main 的开始位置
  const insertIndex = match.index + match[1].length;

  // 在前面插入 uniform 行
  return shaderCode.slice(0, insertIndex) + `\n${uniformLine}\n` + shaderCode.slice(insertIndex);
};

// // 示例用法
// let shader = `
// precision mediump float;
//
// void main() {
//     vec4 color = vec4(1.0);
//     gl_FragColor = color;
// }
// `;
// let newShader = insertUniformBeforeMain(shader, "uniform vec3 uTintColor;");
//
// precision mediump float;
//
// uniform vec3 uTintColor;
// void main() {
//     vec4 color = vec4(1.0);
//     gl_FragColor = color;
// }
