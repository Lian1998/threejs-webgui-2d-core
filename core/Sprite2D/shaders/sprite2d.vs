varying vec2 vUv;

uniform vec2 uOffset;

void main() {
  vUv = uv;

  vec3 offseted = vec3(position.x + uOffset.x, 0.0, position.z + uOffset.y);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(offseted, 1.0);
}