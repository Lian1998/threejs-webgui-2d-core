import * as THREE from "three";

/** 所有传入的点可能的类型 */
export type PointsRepresentation = THREE.Vector3[] | THREE.Vector2[] | THREE.Vector3Tuple[] | THREE.Vector2Tuple[] | number[];

/**
 * 格式兼容性处理函数
 * @param {PointsRepresentation} points 点
 * @returns {Float32Array | number[]}
 */
export const convertPoints = (points: PointsRepresentation, hanldeWrapper?: (p: [number, number, number]) => number[]): number[] => {
  return points
    .map((p: any) => {
      const isArray = Array.isArray(p);
      // 先将各种原始数组的格式转化成 Array3<number>
      if (p instanceof THREE.Vector3) p = [p.x, p.y, p.z];
      else if (p instanceof THREE.Vector2) p = [p.x, 0.0, p.y];
      else if (isArray && p.length === 3) p = [p[0], p[1], p[2]];
      else if (isArray && p.length === 2) p = [p[0], 0.0, p[1]]; // 此函数现在默认只处理mapshaper导出的json文件
      // 这里是需要特殊处理的格式
      if (hanldeWrapper) return hanldeWrapper(p); // geojson的Z坐标和threejs的Z坐标是反的
      return p;
    })
    .flat();
};

/** 线条宽度比例计算, 输入 0 ~ 1, 输出 0 ~ 1 */
export type WidthCallback = (p: number) => any;

/**
 * 将线段点通过API传入, 通过计算函数扩充成面片
 * 注: 在 CPU 端只是将连续点扩充, 形成 (1*3*2)*n 的buffer(线的骨架), 而真正的面展开与厚度扩充过程是在 GPU 阶段完成的
 */
export class MeshLineGeometry extends THREE.BufferGeometry {
  override type = "MeshLine";
  isMeshLine = true;

  position: number[] = [];
  prev: number[] = [];
  next: number[] = [];
  side: number[] = [];
  width: number[] = [];
  indices_array: number[] = [];
  uv: number[] = [];
  counter: number[] = [];
  lineDistance: number[] = []; // 顶点在线段中的累计长度
  lineBreakpoint: number[] = []; // 顶点是否为断点
  widthCallback: WidthCallback | null = null;

  _attributes!: {
    position: THREE.BufferAttribute;
    prev: THREE.BufferAttribute;
    next: THREE.BufferAttribute;
    side: THREE.BufferAttribute;
    width: THREE.BufferAttribute;
    uv: THREE.BufferAttribute;
    index: THREE.BufferAttribute;
    counter: THREE.BufferAttribute;
    lineDistance: THREE.BufferAttribute;
    lineBreakpoint: THREE.BufferAttribute;
  };

  constructor() {
    super();
  }

  /**
   * 设置线段
   * @param points 线条端点
   * @param wcb 线宽衰减函数 https://iquilezles.org/articles/functions/
   */
  setLine(points: number[], wcb?: WidthCallback): void {
    if (points.length % 3 !== 0) throw new Error("[MeshLineGeometry]: 输入的线段顶点必须是三维坐标");
    this.widthCallback = wcb ?? null;
    this.position.length = 0; // this.position => A(a, b, c), A(a, b, c), B(a, b, c), B(a, b, c)
    this.counter.length = 0; // 0 ~ 1
    this.lineDistance.length = 0;
    this.lineBreakpoint.length = 0;

    const l = points.length;
    if (l < 2) throw new Error("[MeshLineGeometry]: 单个顶点无法组成线段");
    let dist = 0;
    for (let i = 0; i < l; i += 3) {
      const c = i / (l - 1);
      if (i > 0) {
        const dx = points[i] - points[i - 3];
        const dy = points[i + 1] - points[i - 2];
        const dz = points[i + 2] - points[i - 1];
        dist += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      // 一个点扩充成两个点
      this.position.push(points[i], points[i + 1], points[i + 2], points[i], points[i + 1], points[i + 2]);
      this.counter.push(c, c);
      this.lineDistance.push(dist, dist);
      this.lineBreakpoint.push(0, 0);
    }
    this.process();
  }

  /**
   * 设置线多条线段
   *
   * 线段1:
   * 1 0 === 0 === 0 === 0 1
   * 1 0 === 0 === 0 === 0 1
   *
   * 线段2:
   * 1 0 === 0 1
   * 1 0 === 0 1
   * @param lines 多条线段的端点
   * @param wcb 线宽衰减函数 https://iquilezles.org/articles/functions/
   */
  setMultiLine(lines: number[][], wcb?: WidthCallback): void {
    if (lines.length <= 1) {
      this.setLine(lines[0], wcb);
      return;
    }
    this.widthCallback = wcb ?? null;
    this.position.length = 0; // this.position => A(a, b, c), A(a, b, c), B(a, b, c), B(a, b, c)
    this.counter.length = 0; // 0 ~ 1
    this.lineDistance.length = 0;
    this.lineBreakpoint.length = 0;

    for (let j = 0; j < lines.length; j++) {
      const points = lines[j];

      const l = points.length;
      if (l < 2) throw new Error("[MeshLineGeometry]: 单个顶点无法组成线段");
      let dist = 0;
      for (let i = 0; i < l; i += 3) {
        const c = i / (l - 1);
        // 首点多重复一遍
        if (i === 0) {
          this.position.push(points[i], points[i + 1], points[i + 2], points[i], points[i + 1], points[i + 2]);
          this.counter.push(0, 0);
          this.lineDistance.push(0, 0);
          this.lineBreakpoint.push(1, 1);
        }
        //
        if (i > 0) {
          const dx = points[i] - points[i - 3];
          const dy = points[i + 1] - points[i - 2];
          const dz = points[i + 2] - points[i - 1];
          dist += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        this.position.push(points[i], points[i + 1], points[i + 2], points[i], points[i + 1], points[i + 2]);
        this.counter.push(c, c);
        this.lineDistance.push(dist, dist);
        this.lineBreakpoint.push(0, 0);

        // 末点多重复一遍
        if (i === l - 3) {
          this.position.push(points[i], points[i + 1], points[i + 2], points[i], points[i + 1], points[i + 2]);
          this.counter.push(0, 0);
          this.lineDistance.push(0, 0);
          this.lineBreakpoint.push(1, 1);
        }
      }
    }
    this.process();
  }

  /** 从posisitons中拷贝出对应index的数据 */
  copyV3(a: number): THREE.Vector3Tuple {
    const aa = a * 6;
    return [this.position[aa], this.position[aa + 1], this.position[aa + 2]];
  }

  /** 核心算法, 整理顶点面序, 整理prev和next用于在shader中计算方向向量 */
  process(): void {
    this.prev = []; // 每个顶点对应的 "上个顶点"
    this.next = []; // 每个顶点对应的 "下个顶点"
    this.side = []; // 标记当前点是线的左侧(+1)还是右侧(-1)
    this.width = []; // 每个顶点对应的线宽
    this.indices_array = []; // 构成三角面的索引
    this.uv = []; // 每个点对应的纹理坐标 (u, v)

    // this.position => A(a, b, c), A(a, b, c), B(a, b, c), B(a, b, c)
    const l = this.position.length / 6; // 顶点数量
    let _v: THREE.Vector3Tuple; // 临时变量，用于存放复制的顶点坐标

    // 第一个点的prev是自身, 第一个线段通过 next - prev 得到方向向量
    _v = this.copyV3(0);
    this.prev.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);

    // 遍历所有线段点
    for (let j = 0; j < l; j++) {
      const c = this.counter[2 * j]; // counter

      // side
      this.side.push(1, -1);

      // width
      let w = 1;
      if (this.widthCallback) w = this.widthCallback(c);
      this.width.push(w, w);

      // uv
      this.uv.push(c, 0, c, 1); // x:counter, v:side

      // 生成中间顶点的 prev 和 next
      if (j < l - 1) {
        _v = this.copyV3(j);
        this.prev.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);

        // 生成面索引 indices
        // 每个点扩成两个顶点 => 对应索引 (n, n+1)
        // 与下一组 (n+2, n+3) 一起构成两个三角形形成矩形带
        const n = j * 2;
        this.indices_array.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
      }
      if (j > 0) {
        _v = this.copyV3(j);
        this.next.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);
      }
    }

