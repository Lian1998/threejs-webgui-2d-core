attribute vec2 aTextCoord;
varying vec2 vTextCoord;

void main() {
  vTextCoord = aTextCoord;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}