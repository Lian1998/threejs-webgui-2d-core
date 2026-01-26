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

    // 直接使用世界空间距离vLineDistance来计算
    if (mod(vLineDistance + offset, period) > dashLength) {
      discard; // 丢弃片元 形成虚线效果
    }

  } 

  // 盒线模式
  else if (uUseBox == 1.0) {
    // 在使用盒渲染模式时会强制使用屏幕空间
    // diffuseColor = vec4(1., 1., 1., 1.); // debug
    float axisYFactor = abs(vUv.y - 0.5) * 2.0;
    // diffuseColor *= vec4(vec3(axisYFactor), 1.0); // debug1: 沿线法线的vUv.y从-1.0~1.0
    // 用vUv画线条
    float aspect = uResolution.x / uResolution.y;
    float lineLimit = uBoxArray[0] / uLineWidth + 0.075; // 加一个0.075的uv补偿值(经验值)
    float lineLimitX = lineLimit * aspect; // 同样的单位下, x轴的像素更多, y轴高度需要补偿
    float connectorLength = uBoxArray[1] / 3. * 4.; // 恒定四个单位的连接符 三个单位的盒
    float boxStepLength = uBoxArray[1];
    float period = connectorLength + boxStepLength;
    float stripeXFactor = mod(vLineDistance, period); // 当前x坐标在段落中的位置
    float boxMask = step(connectorLength, stripeXFactor); // 当前是否处于盒部分
    // diffuseColor *= vec4(vec3(boxMask), 1.0); // debug2: 白色部分是box位置
    float discardMask = 0.0; // 标记当前片元是否被舍弃
    // 连接部分
    if (boxMask < 0.5) {
      if (axisYFactor > lineLimitX / 2.0) {
        discardMask = 1.0;
      }
    }
    // 小盒部分
    else {
      if (
      // 上下边线框
      axisYFactor > (-1.0 + lineLimitX) && axisYFactor < (1.0 - lineLimitX)
      // 左右边线框
      && stripeXFactor > connectorLength + lineLimit && stripeXFactor < period - lineLimit) {
        discardMask = 1.0;
      }
    }

    if (discardMask == 1.0) {
      discard;
    }
  }

  // 测试: cpu阶段合并几何并用冗余线头线尾顶点来表示断点
  // diffuseColor = vec4(vec3(vLineBreakPoint), 1.0);

  gl_FragColor = diffuseColor;
}