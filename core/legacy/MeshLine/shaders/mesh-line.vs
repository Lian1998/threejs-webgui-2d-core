uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uResolution;
uniform float uSizeAttenuation;
uniform float uLineWidth;
uniform float uPixelRatio;
#include <batching_pars_vertex>

#ifdef USE_PICK_BUFFER_UNIFORM
uniform vec3 uPickColor;
#endif

in vec3 position;
in vec2 uv;
in vec3 prev;
in vec3 next;
in float side;
in float counter;
in float lineDistance;
in float lineBreakpoint;
#ifdef USE_PICK_BUFFER_ATTRIBUTE
in vec3 aPickColor;
#endif

out vec2 vUv;
out float vCounter;
out float vLineDistance;
out float vLineBreakPoint;
#if defined(USE_PICK_BUFFER_ATTRIBUTE) || defined(USE_PICK_BUFFER_UNIFORM)
flat out vec3 vPickColor;
#endif

void main() {
#ifdef USE_BATCHING
  mat4 batchingMatrix = getBatchingMatrix(getIndirectIndex(gl_DrawID));
  vec4 localPosition = batchingMatrix * vec4(position, 1.0);
  vec4 localPrev = batchingMatrix * vec4(prev, 1.0);
  vec4 localNext = batchingMatrix * vec4(next, 1.0);
#else
  vec4 localPosition = vec4(position, 1.0);
  vec4 localPrev = vec4(prev, 1.0);
  vec4 localNext = vec4(next, 1.0);
#endif

  vUv = uv;
  vCounter = counter;
  vLineDistance = lineDistance;
  vLineBreakPoint = lineBreakpoint;
#ifdef USE_PICK_BUFFER_ATTRIBUTE
  vPickColor = aPickColor;
#endif
#ifdef USE_PICK_BUFFER_UNIFORM
  vPickColor = uPickColor;
#endif

  vec4 currMV = modelViewMatrix * localPosition;
  vec4 prevMV = modelViewMatrix * localPrev;
  vec4 nextMV = modelViewMatrix * localNext;

  vec4 currClip = projectionMatrix * currMV;
  vec4 prevClip = projectionMatrix * prevMV;
  vec4 nextClip = projectionMatrix * nextMV;

  vec2 currNDC = currClip.xy / currClip.w;
  vec2 prevNDC = prevClip.xy / prevClip.w;
  vec2 nextNDC = nextClip.xy / nextClip.w;

  if (uSizeAttenuation == 1.0) {
    vec3 dir;
    if (length(localNext.xyz - localPosition.xyz) > 1e-6) {
      dir = normalize(localNext.xyz - localPosition.xyz);
    } else {
      dir = normalize(localPosition.xyz - localPrev.xyz);
    }

    vec3 upWorld = vec3(0.0, -1.0, 0.0);
    vec3 normalWorld = normalize(cross(dir, upWorld));
    vec3 offset = normalWorld * side * uLineWidth * 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(localPosition.xyz + offset, 1.0);
  } else {
    vec2 dir;
    float miterScale = 1.0;

    if (distance(currNDC, prevNDC) < 1e-6) {
      dir = normalize(nextNDC - currNDC);
    } else if (distance(currNDC, nextNDC) < 1e-6) {
      dir = normalize(currNDC - prevNDC);
    } else {
      vec2 dir1 = normalize(currNDC - prevNDC);
      vec2 dir2 = normalize(nextNDC - currNDC);
      dir = normalize(dir1 + dir2);

      vec2 perp = vec2(-dir1.y, dir1.x);
      vec2 miter = vec2(-dir.y, dir.x);
      miterScale = 1.0 / max(dot(miter, perp), 0.2);
    }

    vec2 normalNDC = vec2(-dir.y, dir.x);
    float halfWidthPx = uLineWidth * 0.5 * uPixelRatio;
    vec2 pixelToNDC = vec2(2.0 / uResolution.x, 2.0 / uResolution.y);
    vec2 offsetNDC = normalNDC * side * halfWidthPx * miterScale * pixelToNDC;

    currClip.xy += offsetNDC * currClip.w;
    gl_Position = currClip;
  }
}
