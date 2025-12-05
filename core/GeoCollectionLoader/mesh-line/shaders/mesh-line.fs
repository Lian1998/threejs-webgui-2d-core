#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

uniform sampler2D map;
uniform sampler2D alphaMap;
uniform float useGradient;
uniform float useMap;
uniform float useAlphaMap;
uniform float useDash;
uniform float dashArray[2];
uniform float visibility;
uniform float alphaTest;
uniform vec2 repeat;
uniform vec3 gradient[2];
uniform vec2 resolution;        // 屏幕分辨率(像素尺寸)

varying vec2 vUV;
varying vec4 vColor;
varying float vCounters; // 0 ~ 1
varying float vScreenPosProj;  // 投影后的屏幕坐标(沿线方向)

void main() {
  #include <logdepthbuf_fragment>

  vec4 diffuseColor = vColor;

  // 是否启用渐变线条效果
  if (useGradient == 1.) {
    diffuseColor = vec4(mix(gradient[0], gradient[1], vCounters), 1.0);
  }

  // 是否使用叠加颜色的贴图
  if (useMap == 1.) {
    diffuseColor *= texture2D(map, vUV * repeat);
  }

  // 是否使用透明度叠加贴图
  if (useAlphaMap == 1.) {
    diffuseColor.a *= texture2D(alphaMap, vUV * repeat).a;
  }

  if (diffuseColor.a < alphaTest) {
    discard;
  }

  // 是否使用虚线
  if (useDash == 1.) {

    float dashLen = dashArray[0];
    float gapLen = dashArray[1];
    float period = dashLen + gapLen;

    float pos = mod(vScreenPosProj * resolution.x * 0.5, period);

    if (pos > dashLen) {
      discard;   // 透明的虚线部分
    }
  }

  diffuseColor.a *= step(vCounters, visibility);

  #include <clipping_planes_fragment>

  gl_FragColor = diffuseColor;     

  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}