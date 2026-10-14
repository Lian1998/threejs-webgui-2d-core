precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uAtlas;
uniform vec3 uBlendColor;
uniform float uBlendMode;
uniform float uOpacity;
uniform float uVisible;

in vec2 vUv;
flat in int vPage;
#ifdef USE_MULTIPLY_COLOR
flat in vec3 vMultiplyColor;
#endif
#ifdef USE_BATCHING_COLOR
flat in vec3 vBatchingColor;
#endif
#if defined(USE_PICK_BUFFER_ATTRIBUTE) || defined(USE_PICK_BUFFER_UNIFORM)
flat in vec3 vPickColor;
#endif

out vec4 outColor;

vec4 sRGBTransferOETF(in vec4 value) {
  return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  vec3 low = 2.0 * base * blend;
  vec3 high = 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
  return mix(low, high, step(vec3(0.5), base));
}

vec3 blendHardLight(vec3 base, vec3 blend) {
  return blendOverlay(blend, base);
}

vec3 blendSpriteColor(vec3 base, vec3 blend, float mode) {
  if (mode < 0.5) return base * blend;
  if (mode < 1.5) return mix(base, blend, blend);
  if (mode < 2.5) return 1.0 - (1.0 - base) * (1.0 - blend);
  if (mode < 3.5) return min(base + blend, vec3(1.0));
  if (mode < 4.5) return blendOverlay(base, blend);
  return blendHardLight(base, blend);
}

void main() {
  if (uVisible < 0.5) {
    discard;
  }

  vec4 tColor = texture(uAtlas, vec3(vUv, float(vPage)));
  vec3 blendColor = uBlendColor;

#ifdef USE_MULTIPLY_COLOR
  blendColor *= vMultiplyColor;
#endif
#ifdef USE_BATCHING_COLOR
  blendColor *= vBatchingColor;
#endif

  tColor.rgb = blendSpriteColor(tColor.rgb, blendColor, uBlendMode);
  tColor.a *= uOpacity;

  outColor = vec4(sRGBTransferOETF(tColor).rgb, tColor.a);

  if (outColor.a <= 0.0) {
    discard;
  }

#ifdef USE_PICK_BUFFER
  outColor = vec4(vPickColor, 1.0);
#endif
}
