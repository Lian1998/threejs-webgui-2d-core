precision highp float;

// /docs/index.html?q=WebGLPro#api/en/renderers/webgl/WebGLProgram
// uniform vec3 cameraPosition;
uniform float uUseDash;        // 是否启用虚线
uniform float uDashArray[2];   // [dashLength, gapLength] （单位：像素）
uniform float uVisibility;     // 渲染顶点数, 常用于线条生长动画
uniform vec2 uResolution;      // 渲染素质(像素尺寸)

varying vec2 vUV;
varying vec4 vColor;
varying float vCounter;
varying float vLineDistance;
varying float vLineBreakPoint;

void main() {

  vec4 diffuseColor = vColor;

  // 断点
  if (vLineBreakPoint > 1e-6) {
    discard;
  }

  if (uUseDash == 1.0) {
    float offset = dot(cameraPosition, vec3(1.0, 0.0, 1.0)) * 0.25;

    // 计算每段虚线的实际长度, 直接基于世界空间
    float dashLenWorld = uDashArray[0];
    float gapLenWorld = uDashArray[1];
    float period = dashLenWorld + gapLenWorld;

    // 直接使用世界空间距离vLineDistance来计算
    if (mod(vLineDistance + offset, period) > dashLenWorld) {
      discard; // 丢弃片元 形成虚线效果
    }
  }

  // 测试: cpu阶段合并几何, 冗余线头线尾顶点来表示断点
  // diffuseColor = vec4(vec3(vLineBreakPoint), 1.0);

  // 可见度裁剪(根据线段进度)
  diffuseColor.a *= step(vCounter, uVisibility);

  gl_FragColor = diffuseColor;
}