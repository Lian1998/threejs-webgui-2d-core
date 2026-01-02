attribute vec3 prev;            // 上一个顶点
attribute vec3 next;            // 下一个顶点
attribute float side;           // (点在CPU阶段两份存储, 当前这个)顶点是属于线条的哪一侧(+1, 顺着顺时针法线; -1, 逆着顺时针法线)
attribute float width;          // 当前顶点对应的线宽比例(宽度与线段进度函数计算)
attribute float counters;       // 当前顶点顶点在线段中的进度(线段进度)
attribute float lineDistance;   // 当前顶点在线段中的累计长度

uniform vec3 uColor;             // 线条颜色
uniform float uOpacity;          // 线条透明度(0 ~ 1)
uniform vec2 uResolution;        // 渲染素质(像素尺寸)
uniform float uSizeAttenuation;  // 线宽是否随缩放而缩放 (1: 随距离缩放而缩放(世界位置); 0: 不随距离缩放而缩放(固定像素宽);)
uniform float uLineWidth;        // 线宽
uniform float uPixelRatio;       // 当前浏览器指定的pixelRatio

varying vec2 vUV;                // u, 当前顶点顶点在线段中的进度(线段进度); v, (0, 顺着顺时针法线; 1, 逆着顺时针法线)
varying vec4 vColor;
varying float vCounters;
// varying float vScreenPosProj;    // 投影后的屏幕坐标(沿线方向)
varying float vLineDistance;

vec2 fixNDC(vec2 ndc, float aspect) {
  return vec2(ndc.x * aspect, ndc.y);
}

// 计算屏幕空间的方向向量
vec2 screenDir(vec4 prevClip, vec4 nextClip) {
  vec2 p0 = prevClip.xy / prevClip.w;
  vec2 p1 = nextClip.xy / nextClip.w;
  return normalize(p1 - p0);
}

void main() {

  vColor = vec4(uColor, uOpacity);
  vUV = uv;
  vCounters = counters;
  vLineDistance = lineDistance;

  vec4 currMV = modelViewMatrix * vec4(position, 1.0);
  vec4 prevMV = modelViewMatrix * vec4(prev, 1.0);
  vec4 nextMV = modelViewMatrix * vec4(next, 1.0);

  vec4 currClip = projectionMatrix * currMV;
  vec4 prevClip = projectionMatrix * prevMV;
  vec4 nextClip = projectionMatrix * nextMV;

  vec2 prevNDC = prevClip.xy / prevClip.w;
  vec2 currNDC = currClip.xy / currClip.w;
  vec2 nextNDC = nextClip.xy / nextClip.w;

  // 计算线段切线
  vec3 dir;
  if (length(nextMV.xyz - currMV.xyz) > 0.0001) {
    dir = normalize(nextMV.xyz - currMV.xyz);
  } else {
    dir = normalize(currMV.xyz - prevMV.xyz);
  }
  // 世界法线
  vec3 normalWorld = normalize(vec3(-dir.y, dir.x, 0.0));

  // 世界位置(线宽随着缩放而缩放)
  if (uSizeAttenuation == 1.) {
    float halfWidth = uLineWidth * width * 0.5;
    vec3 offset = normalWorld * side * halfWidth;
    currMV.xyz += offset;

    gl_Position = projectionMatrix * currMV;

    // 切线方向(算虚线)
    // vec2 scDir = screenDir(prevClip, nextClip);
    // vScreenPosProj = dot(currNDC, scDir);
  } 
  // 屏幕空间位置(线宽依据于像素固定值不会随着缩放而缩放)
  else {

    float aspect = uResolution.x / uResolution.y;

    // 在投影到NDC, 并且计算NDC法线时进行aspect修复
    vec2 prevA = vec2(prevNDC.x * aspect, prevNDC.y);
    vec2 currA = vec2(currNDC.x * aspect, currNDC.y);
    vec2 nextA = vec2(nextNDC.x * aspect, nextNDC.y);

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

    vec2 normalNDC = vec2(-dir.y, dir.x); // NDC法线

    float halfWidth = uLineWidth * width * 0.5;
    float halfWidthPx = halfWidth * uPixelRatio;
    vec2 pixelToNDC = vec2(2.0 / uResolution.x, 2.0 / uResolution.y);
    vec2 offsetNDC = normalNDC * side * halfWidthPx * miterScale * pixelToNDC;

    currClip.xy += offsetNDC * currClip.w;
    gl_Position = currClip;

    // 切线方向(算虚线)
    // vec2 scDir = screenDir(prevClip, nextClip);
    // vScreenPosProj = dot(currNDC, scDir);
  }
}