varying vec2 vUv;

uniform float uScale;
uniform vec2 uOffset;

void main() {
  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uScale, 1.0);
}