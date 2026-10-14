precision highp float;

uniform float uUseShadow;
uniform vec2 uShadowArray;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uResolution;

#if defined(USE_PICK_BUFFER_ATTRIBUTE) || defined(USE_PICK_BUFFER_UNIFORM)
flat in vec3 vPickColor;
#endif

out vec4 outColor;

void main() {
#ifdef USE_PICK_BUFFER
  outColor = vec4(vPickColor, 1.0);
  return;
#endif

  vec4 diffuseColor = vec4(uColor, uOpacity);

  if (uUseShadow == 1.0) {
    vec2 fragPos = gl_FragCoord.xy - vec2(0.5);
    float shadowLength = max(uShadowArray.x, 0.0);
    float gapLength = max(uShadowArray.y, 0.0);
    float period = max(shadowLength + gapLength, 1e-6);
    float proj = (fragPos.x + uResolution.y + 1.0) - fragPos.y;
    float phase = fract(proj / period) * period;

    if (phase > shadowLength) {
      diffuseColor.a = 0.0;
    }
  }

  if (diffuseColor.a <= 0.0) {
    discard;
  }

  outColor = diffuseColor;
}
