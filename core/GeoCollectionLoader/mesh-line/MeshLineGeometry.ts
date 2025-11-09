import * as THREE from "three";

/**
 * 用于解决IE没有实现 Typed​Array​.prototype​.subarray() 的问题
 * https://stackoverflow.com/a/56532878
 * @param src
 * @param srcOffset
 * @param dst
 * @param dstOffset
 * @param length
 * @returns
 */
const memcpy = (src: BufferSource | ArrayLike<number>, srcOffset: number, dst: BufferSource | ArrayLike<number>, dstOffset: number, length: number): any => {
  let i: number;
  // @ts-ignore
  src = src.subarray || src.slice ? src : src.buffer;
  // @ts-ignore
  dst = dst.subarray || dst.slice ? dst : dst.buffer;
  src = srcOffset
    ? // @ts-ignore
      src.subarray
      ? // @ts-ignore
        src.subarray(srcOffset, length && srcOffset + length)
      : // @ts-ignore
        src.slice(srcOffset, length && srcOffset + length)
    : src;
  // @ts-ignore
  if (dst.set) {
    // @ts-ignore
    dst.set(src, dstOffset);
  } else {
    // @ts-ignore
    for (i = 0; i < src.length; i++) dst[i + dstOffset] = src[i];
  }
  return dst;
};

/** 所有传入的点可能的类型 */
export type PointsRepresentation = THREE.BufferGeometry | Float32Array | THREE.Vector3[] | THREE.Vector2[] | THREE.Vector3Tuple[] | THREE.Vector2Tuple[] | number[];
/**
 * 接受以下任意格式的传入Points
 * @param {PointsRepresentation} points 点
 * @returns {Float32Array | number[]}
 */
export const convertPoints = (points: PointsRepresentation): Float32Array | number[] => {
  if (points instanceof Float32Array) return points;
  else if (points instanceof THREE.BufferGeometry) return points.getAttribute("position").array as Float32Array;
  return points
    .map((p: any) => {
      const isArray = Array.isArray(p);
      if (p instanceof THREE.Vector3) return [p.x, p.y, p.z];
      else if (p instanceof THREE.Vector2) return [p.x, 0, p.y];
      else if (isArray && p.length === 3) return [p[0], p[1], p[2]];
      else if (isArray && p.length === 2) return [p[0], 0, p[1]];
      return p;
    })
    .flat();
};

export type WidthCallback = (p: number) => any;

/**
 * 将线段点通过API传入, 通过计算函数扩充成面片
 * 注: 在 CPU 端只是将连续点扩充, 形成 (1*3*2)*n 的buffer(线的骨架), 而真正的面展开与厚度扩充过程是在 GPU 阶段完成的
 */
export class MeshLineGeometry extends THREE.BufferGeometry {
  override type = "MeshLine";
  isMeshLine = true;
  positions: number[] = [];
  previous: number[] = [];
  next: number[] = [];
  side: number[] = [];
  width: number[] = [];
  indices_array: number[] = [];
  uvs: number[] = [];
  counters: number[] = [];
  widthCallback: WidthCallback | null = null;

  _attributes!: {
    position: THREE.BufferAttribute;
    previous: THREE.BufferAttribute;
    next: THREE.BufferAttribute;
    side: THREE.BufferAttribute;
    width: THREE.BufferAttribute;
    uv: THREE.BufferAttribute;
    index: THREE.BufferAttribute;
    counters: THREE.BufferAttribute;
  };
  _points: Float32Array | number[] = [];
  points!: Float32Array | number[];

  // Used to raycast
  matrixWorld = new THREE.Matrix4();

  constructor() {
    super();

    Object.defineProperties(this, {
      points: {
        enumerable: true,
        get() {
          return this._points;
        },
        set(value) {
          this.setPoints(value, this.widthCallback);
        },
      },
    });
  }

  setMatrixWorld(matrixWorld: THREE.Matrix4): void {
    this.matrixWorld = matrixWorld;
  }

