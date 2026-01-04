precision highp float;

uniform float uUseDash;        // 是否启用虚线
uniform float uDashArray[2];   // [dashLength, gapLength] （单位：像素）
uniform float uVisibility;     // 渲染顶点数, 常用于线条生长动画
uniform vec2 uResolution;      // 渲染素质(像素尺寸)

varying vec2 vUV;
varying vec4 vColor;
varying float vCounters;
varying float vLineDistance;

void main() {

  vec4 diffuseColor = vColor;

  // 虚线逻辑(Screen-space 稳定)
  if (uUseDash == 1.0) {

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