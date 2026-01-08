import TinySDF from "tiny-sdf";
import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";

export const glyphs = new Map<string, ReturnType<TinySDF["draw"]>>();

const vsSource = /*glsl*/ `
attribute vec2 position;
attribute vec2 uv;
uniform vec2 uOffset;
uniform vec2 uTSize;
uniform vec2 uCSize;
varying vec2 vUv;
// 0.12252475247524752, 0.708029197080292
void main() {
    vec2 size = uTSize / uCSize;
    vec2 vert_pos = position * size - vec2(1.0);
    vec2 offset = uOffset / uCSize * 2.0;
    gl_Position = vec4(vert_pos + size + vec2(offset.x, 0.0), 0.0, 1.0);
    vUv = uv;
}`;

const fsSource = /*glsl*/ `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
    float alpha = texture2D(uTexture, vUv).r;
    gl_FragColor = vec4(vec3(alpha), 1.0);
}`;

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string) => {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
  }
  return program;
};

export const gen = (tinySdf: TinySDF, text: string) => {
  console.time(`TinySDF.Canvas2D.gen`);

  const chars = Array.from(text);

  let canvasWidth = 0;
  let canvasHeight = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const glyph = glyphs.get(char) || tinySdf.draw(char);
    glyphs.set(char, glyph);

    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    if (i + 1 !== chars.length) {
      canvasWidth += glyphAdvance;
    } else {
      canvasWidth += width;
    }
    canvasHeight = Math.max(canvasHeight, height);
  }
  canvasWidth = Math.ceil(canvasWidth);
  canvasHeight = Math.ceil(canvasHeight);

  // 将字形出来的单通道纹理转化为4通道的, 并且输出到canvas上
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const gl = canvas.getContext("webgl2");
  gl.viewport(0, 0, canvasWidth, canvasHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.MAX);

  // prettier-ignore
  const vertices = new Float32Array([
    // x, y, u, v
    -1.0, -1.0, 0, 0,
    +1.0, -1.0, 1, 0,
    +1.0, +1.0, 1, 1,
    -1.0, +1.0, 0, 1,
  ]);

  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const program = createProgram(gl, vsSource, fsSource);
  gl.useProgram(program);

  // 创建 VAO / VBO
  const position = gl.getAttribLocation(program, "position");
  const uv = gl.getAttribLocation(program, "uv");
  const uOffset = gl.getUniformLocation(program, "uOffset"); // 当前字形贴图的 dx, dy
  const uTSize = gl.getUniformLocation(program, "uTSize"); // 整个canvas的 width, height
  const uCSize = gl.getUniformLocation(program, "uCSize"); // 整个canvas的 width, height
  const uTexture = gl.getUniformLocation(program, "uTexture");

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);

  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  let x = 0;
  for (let i = 0; i < chars.length; i++) {
    //
    const char = chars[i];
    const glyph = glyphs.get(char);
    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    if (char !== " ") {
      // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
      const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);

      const dx = x;
      const dy = canvasHeight - height + (glyphHeight - glyphTop);

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // 允许上传宽度不是 4 的倍数的单通道纹理
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // flipY
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, imageData);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(uTexture, 0);

      gl.uniform2fv(uOffset, [dx, dy]);
      gl.uniform2fv(uTSize, [width, height]);
      gl.uniform2fv(uCSize, [canvasWidth, canvasHeight]);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
    x += glyphAdvance;
  }

  console.timeEnd(`TinySDF.Canvas2D.gen`);

  return canvas;
};
