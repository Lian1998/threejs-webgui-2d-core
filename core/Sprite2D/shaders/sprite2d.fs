uniform sampler2D uTexture;

uniform bool uUseMultipleColor;
uniform vec3 uColor;

varying vec2 vUv;

// ./libs/three.js-r170/src/renderers/shaders/ShaderChunk/colorspace_pars_fragment.glsl.js

vec3 useMultipleColor(vec3 base, vec3 color) {
  return base * color;
}

void main() {
  vec4 tColor = texture2D(uTexture, vUv); // 贴图色

#ifdef USE_CUSTOM_MULTICOLOR 
  tColor.rgb = useMultipleColor(tColor.rgb, uColor); // 混色计算
#endif

  gl_FragColor = vec4(sRGBTransferOETF(tColor).rgb, tColor.a); // linear转srgb色彩空间

}