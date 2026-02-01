precision highp float;

// /docs/index.html?q=WebGLPro#api/en/renderers/webgl/WebGLProgram
// uniform vec3 cameraPosition;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uResolution;

uniform float uUseDash;         // 是否启用虚线
uniform float uDashArray[2];

uniform float uUseBox;          // 是否启用小方格线
uniform float uBoxArray[2];
uniform float uLineWidth;       // 线宽

varying vec2 vUv;
varying float vCounter;
varying float vLineDistance;
varying float vLineBreakPoint;

void main() {

  vec4 diffuseColor = vec4(uColor, uOpacity);

  // 断点(合并drawcall渲染多线段)
  if (vLineBreakPoint > 1e-6) {
    discard;
  }

  // 虚线模式
  if (uUseDash == 1.0) {
    float offset = dot(cameraPosition, vec3(1.0, 0.0, 1.0)) * 0.05; // 希望视角移动的时候重绘虚线

    // 计算每段虚线的实际长度, 直接基于世界空间
    float dashLength = uDashArray[0];
    float gapLength = uDashArray[1];
    float period = dashLength + gapLength;
    float phase = fract(vLineDistance / period) * period;

    // 直接使用世界空间距离vLineDistance来计算
    if (phase > dashLength) {
      discard; // 丢弃片元 形成虚线效果
    }
  } 

  // 盒线模式
  else if (uUseBox == 1.0) {
    // 在使用盒渲染模式时会强制使用屏幕空间
    // diffuseColor = vec4(1., 1., 1., 1.); // debug
    float axisYFactor = abs(vUv.y - 0.5) * 2.0; // 1.0 ~ 0.0 ~ 1.0
    // diffuseColor *= vec4(vec3(axisYFactor), 1.0); // debug1: 沿线法线的vUv.y从-1.0~1.0
    // 用vUv画线条
    float aspect = uResolution.x / uResolution.y;
    float boxLineWidth = uBoxArray[0];
    float lineLimit = boxLineWidth / uLineWidth; // 线条粗细在uv中的比例
    float connectorLength = uBoxArray[1] / 3. * 4.; // 恒定四个单位的连接符 三个单位的盒
    float boxStepLength = uBoxArray[1];
    float period = connectorLength + boxStepLength;
    float stripeXFactor = fract(vLineDistance / period) * period; // 当前x坐标在段落中的位置
    float boxMask = step(connectorLength, stripeXFactor); // 当前是否处于盒部分
    // diffuseColor *= vec4(vec3(boxMask), 1.0); // debug2: 白色部分是box位置

    // 连接部分
    if (boxMask < 1e-6) {
      float edge1 = lineLimit / 2.0;
      float mask1 = 1.0 - smoothstep(edge1 - axisYFactor, edge1 + axisYFactor, axisYFactor);
      diffuseColor.a *= mask1;
    }
    // 小盒部分
    else {

      // Y 方向(上下边框内侧挖空)
      float edge1 = 1.0 - (lineLimit / 2.0);
      float mask1 = 1.0 - smoothstep(edge1 - axisYFactor, edge1 + axisYFactor, axisYFactor); // 让命中的部分为0

      // X 方向(左右边框内侧挖空)
      float edge2 = lineLimit;
      float mask2 = smoothstep(period, period - edge2, stripeXFactor); // 让命中的部分为0
      float mask3 = 1.0 - smoothstep(connectorLength + edge2, connectorLength, stripeXFactor); // 让命中的部分为0

      float mask4 = mask1 * mask2 * mask3;
      diffuseColor.a *= 1.0 - mask4; // Mask;
    }
  }

  // 测试: cpu阶段合并几何并用冗余线头线尾顶点来表示断点
  // diffuseColor = vec4(vec3(vLineBreakPoint), 1.0);

  gl_FragColor = diffuseColor;
}