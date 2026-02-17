uniform sampler2D uTexture;

uniform bool uUseMultipleColor;
uniform vec3 uMultiplyColor;

varying vec2 vUv;

#ifdef USE_PICK_BUFFER
uniform vec3 uPickColor;
#endif

void main() {
  vec4 tColor = texture2D(uTexture, vUv); // 贴图色

#ifdef USE_MULTIPLYCOLOR 
  // 如果需要混色计算, 那么这里做普通的乘法混色处理
  tColor.rgb = tColor.rgb * uMultiplyColor;
#endif

  // ./libs/three.js-r170/src/renderers/shaders/ShaderChunk/colorspace_pars_fragment.glsl.js
  // 此文件中包含了 sRGBTransferOETF 函数 (linear转srgb), 保证正确渲染颜色
  // 此shader对应材质需要外部 Material 传入的材质指定为线性读取
  gl_FragColor = vec4(sRGBTransferOETF(tColor).rgb, tColor.a);

#ifdef USE_PICK_BUFFER
  // 在贴图计算的颜色中判断透明度, 如果片元是透明的, 那么直接舍弃片元
  if (gl_FragColor.a == 0.0) {
    discard;
  }

  // 将pickid对应的拾取颜色渲染到画布上
  gl_FragColor = vec4(uPickColor, 1.0);
#endif

}