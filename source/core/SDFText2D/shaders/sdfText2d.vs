attribute vec2 a_texcoord;
varying vec2 v_texcoord;

void main() {
  v_texcoord = a_texcoord;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}