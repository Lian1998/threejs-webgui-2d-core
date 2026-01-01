attribute vec3 prev;            // 上一个顶点
attribute vec3 next;            // 下一个顶点
attribute float side;           // (点在CPU阶段两份存储, 当前这个)顶点是属于线条的哪一侧(+1, 顺着顺时针法线; -1, 逆着顺时针法线)
attribute float width;          // 当前顶点对应的线宽比例(宽度与线段进度函数计算)
attribute float counters;       // 当前顶点顶点在线段中的进度(线段进度)

uniform vec3 uColor;             // 线条颜色
uniform float uOpacity;          // 线条透明度(0 ~ 1)
uniform vec2 uResolution;        // 渲染素质(像素尺寸)
uniform float uSizeAttenuation;  // 线宽是否随缩放而缩放 (1: 随距离缩放而缩放(世界位置); 0: 不随距离缩放而缩放(固定像素宽);)
uniform float uLineWidth;        // 线宽
uniform float uPixelRatio;       // 当前浏览器指定的pixelRatio

varying vec2 vUV;                // u, 当前顶点顶点在线段中的进度(线段进度); v, (0, 顺着顺时针法线; 1, 逆着顺时针法线)
varying vec4 vColor;
varying float vCounters;
varying float vScreenPosProj;    // 投影后的屏幕坐标(沿线方向)

vec2 getScreenDirection(vec4 prevClip, vec4 nextClip) {
  vec2 prevNDC = prevClip.xy / prevClip.w;
  vec2 nextNDC = nextClip.xy / nextClip.w;
  vec2 dir = normalize(nextNDC - prevNDC);
  return vec2(-dir.y, dir.x); // 垂直方向
}

void main() {

  vColor = vec4(uColor, uOpacity);
  vUV = uv;
  vCounters = counters;

  vec4 currentMV = modelViewMatrix * vec4(position, 1.0);
  vec4 prevMV = modelViewMatrix * vec4(prev, 1.0);
  vec4 nextMV = modelViewMatrix * vec4(next, 1.0);

  // 计算线段切线
  vec3 dir;
  if (length(nextMV.xyz - currentMV.xyz) > 0.0001) {
    dir = normalize(nextMV.xyz - currentMV.xyz);
  } else {
    dir = normalize(currentMV.xyz - prevMV.xyz);
  }
  // 世界法线
  vec3 normalWorld = normalize(vec3(-dir.y, dir.x, 0.0));
  vec4 finalPos = currentMV;

  // 世界位置(线宽随着缩放而缩放)
  if (uSizeAttenuation == 1.) {
    float halfWidth = uLineWidth * width * 0.5;
    vec3 offset = normalWorld * side * halfWidth;
    finalPos.xyz += offset;
  } 
  // 屏幕空间位置(线宽依据于像素固定值不会随着缩放而缩放)
  else {
    vec4 currClip = projectionMatrix * currentMV;
    vec4 prevClip = projectionMatrix * prevMV;
    vec4 nextClip = projectionMatrix * nextMV;

    // NDC法线
    vec2 normalNDC = getScreenDirection(prevClip, nextClip);
    float pixelWidth = uLineWidth * width * 0.5 * uPixelRatio; // 设置线宽 与 浏览器的逻辑/实际像素比
    vec2 pixelToNDC = vec2(2.0 / uResolution.x, 2.0 / uResolution.y); // 视口NDC是一个 -1 ~ 1 的矩形
    vec2 offsetNDC = normalNDC * side * pixelWidth * pixelToNDC;

    currClip.xy += offsetNDC * currClip.w;
    gl_Position = currClip;
    return;
  }

  gl_Position = projectionMatrix * finalPos;
}