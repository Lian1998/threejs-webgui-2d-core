import TinySDF from "tiny-sdf";
import { makeRGBAImageData } from "@core/utils/canvas2d_buffers";
import vs from "@core/SDFText2D/shaders/glyphs.vs?raw";
import fs from "@core/SDFText2D/shaders/glyphs.fs?raw";

const fontSize = 128;
const buffer = Math.ceil(fontSize / 8);
const radius = Math.ceil(fontSize / 3);

const glyphs = new Map<string, ReturnType<TinySDF["draw"]>>();

// 通过 tiny-sdf 获取字形相关信息
// repo: https://github.com/mapbox/tiny-sdf
// demo: https://github.com/mapbox/tiny-sdf/blob/main/index.html
// demo-page: https://mapbox.github.io/tiny-sdf/
// sdf in webgl: https://cs.brown.edu/people/pfelzens/papers/dt-final.pdf
const tinySdf = new TinySDF({
  fontSize: fontSize, // Font size in pixels
  fontFamily: "sans-serif", // CSS font-family
  fontWeight: "normal", // CSS font-weight
  fontStyle: "normal", // CSS font-style
  buffer: buffer, // Whitespace buffer around a glyph in pixels
  radius: radius, // How many pixels around the glyph shape to use for encoding distance
  cutoff: 0.25, // How much of the radius (relative) is used for the inside part of the glyph
});

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
};

function createProgram(gl: WebGLRenderingContext, vsSource, fsSource) {
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
}

export const initialization = () => {
  // const text = "你好 世界!";
  const text = "Hello World!";

  let canvasWidth = 0;
  let canvasHeight = 0;

  for (const char of text) {
    const glyph = glyphs.get(char) || tinySdf.draw(char);
    glyphs.set(char, glyph);

    const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
    canvasWidth += glyphAdvance;
    canvasHeight = Math.max(canvasHeight, height);
  }
  canvasWidth = Math.ceil(canvasWidth);
  canvasHeight = Math.ceil(canvasHeight);

  // 将字形出来的单通道纹理转化为4通道的, 并且输出到canvas上
  const canvas = document.querySelector("#viewport") as HTMLCanvasElement;
  const gl = canvas.getContext("webgl2");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // prettier-ignore
  const vertices = new Float32Array([
    // x, y, u, v
    -0.5, -0.5, 0, 0,
    +0.5, -0.5, 1, 0,
    +0.5, +0.5, 1, 1,
    -0.5, +0.5, 0, 1,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  const program = createProgram(gl, vs, fs);
  gl.useProgram(program);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

  const aTexCoord = gl.getAttribLocation(program, "aTexCoord");
  gl.enableVertexAttribArray(aTexCoord);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);

  const alphaData = new Uint8Array([0, 128, 255, 64]); // 2x2

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 2, 2, 0, gl.RED, gl.UNSIGNED_BYTE, alphaData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uOffsetLoc = gl.getUniformLocation(program, "uOffset");
  const uScaleLoc = gl.getUniformLocation(program, "uScale");
  const uTextureLoc = gl.getUniformLocation(program, "uTexture");

  // 示例

  const quads = [
    { offset: [-0.5, 0.0], scale: [0.4, 0.4] },
    { offset: [0.5, 0.0], scale: [0.3, 0.3] },
  ];

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(uTextureLoc, 0);

  for (const q of quads) {
    gl.uniform2fv(uOffsetLoc, q.offset);
    gl.uniform2fv(uScaleLoc, q.scale);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }

  // let x = 0;
  // for (const char of text) {
  //   const glyph = glyphs.get(char);
  //   console.log(char, glyph);
  //   const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;

  //   const offsetX = -1 + (x / canvasWidth) * 2;
  //   const offsetY = -1 + ((canvasHeight - height + (glyphHeight - glyphTop)) / canvasHeight) * 2;
  //   console.log([offsetX, offsetY]);
  //   gl.uniform2f(uOffset, offsetX, offsetY);
  //   gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  //   x += glyphAdvance;
  // }

  // let x = 0;
  // for (const char of text) {
  //   const glyph = glyphs.get(char);
  //   const { data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance } = glyph;
  //   console.log(char, glyph);
  //   if (char !== " ") {
  //     // data is a Uint8ClampedArray array of alpha values (0–255) for a width x height grid.
  //     const imageData = new ImageData(makeRGBAImageData(data, width, height), width, height);
  //     ctx.putImageData(imageData, x, canvasHeight - height + (glyphHeight - glyphTop));
  //   }
  //   x += glyphAdvance;
  // }
};
