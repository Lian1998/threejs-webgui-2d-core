import { Vector3 } from "three";
import type { DeepReadonly, LineOptions, RenderFeature, Vec2 } from "../../contracts";
import { MergedBatchBackend, type VertexData } from "../shared/MergedBatchBackend";
import { colorComponents, fragmentPass, pickComponents, vertexPass } from "../shared/material";

const vertex = /* glsl */ `precision highp float;
uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
in vec3 position; in vec2 aOffset; in vec4 aColor; in vec3 aPickColor; in vec2 aHit;
in vec2 aWidth; in float aDistance; in vec4 aDash; in float aAcross;
out vec4 vColor; out float vDistance; out float vAcross; flat out vec4 vDash;
flat out vec3 vPickColor; flat out vec2 vHit;
${vertexPass}
void main(){
  float width = aWidth.x / (aWidth.y > 0.5 ? uScale : 1.0);
  vec3 p = position + vec3(aOffset.x,0.0,-aOffset.y)*width*0.5;
  vColor=aColor; vDistance=aDistance; vAcross=aAcross; vDash=aDash; vPickColor=aPickColor; vHit=aHit;
  gl_Position=cropClip(projectionMatrix*modelViewMatrix*vec4(p,1.0));
}`;
const fragment = /* glsl */ `${fragmentPass}
uniform float uScale;
in vec4 vColor; in float vDistance; in float vAcross; flat in vec4 vDash;
void main(){
  float alpha=1.0-smoothstep(1.0-max(fwidth(vAcross),0.0001),1.0,abs(vAcross));
  if(vDash.x>=0.0 && vDash.y>0.0){
    if(vDash.x==0.0) discard;
    float d=vDistance*(vDash.w>0.5?uScale:1.0)+vDash.z;
    float phase=mod(mod(d,vDash.x+vDash.y)+vDash.x+vDash.y,vDash.x+vDash.y);
    if(phase>vDash.x) discard;
  }
  writeColor(vec4(vColor.rgb,vColor.a*alpha));
}`;
interface LineVertex {
  center: Vector3;
  offset: Vec2;
  distance: number;
  across: number;
}
function clean(points: readonly Vec2[], closed: boolean): Vec2[] {
  const result = points.filter((p, i) => !i || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
  if (closed && result.length > 1 && result[0][0] === result[result.length - 1][0] && result[0][1] === result[result.length - 1][1]) result.pop();
  return result;
}
/** 把路径扩展成三角形条带并编码转角, 端点, 宽度和沿线距离.
 * 使用 Mesh 绘制粗线, shader 根据 scale 处理屏幕线宽, 根据距离裁掉虚线间隙. */
export class LineBatchBackend extends MergedBatchBackend {
  readonly kind = "line" as const;
  constructor() {
    super({ position: 3, aOffset: 2, aColor: 4, aPickColor: 3, aHit: 2, aWidth: 2, aDistance: 1, aDash: 4, aAcross: 1 }, vertex, fragment);
  }
  encode(feature: RenderFeature): VertexData {
    const o = feature.options as DeepReadonly<LineOptions>;
    const data: VertexData = {
      position: [],
      aOffset: [],
      aColor: [],
      aPickColor: [],
      aHit: [],
      aWidth: [],
      aDistance: [],
      aDash: [],
      aAcross: [],
    };
    const points = clean(o.points, o.closed ?? false).map((p) => new Vector3(p[0], 0, -p[1]).applyMatrix4(feature.matrix));
    if (points.length < 2 || !o.width) return data;
    const closed = o.closed ?? false,
      count = closed ? points.length : points.length - 1;
    const distances = [0],
      normals: Vec2[] = [],
      directions: Vec2[] = [];
    for (let i = 0; i < count; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        dx = b.x - a.x,
        dy = a.z - b.z,
        length = Math.hypot(dx, dy);
      if (length < 1e-12) {
        normals.push([0, 0]);
        directions.push([0, 0]);
        distances.push(distances[i]);
      } else {
        directions.push([dx / length, dy / length]);
        normals.push([-dy / length, dx / length]);
        distances.push(distances[i] + length);
      }
    }
    const color = colorComponents(o.color),
      pick = pickComponents(feature.pickId);
    const add = (v: LineVertex) => {
      data.position.push(v.center.x, v.center.y, v.center.z);
      data.aOffset.push(...v.offset);
      data.aColor.push(...color, feature.opacity);
      data.aPickColor.push(...pick);
      data.aHit.push(feature.hit.alphaThreshold, feature.hit.tolerancePx);
      data.aWidth.push(o.width, (o.widthMode ?? "screen") === "screen" ? 1 : 0);
      data.aDistance.push(v.distance);
      data.aAcross.push(v.across);
      data.aDash.push(o.dash?.length ?? -1, o.dash?.gap ?? 0, o.dash?.offset ?? 0, (o.dash?.sizeMode ?? "screen") === "screen" ? 1 : 0);
    };
    const tri = (a: LineVertex, b: LineVertex, c: LineVertex) => {
      add(a);
      add(b);
      add(c);
    };
    const vertexAt = (index: number, offset: Vec2, across = 0, distance = distances[index]) => ({
      center: points[index % points.length],
      offset,
      across,
      distance,
    });
    const starts = normals.map((n) => ({ left: n, right: [-n[0], -n[1]] as Vec2 }));
    const ends = normals.map((n) => ({ left: n, right: [-n[0], -n[1]] as Vec2 }));
    const bevels: LineVertex[][] = [];
    // 相邻段共享内外端点, 避免折角内部两次混合使半透明路径局部变深.
    for (let i = closed ? 0 : 1; i < (closed ? points.length : points.length - 1); i++) {
      const prev = (i - 1 + count) % count,
        next = i % count,
        a = normals[prev],
        b = normals[next];
      const turn = directions[prev][0] * directions[next][1] - directions[prev][1] * directions[next][0];
      if (Math.abs(turn) < 1e-8) continue;
      const mx = a[0] + b[0],
        my = a[1] + b[1],
        length = Math.hypot(mx, my);
      if (length < 1e-8) continue;
      const nx = mx / length,
        ny = my / length,
        dot = nx * b[0] + ny * b[1];
      if (Math.abs(dot) < 1e-8) continue;
      const ratio = 1 / dot,
        limit = o.miterLimit ?? 4;
      const miter: Vec2 = [nx * ratio, ny * ratio];
      if ((o.join ?? "miter") === "miter" && Math.abs(ratio) <= limit) {
        starts[next].left = ends[prev].left = miter;
        starts[next].right = ends[prev].right = [-miter[0], -miter[1]];
      } else {
        const clamped = Math.min(Math.abs(ratio), limit),
          inner: Vec2 = [nx * clamped, ny * clamped];
        if (turn > 0) {
          starts[next].left = ends[prev].left = inner;
          bevels.push([vertexAt(i, ends[prev].right, -1), vertexAt(i, starts[next].right, -1), vertexAt(i, inner, 1)]);
        } else {
          const negative: Vec2 = [-inner[0], -inner[1]];
          starts[next].right = ends[prev].right = negative;
          bevels.push([vertexAt(i, ends[prev].left, 1), vertexAt(i, negative, -1), vertexAt(i, starts[next].left, 1)]);
        }
      }
    }
    for (let i = 0; i < count; i++) {
      if (!directions[i][0] && !directions[i][1]) continue;
      const a = vertexAt(i, starts[i].left, 1),
        b = vertexAt(i, starts[i].right, -1),
        c = vertexAt(i + 1, ends[i].left, 1),
        d = vertexAt(i + 1, ends[i].right, -1);
      tri(a, b, c);
      tri(b, d, c);
    }
    bevels.forEach((vertices) => tri(vertices[0], vertices[1], vertices[2]));
    if (!closed && o.cap === "round") {
      for (const end of [0, points.length - 1]) {
        const dir = directions[end ? count - 1 : 0],
          base = Math.atan2(dir[1], dir[0]) + (end ? 0 : Math.PI),
          distance = end ? distances[count] : 0;
        for (let i = 0; i < 12; i++) {
          const a = base - Math.PI / 2 + (i * Math.PI) / 12,
            b = a + Math.PI / 12;
          tri(vertexAt(end, [0, 0], 0, distance), vertexAt(end, [Math.cos(a), Math.sin(a)], 1, distance), vertexAt(end, [Math.cos(b), Math.sin(b)], 1, distance));
        }
      }
    }
    return data;
  }
}
