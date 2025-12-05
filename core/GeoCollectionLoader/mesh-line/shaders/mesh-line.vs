#include <common>
#include <logdepthbuf_pars_vertex>
#include <fog_pars_vertex>
#include <clipping_planes_pars_vertex>

attribute vec3 prev;            // 上一个顶点
attribute vec3 next;            // 下一个顶点
attribute float side;           // (点在CPU阶段两份存储, 当前这个)顶点是属于线条的哪一侧(+1, 顺着顺时针法线; -1, 逆着顺时针法线)
attribute float width;          // 当前顶点对应的线宽比例(宽度与线段进度函数计算)
attribute float counters;       // 当前顶点顶点在线段中的进度(线段进度)

uniform vec2 resolution;        // 屏幕分辨率(像素尺寸)
uniform float lineWidth;        // 基础线宽
uniform vec3 color;             // 线条颜色
uniform float opacity;          // 不透明度
uniform float sizeAttenuation;  // 是否随距离缩放 (1, 随距离; 0, 固定像素宽)

varying vec2 vUV;               // u, 当前顶点顶点在线段中的进度(线段进度); v, (0, 顺着顺时针法线; 1, 逆着顺时针法线)
varying vec4 vColor;
varying float vCounters;
varying float vScreenPosProj;  // 投影后的屏幕坐标(沿线方向)

// 将 clip space 坐标转为 "修正后的NDC坐标"
vec2 fix(vec4 i, float aspect) {
  vec2 res = i.xy / i.w;   // 除以 w 得到 NDC 坐标 (-1 ~ 1)
  res.x *= aspect;         // 乘以宽高比以防止横向压缩
  return res;
}

void main() {

  vColor = vec4(color, opacity);
  vUV = uv;
  vCounters = counters;

  float aspect = resolution.x / resolution.y;
  mat4 mvp = projectionMatrix * modelViewMatrix;
  vec4 mvp_position = mvp * vec4(position, 1.0);
  vec4 mvp_prev = mvp * vec4(prev, 1.0);
  vec4 mvp_next = mvp * vec4(next, 1.0);
  vec2 aspect_position = fix(mvp_position, aspect);
  vec2 aspect_prev = fix(mvp_prev, aspect);
  vec2 aspect_next = fix(mvp_next, aspect);

  vec2 tangent = normalize(aspect_next - aspect_prev); // 线段的方向
  vScreenPosProj = dot(aspect_position, tangent); // 当前点在线段的投影

  vec4 f_position = mvp_position; // 点最终位置

  vec2 dir; // 当前点对应的线段的切线方向
  float wfactor = lineWidth * width;
  // 末尾段
  if (aspect_next == aspect_position) {
    dir = normalize(aspect_position - aspect_prev);
  } 
  // 起始段
  else if (aspect_prev == aspect_position) {
    dir = normalize(aspect_next - aspect_position);
  } 
  // 在中间段, 取两边方向平均(平滑拐角)
  else {
    vec2 dir1 = normalize(aspect_position - aspect_prev);
    vec2 dir2 = normalize(aspect_next - aspect_position);
    dir = normalize(dir1 + dir2);

    // (miter join) 平滑拐角
    vec2 perp = vec2(-dir1.y, dir1.x);
    vec2 miter = vec2(-dir.y, dir.x);
    wfactor = clamp(wfactor / dot(miter, perp), 0., 4. * wfactor);
  }

  // lineWidth为世界坐标
  if (sizeAttenuation == 1.) {
  } 
  // lineWidth为屏幕像素宽度
  else {
    vec4 normal = vec4(-dir.y, dir.x, 0., 1.); // 屏幕空间内顺时针法线
    vec2 sized_normal = vec2(normal.x, normal.y);
    vec2 pixelScale = vec2(2.0 / resolution.x, 2.0 / resolution.y);
    sized_normal *= wfactor;
    sized_normal *= pixelScale;
    sized_normal *= 0.5; // ndc
    sized_normal *= 0.5; // side
    f_position.xy += sized_normal * side; // 将偏移后的顶点位置应用到屏幕坐标
  }

  gl_Position = f_position;

  #include <logdepthbuf_vertex>
  #include <fog_vertex>

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #include <clipping_planes_vertex>
}