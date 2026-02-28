in vec3 position;
in vec2 uv;
in float aPage;
in float aType;
in vec2 aLocalPos;
in float aLocalAspect;
#ifdef USE_PICK_BUFFER
flat in vec3 aPickColor;
#endif

out vec2 vUv;
flat out int vPage;
flat out float vType;
out vec2 vLocalPos;
out float vLocalAspect;
#ifdef USE_PICK_BUFFER
flat out vec3 vPickColor;
#endif

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  vUv = uv;
  vPage = int(aPage);
  vType = aType;
  vLocalPos = aLocalPos;
  vLocalAspect = aLocalAspect;
#ifdef USE_PICK_BUFFER
  vPickColor = aPickColor;
#endif

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}