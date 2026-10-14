uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
#include <batching_pars_vertex>

in vec3 position;
in vec2 uv;
in float aPage;
in float aType;
in vec2 aLocalPos;
in float aLocalAspect;
#ifdef USE_PICK_BUFFER_ATTRIBUTE
in vec3 aPickColor;
#endif
#ifdef USE_PICK_BUFFER_UNIFORM
uniform vec3 uPickColor;
#endif

out vec2 vUv;
flat out int vPage;
flat out float vType;
out vec2 vLocalPos;
flat out float vLocalAspect;
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

  vUv = uv;
  vPage = int(aPage);
  vType = aType;
  vLocalPos = aLocalPos;
  vLocalAspect = aLocalAspect;
#ifdef USE_PICK_BUFFER
#ifdef USE_PICK_BUFFER_ATTRIBUTE
  vPickColor = aPickColor;
#endif
#ifdef USE_PICK_BUFFER_UNIFORM
  vPickColor = uPickColor;
#endif
#endif

  gl_Position = projectionMatrix * modelViewMatrix * localPosition;
}
