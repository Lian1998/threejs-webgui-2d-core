attribute vec3 prev;            // 上一个顶点
attribute vec3 next;            // 下一个顶点
attribute float side;           // 当前顶点处于线条的哪一侧(+1: 顺着顺时针法线; -1: 逆着顺时针法线)
attribute float width;          // 当前顶点的线宽比例(通过cpu阶段定义的输入为线段进度的函数计算, 此函数返回值为 0 ~ 1)
attribute float counter;       // 当前顶点在线段中的线段进度
attribute float lineDistance;   // 当前顶点在线段中的累计长度
attribute float lineBreakpoint;   // 当前顶点在线段中的累计长度

uniform vec3 uColor;             // 线条颜色
uniform vec2 uResolution;        // 渲染素质(像素尺寸)
uniform float uSizeAttenuation;  // 线宽是否随缩放而缩放 (1: 随距离缩放而缩放(世界位置); 0: 不随距离缩放而缩放(固定像素宽);)
uniform float uLineWidth;        // 线宽
uniform float uPixelRatio;       // 当前浏览器的pixelRatio

varying vec2 vUV;                // u: 当前顶点顶点在线段中的进度(线段进度); v: (0: 顺着顺时针法线; 1: 逆着顺时针法线)
varying float vCounter;
varying float vLineDistance;
varying float vLineBreakPoint;

void main() {

  vUV = uv;
  vCounter = counter;
  vLineDistance = lineDistance;
  vLineBreakPoint = lineBreakpoint;

  // 世界坐标
  vec4 currMV = modelViewMatrix * vec4(position, 1.0);
  vec4 prevMV = modelViewMatrix * vec4(prev, 1.0);
  vec4 nextMV = modelViewMatrix * vec4(next, 1.0);

  // 视锥平截头体坐标
  vec4 currClip = projectionMatrix * currMV;
  vec4 prevClip = projectionMatrix * prevMV;
  vec4 nextClip = projectionMatrix * nextMV;

  // 世界位置(线宽随着缩放而缩放)
  if (uSizeAttenuation == 1.) {

    // 世界坐标切线
    vec3 dir;
    if (length(nextMV.xyz - currMV.xyz) > 1e-6) {
      dir = normalize(nextMV.xyz - currMV.xyz);
    } else {
      dir = normalize(currMV.xyz - prevMV.xyz);
    }

    // 世界坐标法线
    vec3 normalWorld = normalize(vec3(-dir.y, dir.x, 0.0));

    float halfWidth = uLineWidth * width * 0.5;
    vec3 offset = normalWorld * side * halfWidth;
    currMV.xyz += offset;

    gl_Position = projectionMatrix * currMV;
  } 

  // 屏幕空间位置(线宽依据于像素固定值不会随着缩放而缩放)
  else {

    // NDC坐标
    vec2 prevNDC = prevClip.xy / prevClip.w;
    vec2 currNDC = currClip.xy / currClip.w;
    vec2 nextNDC = nextClip.xy / nextClip.w;

    // aspect修复的NDC坐标, 否则y轴会被拉长
    float aspect = uResolution.x / uResolution.y;
    vec2 prevA = vec2(prevNDC.x * aspect, prevNDC.y);
    vec2 currA = vec2(currNDC.x * aspect, currNDC.y);
    vec2 nextA = vec2(nextNDC.x * aspect, nextNDC.y);

    // NDC坐标切线
    vec2 dir;

    // 对拐角进行处理(miter join)
    float miterScale = 1.0;
    if (distance(currA, prevA) < 1e-6) {
      dir = normalize(nextA - currA);
    } else if (distance(currA, nextA) < 1e-6) {
      dir = normalize(currA - prevA);
    } else {
      vec2 dir1 = normalize(currA - prevA);
      vec2 dir2 = normalize(nextA - currA);

      dir = normalize(dir1 + dir2);

      vec2 perp = vec2(-dir1.y, dir1.x);
      vec2 miter = vec2(-dir.y, dir.x);

      miterScale = 1.0 / max(dot(miter, perp), 0.2);
    }

    // NDC坐标法线
    vec2 normalNDC = vec2(-dir.y, dir.x);

    float halfWidth = uLineWidth * width * 0.5;
    float halfWidthPx = halfWidth * uPixelRatio;
    vec2 pixelToNDC = vec2(2.0 / uResolution.x, 2.0 / uResolution.y);
    float ratioFactor = 0.75;
    vec2 offsetNDC = normalNDC * side * halfWidthPx * miterScale * pixelToNDC * ratioFactor;

    currClip.xy += offsetNDC * currClip.w;
    gl_Position = currClip;
  }
}