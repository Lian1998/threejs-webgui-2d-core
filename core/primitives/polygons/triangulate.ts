import earcut from "earcut";
import type { PolygonGeometry, Vec2 } from "../../contracts";

export interface Triangulation {
  vertices: Vec2[];
  indices: number[];
}
function cross(a: Vec2, b: Vec2, c: Vec2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function area(ring: readonly Vec2[]): number {
  return (
    ring.reduce((sum, p, i) => {
      const q = ring[(i + 1) % ring.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2
  );
}
function onSegment(a: Vec2, b: Vec2, p: Vec2): boolean {
  return Math.abs(cross(a, b, p)) < 1e-10 && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
}
function intersects(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  return (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}
function inside(point: Vec2, ring: readonly Vec2[]): boolean {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (a[1] > point[1] !== b[1] > point[1] && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function normalize(input: readonly Vec2[], ccw: boolean): Vec2[] {
  const ring: Vec2[] = [];
  for (const p of input) {
    if (p.length !== 2 || !p.every(Number.isFinite)) throw new Error("多边形包含非法坐标.");
    if (!ring.length || p[0] !== ring[ring.length - 1][0] || p[1] !== ring[ring.length - 1][1]) ring.push([p[0], p[1]]);
  }
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
  if (!ring.length) return ring;
  if (ring.length < 3 || Math.abs(area(ring)) < 1e-12) throw new Error("多边形环退化为线或点.");
  if (area(ring) > 0 !== ccw) ring.reverse();
  return ring;
}

/** 每个独立外环分别剖分, 后续外环不能误作为前一个区域的孔洞. */
export function triangulatePolygonGeometry(geometry: PolygonGeometry, robust = typeof __WEBGUI_DEBUG__ !== "undefined" && __WEBGUI_DEBUG__): Triangulation {
  const result: Triangulation = { vertices: [], indices: [] };
  const polygons = geometry.type === "Polygon" ? [geometry.polygon] : geometry.polygons;
  for (const polygon of polygons) {
    const outer = normalize(polygon.outer, true),
      holes = (polygon.holes ?? []).map((ring) => normalize(ring, false)).filter((ring) => ring.length);
    if (!outer.length) {
      if (holes.length) throw new Error("没有外环的孔洞无效.");
      continue;
    }
    if (robust) {
      const rings = [outer, ...holes];
      for (let ri = 0; ri < rings.length; ri++) {
        const ring = rings[ri];
        for (let i = 0; i < ring.length; i++)
          for (let j = i + 1; j < ring.length; j++) {
            if (j === i + 1 || (i === 0 && j === ring.length - 1)) continue;
            if (intersects(ring[i], ring[(i + 1) % ring.length], ring[j], ring[(j + 1) % ring.length])) throw new Error("多边形环存在自相交.");
          }
        if (ri && !inside(ring[0], outer)) throw new Error("孔洞必须位于外环内部.");
        for (let rj = 0; rj < ri; rj++) {
          const other = rings[rj];
          for (let i = 0; i < ring.length; i++) for (let j = 0; j < other.length; j++) if (intersects(ring[i], ring[(i + 1) % ring.length], other[j], other[(j + 1) % other.length])) throw new Error("多边形环之间存在相交.");
          if (rj && (inside(ring[0], other) || inside(other[0], ring))) throw new Error("孔洞不能嵌套或重叠.");
        }
      }
    }
    const vertices = [...outer, ...holes.flat()],
      starts: number[] = [];
    let offset = outer.length;
    for (const hole of holes) {
      starts.push(offset);
      offset += hole.length;
    }
    const indices = earcut(
        vertices.flatMap((p) => [p[0], p[1]]),
        starts,
        2,
      ),
      base = result.vertices.length;
    result.vertices.push(...vertices);
    result.indices.push(...indices.map((i) => i + base));
  }
  return result;
}
