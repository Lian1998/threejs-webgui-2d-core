#include <common>
#include <logdepthbuf_pars_vertex>
#include <fog_pars_vertex>
#include <clipping_planes_pars_vertex>

attribute vec3 prev;        // 上一个顶点
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

// 将 clip space 坐标转为“修正后的 NDC 坐标”
vec2 fix(vec4 i, float aspect) {
  vec2 res = i.xy / i.w;   // 除以 w 得到 NDC 坐标 (-1 ~ 1)
  res.x *= aspect;         // 乘以宽高比以防止横向压缩
  return res;
}

void main() {

  vColor = vec4(color, opacity);
  vUV = uv;
  vCounters = counters;

  // 1. 投影到NDC(考虑宽高比)

  float aspect = resolution.x / resolution.y;
  mat4 mvp = projectionMatrix * modelViewMatrix;
  vec4 mvp_position = mvp * vec4(position, 1.0); // finalPosition
  vec4 mvp_prev = mvp * vec4(prev, 1.0); // prevPos
  vec4 mvp_next = mvp * vec4(next, 1.0); // nextPos
  vec2 aspect_position = fix(mvp_position, aspect); // currentP
  vec2 aspect_prev = fix(mvp_prev, aspect); // prevP
  vec2 aspect_next = fix(mvp_next, aspect); // nextP

  // 2. 计算线的方向与法线

  vec2 dir; // 当前点对应的线段的切线方向
  float w = lineWidth * width; // 从CPU计算阶段获取的attributes宽度(带变化) 和 MaterialAttribute 设置的宽度 计算出真正的宽度

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

    //  miter join 修正以防止拐角过于尖锐
    vec2 perp = vec2(-dir1.y, dir1.x);
    vec2 miter = vec2(-dir.y, dir.x);
    w = clamp(w / dot(miter, perp), 0., 4. * w);
  }

  // 3. 计算法线方向

  vec4 normal = vec4(-dir.y, dir.x, 0., 1.); // 屏幕空间内, 顺时针法线
  normal.xy *= w;

  // sizeAttenuation(default:1.0)
  // 线宽是否随着相机与当前中点的距离变化而变化(对应到屏幕空间就是法线的长度)
  if (sizeAttenuation == 0.) {
    normal.xy *= mvp_position.w; // 抵消透视缩放(乘上 w)
    normal.xy /= (vec4(resolution, 0., 1.) * projectionMatrix).xy * aspect; // 按屏幕分辨率缩放, 使得线宽在屏幕上保持恒定像素大小
  }

  // 4. 将偏移后的顶点位置应用到屏幕坐标
  mvp_position.xy += normal.xy * side;
  gl_Position = mvp_position;

  #include <logdepthbuf_vertex>
  #include <fog_vertex>

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #include <clipping_planes_vertex>
}