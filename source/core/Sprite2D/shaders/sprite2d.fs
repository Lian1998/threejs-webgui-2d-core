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

  if (tColor.a == 0.0) {
    discard;
  }

#ifdef USE_CUSTOM_MULTICOLOR 
  gl_FragColor = vec4(useMultipleColor(tColor.rgb, uColor), tColor.a);
#endif

  gl_FragColor = sRGBTransferOETF(gl_FragColor); // 转化为SRGB

#ifdef USE_CUSTOM_DEPTH 
  gl_FragDepth = (uDepth - 100.0) / 100.0;
#endif
}