  /**
   * 将线段点传入函数, 类内部会自动计算这个线段的骨架, 并且生成对应的buffer
   * https://iquilezles.org/articles/functions/
   * @param points 线段点
   * @param wcb 一条描述当前点粗细的函数, x轴从0~1代表距离线段起点的距离的程度, y轴代表线段在该点的粗细
   * @returns
   */
  setPoints(points: PointsRepresentation, wcb?: WidthCallback): void {
    points = convertPoints(points);
    this._points = points; // 当前点发生变化时, 会存储下来以便在后续检索
    this.widthCallback = wcb ?? null;
    this.positions.length = 0;
    this.counters.length = 0;

    if (points.length < 2) {
      this.process();
      return;
    }

    for (let j = 0; j < points.length; j += 3) {
      const c = j / (points.length - 1);
      this.positions.push(points[j], points[j + 1], points[j + 2]);
      this.positions.push(points[j], points[j + 1], points[j + 2]);
      this.counters.push(c);
      this.counters.push(c);
    }
    this.process();
  }

  /** 比较两个三维顶点向量是否相同 */
  compareV3(a: number, b: number): boolean {
    const aa = a * 6;
    const ab = b * 6;

    // prettier-ignore
    return this.positions[aa] === this.positions[ab]
        && this.positions[aa + 1] === this.positions[ab + 1]
        && this.positions[aa + 2] === this.positions[ab + 2];
  }

  /** 从posisitons中拷贝出对应index的数据 */
  copyV3(a: number): THREE.Vector3Tuple {
    const aa = a * 6;
    return [this.positions[aa], this.positions[aa + 1], this.positions[aa + 2]];
  }

