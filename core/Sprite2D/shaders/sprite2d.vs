in vec3 position;
in vec2 uv;
in float aPage;
#ifdef USE_MULTIPLY_COLOR
flat in vec3 aMultiplyColor;
#endif
#ifdef USE_PICK_BUFFER
flat in vec3 aPickColor;
#endif

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

out vec2 vUv;
flat out int vPage;
#ifdef USE_MULTIPLY_COLOR
out vec3 vMultiplyColor;
#endif
#ifdef USE_PICK_BUFFER
flat out vec3 vPickColor;
#endif

void main() {
  vUv = uv;
  vPage = int(aPage);
#ifdef USE_MULTIPLY_COLOR
  vMultiplyColor = aMultiplyColor;
#endif
#ifdef USE_PICK_BUFFER
  vPickColor = aPickColor;
#endif

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}