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
  gl_FragColor = texture2D(uTexture, vUv); // 从贴图中拿到贴图色

#ifdef USE_CUSTOM_MULTICOLOR 
  gl_FragColor = vec4(useMultipleColor(gl_FragColor.rgb, uColor), gl_FragColor.a);
#endif

  gl_FragColor = vec4(sRGBTransferOETF(gl_FragColor)); // 转化为SRGB

#ifdef USE_CUSTOM_DEPTH 
  gl_FragDepth = (uDepth - 100.0) / 100.0;
#endif
}