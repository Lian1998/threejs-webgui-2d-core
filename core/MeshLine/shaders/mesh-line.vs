attribute vec3 prev;              // 上一个顶点
attribute vec3 next;              // 下一个顶点
attribute float side;             // 当前顶点处于线条的哪一侧: +1: 顺着顺时针法线; -1 逆着顺时针法线
attribute float width;            // 当前顶点的线宽比例: 通过cpu阶段定义的函数(输入为线条进度)计算, 此函数返回值为 0 ~ 1
attribute float counter;          // 当前顶点在线条中的进度
attribute float lineDistance;     // 当前顶点在线条中的累计长度
attribute float lineBreakpoint;   // 当前顶点在线条中的累计长度

uniform vec2 uResolution;        // 渲染素质(像素尺寸)
uniform float uSizeAttenuation;  // 线宽是否随距离衰减(默认值0): 1 随与相机距离变化(世界空间); 0 不随距离变化(屏幕空间)
uniform float uLineWidth;        // 线宽
uniform float uPixelRatio;       // 当前浏览器的pixelRatio

varying vec2 vUv;                // u 当前顶点在线条中的进度; v 当前顶点在线段宽度方向上是顺法线还是逆法线
varying float vCounter;
varying float vLineDistance;
varying float vLineBreakPoint;

void main() {

  vUv = uv;
  vCounter = counter;
  vLineDistance = lineDistance;
  vLineBreakPoint = lineBreakpoint;

  // 世界空间
  if (uSizeAttenuation == 1.) {

    // 世界坐标切线
    vec3 dir;
    if (length(next.xyz - position.xyz) > 1e-6) {
      dir = normalize(next.xyz - position.xyz);
    } else {
      dir = normalize(position.xyz - prev.xyz);
    }

    // 世界坐标法线, 假设线条只会存在在xz平面上
    vec3 upWorld = vec3(0., -1., 0.);
    vec3 normalWorld = normalize(cross(dir, upWorld));

    float halfWidth = uLineWidth * width * 0.5;
    vec3 offset = normalWorld * side * halfWidth;
    vec3 _position = position;
    _position.xyz += offset;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(_position, 1.0);
  } 

  // 屏幕空间
  else {

    // 世界坐标
    vec4 currMV = modelViewMatrix * vec4(position, 1.0);
    vec4 prevMV = modelViewMatrix * vec4(prev, 1.0);
    vec4 nextMV = modelViewMatrix * vec4(next, 1.0);

    // 视锥平截头体坐标
    vec4 currClip = projectionMatrix * currMV;
    vec4 prevClip = projectionMatrix * prevMV;
    vec4 nextClip = projectionMatrix * nextMV;

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