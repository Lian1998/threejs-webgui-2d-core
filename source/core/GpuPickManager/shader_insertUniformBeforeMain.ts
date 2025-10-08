/**
 * 在代码字符串 `void main()` 函数前添加一行
 * @param {string} shaderCode 输入的代码字符串
 * @param {string} uniformLine 要插入的行
 * @returns {string} 输出的代码字符串
 */
export const insertUniformBeforeMain = (shaderCode: string, uniformLine: string): string => {
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
