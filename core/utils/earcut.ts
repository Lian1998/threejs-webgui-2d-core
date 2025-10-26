import earcut from "earcut";

type Vec2 = { x: number; y: number };

const vec2 = (x: number, y: number): Vec2 => ({ x, y });
const toVec2 = ([x, y]: [number, number]): Vec2 => ({ x, y });
const add = (a: Vec2, b: Vec2) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec2, k: number) => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const length = (a: Vec2) => Math.hypot(a.x, a.y);
const normalize = (a: Vec2) => {
  const len = length(a);
  return len ? { x: a.x / len, y: a.y / len } : { x: 0, y: 0 };
};
const normalLeft = (a: Vec2) => ({ x: -a.y, y: a.x });
const normalRight = (a: Vec2) => ({ x: a.y, y: -a.x });
const verticesTo3D = (flat2d: [number, number]) => {
  const r = [];
  for (let i = 0; i < flat2d.length; i += 2) r.push(flat2d[i], flat2d[i + 1], 0);
  return r;
};

export const polygon = (polygonCoords: number[][][]) => {
  const vertices = [];
  const holes = [];
  let holeIndex = 0;

  polygonCoords.forEach((ring, i) => {
    if (i > 0) holes.push(holeIndex);
    ring.forEach(([x, y]) => {
      vertices.push(x, y); // 2D
      holeIndex++;
    });
  });

  const indices = earcut(vertices, holes);

  return indices;
};

export const line = (lineCoords: [number, number][]) => {
  const positions = [];
  const indices = [];

  let idx = 0;

  for (let i = 0; i < lineCoords.length - 1; i++) {
    const P0 = toVec2(lineCoords[i]);
    const P1 = toVec2(lineCoords[i + 1]);

    const dir = normalize(sub(P1, P0));
    const normal = vec2(-dir.y, dir.x);

    const left0 = add(P0, mul(normal, 1));
    const right0 = sub(P0, mul(normal, 1));
    const left1 = add(P1, mul(normal, 1));
    const right1 = sub(P1, mul(normal, 1));

    positions.push(left0.x, left0.y, 0);
    positions.push(left1.x, left1.y, 0);
    positions.push(right1.x, right1.y, 0);
    positions.push(right0.x, right0.y, 0);

    // two triangles
    indices.push(idx + 0, idx + 1, idx + 2);
    indices.push(idx + 0, idx + 2, idx + 3);

    idx += 4;
  }

  return indices;
};
