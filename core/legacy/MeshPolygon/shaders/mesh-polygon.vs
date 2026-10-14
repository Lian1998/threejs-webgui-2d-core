uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
#include <batching_pars_vertex>
#ifdef USE_PICK_BUFFER_UNIFORM
uniform vec3 uPickColor;
#endif

in vec3 position;
#ifdef USE_PICK_BUFFER_ATTRIBUTE
in vec3 aPickColor;
#endif

#if defined(USE_PICK_BUFFER_ATTRIBUTE) || defined(USE_PICK_BUFFER_UNIFORM)
flat out vec3 vPickColor;
#endif

void main() {
#ifdef USE_BATCHING
  mat4 batchingMatrix = getBatchingMatrix(getIndirectIndex(gl_DrawID));
  vec4 localPosition = batchingMatrix * vec4(position, 1.0);
#else
  vec4 localPosition = vec4(position, 1.0);
#endif

#ifdef USE_PICK_BUFFER_ATTRIBUTE
  vPickColor = aPickColor;
#endif
#ifdef USE_PICK_BUFFER_UNIFORM
  vPickColor = uPickColor;
#endif

  gl_Position = projectionMatrix * modelViewMatrix * localPosition;
}
