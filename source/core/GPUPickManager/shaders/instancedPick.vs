attribute vec3 position;
        #ifdef USE_INSTANCING
attribute mat4 instanceMatrix;
        #endif
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
          #ifdef USE_INSTANCING
  vec4 mvPosition = modelViewMatrix * (instanceMatrix * vec4(position, 1.0));
          #else
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          #endif
  gl_Position = projectionMatrix * mvPosition;
}