  /** 核心算法, 处理通过setPoints计算的this.positions扩面形成当前BufferGoemetry的attributes */
  process(): void {
    // this.positions => A(a, b, c), A(a, b, c), B(a, b, c), B(a, b, c)
    // 顶点数量 length / 6
    const l = this.positions.length / 6;

    this.previous = []; // 每个顶点对应的 "上个顶点" 的位置
    this.next = []; // 每个顶点对应的 "下个顶点" 的位置
    this.side = []; // 标记当前点是线的左侧(+1)还是右侧(-1)
    this.width = []; // 每个顶点对应的线宽
    this.indices_array = []; // 构成三角面的索引
    this.uvs = []; // 每个点对应的纹理坐标 (u, v)

    let w = 1; // 默认线宽
    let _v: THREE.Vector3Tuple; // 临时变量，用于存放复制的顶点坐标

    // 初始化 previous

    // 如果首尾点相同（形成闭合环）
    if (this.compareV3(0, l - 1)) _v = this.copyV3(l - 2);
    // 否则就取自身
    else _v = this.copyV3(0);
    // 点需要 push 两次 每个几何点会扩充为两个顶点(左右两侧)
    this.previous.push(_v[0], _v[1], _v[2]);
    this.previous.push(_v[0], _v[1], _v[2]);

    // 遍历所有线段点
    for (let j = 0; j < l; j++) {
      // 每个原始点被扩成两个 分别在左右两侧
      this.side.push(1);
      this.side.push(-1);

      // 动态宽度 可以通过回调函数按比例变化
      if (this.widthCallback) w = this.widthCallback(j / (l - 1));
      this.width.push(w);
      this.width.push(w);

      // UV 坐标 U 表示在线上的位置比例; V 为 0 或 1 (顺着顺时针法线, 逆着顺时针法线)
      this.uvs.push(j / (l - 1), 0);
      this.uvs.push(j / (l - 1), 1);

      // 生成 previous

      if (j < l - 1) {
        // points previous to poisitions
        _v = this.copyV3(j);
        this.previous.push(_v[0], _v[1], _v[2]);
        this.previous.push(_v[0], _v[1], _v[2]);

        // 生成面索引 indices
        // 每个点扩成两个顶点 => 对应索引 (n, n+1)
        // 与下一组 (n+2, n+3) 一起构成两个三角形形成矩形带

        const n = j * 2;
        this.indices_array.push(n, n + 1, n + 2);
        this.indices_array.push(n + 2, n + 1, n + 3);
      }

      // 生成 next

      if (j > 0) {
        // points after poisitions
        _v = this.copyV3(j);
        this.next.push(_v[0], _v[1], _v[2]);
        this.next.push(_v[0], _v[1], _v[2]);
      }
    }

    // 初始化 next

    // 如果是闭环则下一个是第二个点
    if (this.compareV3(l - 1, 0)) _v = this.copyV3(1);
    // 否则就取自身
    else _v = this.copyV3(l - 1);
    // 点需要 push 两次 每个几何点会扩充为两个顶点(左右两侧)
    this.next.push(_v[0], _v[1], _v[2]);
    this.next.push(_v[0], _v[1], _v[2]);

    // 将所有计算结果转为 BufferAttribute

    if (!this._attributes || this._attributes.position.count !== this.counters.length) {
      this._attributes = {
        position: new THREE.BufferAttribute(new Float32Array(this.positions), 3),
        previous: new THREE.BufferAttribute(new Float32Array(this.previous), 3),
        next: new THREE.BufferAttribute(new Float32Array(this.next), 3),
        side: new THREE.BufferAttribute(new Float32Array(this.side), 1),
        width: new THREE.BufferAttribute(new Float32Array(this.width), 1),
        uv: new THREE.BufferAttribute(new Float32Array(this.uvs), 2),
        index: new THREE.BufferAttribute(new Uint16Array(this.indices_array), 1),
        counters: new THREE.BufferAttribute(new Float32Array(this.counters), 1),
      };
    } else {
      this._attributes.position.copyArray(new Float32Array(this.positions));
      this._attributes.position.needsUpdate = true;
      this._attributes.previous.copyArray(new Float32Array(this.previous));
      this._attributes.previous.needsUpdate = true;
      this._attributes.next.copyArray(new Float32Array(this.next));
      this._attributes.next.needsUpdate = true;
      this._attributes.side.copyArray(new Float32Array(this.side));
      this._attributes.side.needsUpdate = true;
      this._attributes.width.copyArray(new Float32Array(this.width));
      this._attributes.width.needsUpdate = true;
      this._attributes.uv.copyArray(new Float32Array(this.uvs));
      this._attributes.uv.needsUpdate = true;
      this._attributes.index.copyArray(new Uint16Array(this.indices_array));
      this._attributes.index.needsUpdate = true;
    }

    this.setAttribute("position", this._attributes.position);
    this.setAttribute("previous", this._attributes.previous);
    this.setAttribute("next", this._attributes.next);
    this.setAttribute("side", this._attributes.side);
    this.setAttribute("width", this._attributes.width);
    this.setAttribute("uv", this._attributes.uv);
    this.setAttribute("counters", this._attributes.counters);

    this.setAttribute("position", this._attributes.position);
    this.setAttribute("previous", this._attributes.previous);
    this.setAttribute("next", this._attributes.next);
    this.setAttribute("side", this._attributes.side);
    this.setAttribute("width", this._attributes.width);
    this.setAttribute("uv", this._attributes.uv);
    this.setAttribute("counters", this._attributes.counters);

    this.setIndex(this._attributes.index);

    // this.computeBoundingSphere(); // 计算包围球
    // this.computeBoundingBox(); // 计算包围盒
  }

  /**
   * Fast method to advance the line by one position.  The oldest position is removed.
   * @param position
   */
  advance({ x, y, z }: THREE.Vector3) {
    const positions = this._attributes.position.array as unknown as number[];
    const previous = this._attributes.previous.array as unknown as number[];
    const next = this._attributes.next.array as unknown as number[];
    const l = positions.length;

    // PREVIOUS
    memcpy(positions, 0, previous, 0, l);

    // POSITIONS
    memcpy(positions, 6, positions, 0, l - 6);

    positions[l - 6] = x;
    positions[l - 5] = y;
    positions[l - 4] = z;
    positions[l - 3] = x;
    positions[l - 2] = y;
    positions[l - 1] = z;

    // NEXT
    memcpy(positions, 6, next, 0, l - 6);

    next[l - 6] = x;
    next[l - 5] = y;
    next[l - 4] = z;
    next[l - 3] = x;
    next[l - 2] = y;
    next[l - 1] = z;

    this._attributes.position.needsUpdate = true;
    this._attributes.previous.needsUpdate = true;
    this._attributes.next.needsUpdate = true;
  }
}
