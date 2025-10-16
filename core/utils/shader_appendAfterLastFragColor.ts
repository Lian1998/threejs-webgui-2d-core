/**
 * 在传入的代码字符串最终输出行`gl_FragColor=`后添加一行
 * @param {string} shaderCode 输入的代码字符串
 * @param {string} newAssignment 要插入的行
 * @returns {string} 输出的代码字符串
 */
export const appendAfterLastFragColor = (shaderCode: string, newAssignment: string): string => {
  // 支持 gl_FragColor = xxx; 后面可带注释和空格
  const regex = /([ \t]*)gl_FragColor\s*=\s*[^;]+;\s*(?:\/\/[^\n]*)?/g;

  let match: RegExpExecArray | null;
  let lastMatch = null;

  // 找到最后一个匹配
  while ((match = regex.exec(shaderCode)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch) {
    console.warn("没有找到 gl_FragColor 赋值");
    return shaderCode;
  }

  const indent = lastMatch[1] || ""; // 捕获行首空格或 tab
  const insertPos = lastMatch.index + lastMatch[0].length;

  // 保持相同缩进
  const newLine = `\n${indent}${newAssignment}\n`;

  return shaderCode.slice(0, insertPos) + newLine + shaderCode.slice(insertPos);
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
