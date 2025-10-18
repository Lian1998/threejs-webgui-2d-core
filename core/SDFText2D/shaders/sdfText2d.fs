uniform sampler2D uTexture;
uniform vec3 uColor;

uniform float smoothing;
uniform float threshold;
uniform float opacity;

uniform float outlineDistance;
uniform vec3 outlineColor;

varying vec2 vUv;

void main() {
  float distance = texture2D(uTexture, vUv).r;

  float outlineFactor = smoothstep(threshold - smoothing, threshold + smoothing, distance);
  vec3 color2 = mix(outlineColor, uColor, outlineFactor);
  float alpha = smoothstep(outlineDistance - smoothing, outlineDistance + smoothing, distance);
  alpha *= opacity;
  gl_FragColor = vec4(color2, alpha);
}