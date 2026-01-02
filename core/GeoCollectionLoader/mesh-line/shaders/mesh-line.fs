precision highp float;

uniform float uUseDash;
uniform float uDashArray[2];   // [dashLength, gapLength] （单位：像素）
uniform float uVisibility;     // 0 ~ 1
uniform float uAlphaTest;
uniform vec2 uResolution;

varying vec2 vUV;
varying vec4 vColor;
varying float vCounters;       // 0 ~ 1
// varying float vScreenPosProj;  // NDC 中沿线方向坐标
varying float vLineDistance;

void main() {

  vec4 diffuseColor = vColor;

  if (diffuseColor.a < uAlphaTest) {
    discard;
  }

  // 虚线逻辑(Screen-space 稳定)
  if (uUseDash == 1.0) {

    // float dashLen = uDashArray[0];
    // float gapLen = uDashArray[1];
    // float period = dashLen + gapLen;

    // 虚线计算方法一: 屏幕空间内线段方向投影, 可以减少初始化时在cpu端计算的损耗但是效果
    // float screenPos = (vScreenPosProj * 0.5 + 0.5) * uResolution.x;
    // float dashPos = mod(screenPos, period);
    // if (dashPos > dashLen) {
    //   discard;
    // }

    // 虚线计算方法二: 直接在cpu读取顶点阶段计算出当前顶点在线段中的累计长度(开始位置), 在片元着色器中计算虚线
    float worldPerPixel = fwidth(vLineDistance);
    float dashLenWorld = uDashArray[0] * worldPerPixel;
    float gapLenWorld = uDashArray[1] * worldPerPixel;
    float period = dashLenWorld + gapLenWorld;
    if (mod(vLineDistance, period) > dashLenWorld) {
      discard;
    }
  }

  // 可见度裁剪(根据线段进度)
  diffuseColor.a *= step(vCounters, uVisibility);

  gl_FragColor = diffuseColor;
}