    // 最后一个点的next是自身
    _v = this.copyV3(l - 1);
    this.next.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);

    // 将所有计算结果转为 BufferAttribute

    if (!this._attributes) {
      this._attributes = {
        position: new THREE.BufferAttribute(new Float32Array(this.position), 3),
        prev: new THREE.BufferAttribute(new Float32Array(this.prev), 3),
        next: new THREE.BufferAttribute(new Float32Array(this.next), 3),
        side: new THREE.BufferAttribute(new Float32Array(this.side), 1),
        width: new THREE.BufferAttribute(new Float32Array(this.width), 1),
        uv: new THREE.BufferAttribute(new Float32Array(this.uv), 2),
        index: new THREE.BufferAttribute(new Uint16Array(this.indices_array), 1),
        counter: new THREE.BufferAttribute(new Float32Array(this.counter), 1),
        lineDistance: new THREE.BufferAttribute(new Float32Array(this.lineDistance), 1),
        lineBreakpoint: new THREE.BufferAttribute(new Float32Array(this.lineBreakpoint), 1),
      };
    } else {
      this._attributes.position.copyArray(new Float32Array(this.position));
      this._attributes.position.needsUpdate = true;
      this._attributes.prev.copyArray(new Float32Array(this.prev));
      this._attributes.prev.needsUpdate = true;
      this._attributes.next.copyArray(new Float32Array(this.next));
      this._attributes.next.needsUpdate = true;
      this._attributes.side.copyArray(new Float32Array(this.side));
      this._attributes.side.needsUpdate = true;
      this._attributes.width.copyArray(new Float32Array(this.width));
      this._attributes.width.needsUpdate = true;
      this._attributes.uv.copyArray(new Float32Array(this.uv));
      this._attributes.uv.needsUpdate = true;
      this._attributes.index.copyArray(new Uint16Array(this.indices_array));
      this._attributes.index.needsUpdate = true;
      this._attributes.lineDistance.copyArray(new Float32Array(this.lineDistance));
      this._attributes.lineDistance.needsUpdate = true;
      this._attributes.lineBreakpoint.copyArray(new Float32Array(this.lineBreakpoint));
      this._attributes.lineBreakpoint.needsUpdate = true;
    }

    this.setAttribute("position", this._attributes.position);
    this.setAttribute("prev", this._attributes.prev);
    this.setAttribute("next", this._attributes.next);
    this.setAttribute("side", this._attributes.side);
    this.setAttribute("width", this._attributes.width);
    this.setAttribute("uv", this._attributes.uv);
    this.setAttribute("counter", this._attributes.counter);
    this.setAttribute("lineDistance", this._attributes.lineDistance);
    this.setAttribute("lineBreakpoint", this._attributes.lineBreakpoint);

    this.setIndex(this._attributes.index);
  }
}
