uniform sampler2D uTexture;
uniform vec3 uColor;

varying vec2 vUv;

vec4 multiplyBlendPM(vec4 src, vec4 dst) {
  vec3 rgb = src.rgb * dst.rgb + src.rgb * (1.0 - dst.a) + dst.rgb * (1.0 - src.a);
  return vec4(rgb, src.a);
}

void main() {

  vec4 tColor = texture2D(uTexture, vUv);
  gl_FragColor = multiplyBlendPM(tColor, vec4(uColor, 1.0));
}