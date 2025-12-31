#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

uniform float uUseDash;
uniform float uDashArray[2];
uniform float uVisibility;
uniform float uAlphaTest;
uniform vec2 uResolution;        // 屏幕分辨率(像素尺寸)

varying vec2 vUV;
varying vec4 vColor;
varying float vCounters; // 0 ~ 1
varying float vScreenPosProj;  // 投影后的屏幕坐标(沿线方向)

void main() {
  #include <logdepthbuf_fragment>

  vec4 diffuseColor = vColor;

  if (diffuseColor.a < uAlphaTest) {
    discard;
  }

  // 是否使用虚线
  if (uUseDash == 1.) {

    float dashLen = uDashArray[0];
    float gapLen = uDashArray[1];
    float period = dashLen + gapLen;

    float pos = mod(vScreenPosProj * uResolution.x * 0.5, period);

    if (pos > dashLen) {
      discard;   // 透明的虚线部分
    }
  }

  diffuseColor.a *= step(vCounters, uVisibility);

  #include <clipping_planes_fragment>

  gl_FragColor = diffuseColor;     

  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}