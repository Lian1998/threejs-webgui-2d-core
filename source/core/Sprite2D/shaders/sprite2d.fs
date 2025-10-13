uniform sampler2D uTexture;

uniform bool uUseMultipleColor;
uniform vec3 uColor;

uniform float uDepth;

varying vec2 vUv;

// ./libs/three.js-r170/src/renderers/shaders/ShaderChunk/colorspace_pars_fragment.glsl.js

vec3 useMultipleColor(vec3 base, vec3 color) {
  return base * color;
}

void main() {
  vec4 tColor = texture2D(uTexture, vUv); // 从贴图中拿到贴图色

#ifdef USE_CUSTOM_MULTICOLOR 
  tColor.rgb = useMultipleColor(tColor.rgb, uColor);
#endif

  if (tColor.a == 0.0) {
    discard;
  }

  gl_FragColor = vec4(sRGBTransferOETF(tColor).rgb, tColor.a);

#ifdef USE_CUSTOM_DEPTH 
  gl_FragDepth = (9999.0 - uDepth) / 10000.0;
#endif
}