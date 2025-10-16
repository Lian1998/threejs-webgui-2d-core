#version 300 es
precision highp float;
in vec2 vTexCoord;
uniform sampler2D uTexture;
out vec4 fragColor;
void main() {
  float alpha = texture(uTexture, vTexCoord).r; // 读取单通道alpha
  fragColor = vec4(vec3(alpha), 1.0);          // 映射为灰度
}