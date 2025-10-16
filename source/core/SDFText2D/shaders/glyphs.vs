#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
uniform vec2 uOffset; // 矩形偏移
uniform vec2 uScale;  // 矩形缩放
out vec2 vTexCoord;
void main() {
  vec2 pos = aPosition * uScale + uOffset;
  gl_Position = vec4(pos, 0.0, 1.0);
  vTexCoord = aTexCoord;
}