uniform sampler2D uTexture;
uniform bool uUseMultipleColor; // 是否客户端自定义混色模式
uniform vec3 uColor;

varying vec2 vUv;

vec3 toLinear(vec3 srgb) {
  return pow(srgb, vec3(2.2));
}

vec3 toSrgb(vec3 linear) {
  return pow(linear, vec3(1.0 / 2.2));
}

void main() {

  vec4 tColor = texture2D(uTexture, vUv);
  vec3 color = tColor.rgb;

  if (uUseMultipleColor) {
    color = vec3(tColor.r * uColor.r, tColor.g * uColor.g, tColor.b * uColor.b);
  }

  gl_FragColor = vec4(toSrgb(color), tColor.a);
}