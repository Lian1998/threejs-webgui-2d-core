precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uAtlas;

in vec2 vUv;
flat in int vPage;
#ifdef USE_MULTIPLY_COLOR
flat in vec3 vMultiplyColor;
#endif
#if defined(USE_PICK_BUFFER_ATTRIBUTE) || defined(USE_PICK_BUFFER_UNIFORM)
flat in vec3 vPickColor;
#endif

out vec4 outColor;

vec4 sRGBTransferOETF(in vec4 value) {
  return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
}

void main() {
  vec4 tColor = texture(uAtlas, vec3(vUv, float(vPage))); // 贴图色

#ifdef USE_MULTIPLY_COLOR 
  // 如果需要混色计算, 那么这里做普通的乘法混色处理
  tColor.rgb = tColor.rgb * vMultiplyColor;
#endif

  // ./libs/three.js-r170/src/renderers/shaders/ShaderChunk/colorspace_pars_fragment.glsl.js
  // 此文件中包含了 sRGBTransferOETF 函数 (linear转srgb), 保证正确渲染颜色
  // 此shader对应材质需要外部 Material 传入的材质指定为线性读取
  outColor = vec4(sRGBTransferOETF(tColor).rgb, tColor.a);

#ifdef USE_PICK_BUFFER
  // 在贴图计算的颜色中判断透明度, 如果片元是透明的, 那么直接舍弃片元
  if (outColor.a == 0.0) {
    discard;
  }

  // 将pickid对应的拾取颜色渲染到画布上
  outColor = vec4(vPickColor, 1.0);
#endif

}
