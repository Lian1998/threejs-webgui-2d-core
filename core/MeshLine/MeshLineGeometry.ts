import * as THREE from "three";
import type { FeatureCollection, GeometryCollection } from "geojson";
import type { LineString } from "geojson";

import { convert2Vertex2D } from "@core/utils/vertex";

/**
 * 在 CPU 阶段计算必要参数:
 * 1. 多线段首尾扩充重复顶点, 在shader中判断`lineBreakpoint`是否渲染
 * 2. 重复一份线段顶点`position`, 在shader中线段上某顶点的两份拷贝根据 `side` 分别向法线的两个方向扩充宽度
 * 3. 遍历过程中计算 `prev` `next`, 以在shader中计算法线方向
 * 4. `uv` u代表线段进度, v代表沿着法线扩充程度(法线正方向为0, 法线负方向为1)
 * 5. `counter` 代表顶点对应当前线段的线段进度(0 ~ 1)
 * 6. `lineDistance` 代表顶点在线段的总距离
 *
 *| Attribute       | Type                   | ItemSize |
 *|----------------|-------------------------|----------|
 *| position       | THREE.BufferAttribute   | 3        |
 *| index          | THREE.BufferAttribute   | 1        |
 *| prev           | THREE.BufferAttribute   | 3        |
 *| next           | THREE.BufferAttribute   | 3        |
 *| side           | THREE.BufferAttribute   | 1        |
 *| uv             | THREE.BufferAttribute   | 2        |
 *| counter        | THREE.BufferAttribute   | 1        |
 *| lineDistance   | THREE.BufferAttribute   | 1        |
 *| lineBreakpoint | THREE.BufferAttribute   | 1        |
 */
export class MeshLineGeometry extends THREE.BufferGeometry {
  override type = "MeshLineBufferGeometry";
  isMeshLineGeometry = true;

  position: number[] = [];
  indices_array: number[] = [];
  prev: number[] = [];
  next: number[] = [];
  side: number[] = [];
  uv: number[] = [];
  counter: number[] = [];
  lineDistance: number[] = []; // 顶点在线段中的累计长度
  lineBreakpoint: number[] = []; // 顶点是否为断点

  constructor() {
    super();
  }

  /**
   * 将此geometry设置为单条线段
   * @param points [x1, y1, x2, y2...]
   */
  setLine(points: number[]): void {
    this.dispose();
    if (points.length % 3 !== 0) throw new Error("MeshLineGeometry: 输入的线段顶点必须是三维顶点坐标");
    this.position.length = 0;
    this.counter.length = 0;
    this.lineDistance.length = 0;
    this.lineBreakpoint.length = 0;

    const l = points.length;
    if (l < 6) throw new Error("MeshLineGeometry: 单个顶点无法组成线段");
    const pointCount = l / 3;
    let dist = 0;
    for (let i = 0; i < l; i += 3) {
      const c = pointCount <= 1 ? 0 : i / 3 / (pointCount - 1);
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
   * 将此geometry设置为多条线段
   * @param lines [[x1, y1, x2, y2 ...], [x1, y1, x2, y2 ... ]]
   */
  setMultiLine(lines: number[][]): void {
    this.dispose();
    if (lines.length <= 1) {
      this.setLine(lines[0]);
      return;
    }
    this.position.length = 0;
    this.counter.length = 0;
    this.lineDistance.length = 0;
    this.lineBreakpoint.length = 0;

    for (let j = 0; j < lines.length; j++) {
      const points = lines[j];

      const l = points.length;
      if (l < 6) throw new Error("[MeshLineGeometry]: 单个顶点无法组成线段");
      const pointCount = l / 3;
      let dist = 0;
      for (let i = 0; i < l; i += 3) {
        const c = pointCount <= 1 ? 0 : i / 3 / (pointCount - 1);
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

  /** 核心算法, 根据设置线段的顶点计算出必要属性 */
  process(): void {
    this.prev = []; // 每个顶点对应的 "上个顶点"
    this.next = []; // 每个顶点对应的 "下个顶点"
    this.side = []; // 标记当前点是线的左侧(+1)还是右侧(-1)
    this.indices_array = []; // 构成三角面的索引
    this.uv = []; // 每个点对应的纹理坐标 (u, v)

    // this.position => A(a, b, c), A(a, b, c), B(a, b, c), B(a, b, c)
    const l = this.position.length / 6; // 顶点数量
    let _v: THREE.Vector3Tuple; // 临时变量, 用于存放复制的顶点坐标

    // 第一个点的prev是自身, 第一个线段通过 next - prev 得到方向向量
    _v = this._copyV3(0);
    this.prev.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);

    // 遍历所有线段点
    for (let j = 0; j < l; j++) {
      const c = this.counter[2 * j]; // counter

      // side
      this.side.push(1, -1);

      // uv
      this.uv.push(c, 0, c, 1); // u:counter, v:side

      // 生成中间顶点的 prev 和 next
      if (j < l - 1) {
        _v = this._copyV3(j);
        this.prev.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);

        // 生成面索引 indices
        // 每个点扩成两个顶点 => 对应索引 (n, n+1)
        // 与下一组 (n+2, n+3) 一起构成两个三角形形成矩形带
        const n = j * 2;
        this.indices_array.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
      }
      if (j > 0) {
        _v = this._copyV3(j);
        this.next.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);
      }
    }

    // 最后一个点的next是自身
    _v = this._copyV3(l - 1);
    this.next.push(_v[0], _v[1], _v[2], _v[0], _v[1], _v[2]);

    // 将所有计算结果转为 BufferAttribute
    this.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.position), 3));
    this.setAttribute("prev", new THREE.BufferAttribute(new Float32Array(this.prev), 3));
    this.setAttribute("next", new THREE.BufferAttribute(new Float32Array(this.next), 3));
    this.setAttribute("side", new THREE.BufferAttribute(new Float32Array(this.side), 1));
    this.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(this.uv), 2));
    this.setAttribute("counter", new THREE.BufferAttribute(new Float32Array(this.counter), 1));
    this.setAttribute("lineDistance", new THREE.BufferAttribute(new Float32Array(this.lineDistance), 1));
    this.setAttribute("lineBreakpoint", new THREE.BufferAttribute(new Float32Array(this.lineBreakpoint), 1));
    const IndexArray = this.position.length / 3 > 65535 ? Uint32Array : Uint16Array;
    this.setIndex(new THREE.BufferAttribute(new IndexArray(this.indices_array), 1));
  }

  /**
   * 根据 index 从类属性positions中拷贝出顶点数据
   * @param a 索引
   * @returns
   */
  private _copyV3(a: number): THREE.Vector3Tuple {
    const aa = a * 6;
    return [this.position[aa], this.position[aa + 1], this.position[aa + 2]];
  }

  /**
   * 从 FeatureCollection<LineString> 类型数据结构中获取多条线段
   *
   * ```
   * {
   *  "type":"FeatureCollection", "features": [
   *   ...
   * }
   * ``
   * @param data FeatureCollection<LineString> 类型数据结构
   */
  setFromMapShaperFeatureCollection(data: FeatureCollection<LineString>) {
    this.dispose();

    const hanldeWrapper = (p: [number, number, number]): number[] => [p[0], 0.0, -p[2]]; // cad => qgis => mapshaper => geojson y(z)轴需要翻转一下
    const _coordinates = [];
    for (let i = 0; i < data.features.length; i++) {
      const feature = data.features[i];
      if (feature.geometry.type !== "LineString") {
        console.warn("MeshLineGeometry.setFromMapShaperFeatureCollection: 数据结构中存在非LineString类型Feature");
        continue;
      }
      const featureGeometryCoordinates = feature.geometry.coordinates; // THREE.Vector2Tuple[] | THREE.Vector3Tuple[]
      const coordinates = convert2Vertex2D(featureGeometryCoordinates, hanldeWrapper); // [[x1, 0.0, z1], [x2, 0.0, z2], ...]
      _coordinates.push(coordinates.flat()); // [x1, 0.0, z1, x2, 0.0, z2, ...]
    }

    this.setMultiLine(_coordinates);
  }

  /**
   * 从 GeometryCollection<LineString> 类型数据结构中获取多条线段
   *
   * ```
   * {
   *  "type":"GeometryCollection", "features": [
   *   ...
   * }
   * ``
   * @param data GeometryCollection<LineString> 类型数据结构
   */
  setFromMapShaperGeometryCollection(data: GeometryCollection<LineString>) {
    this.dispose();
    const hanldeWrapper = (p: [number, number, number]): number[] => [p[0], 0.0, -p[2]]; // cad => qgis => mapshaper => geojson y(z)轴需要翻转一下
    const _coordinates = [];
    for (let i = 0; i < data.geometries.length; i++) {
      const feature = data.geometries[i];
      if (feature.type !== "LineString") {
        console.warn("MeshLineGeometry.setFromMapShaperGeometryCollection: 数据结构中存在非LineString类型Feature");
        continue;
      }
      const featureGeometryCoordinates = feature.coordinates; // THREE.Vector2Tuple[] | THREE.Vector3Tuple[]
      const coordinates = convert2Vertex2D(featureGeometryCoordinates, hanldeWrapper); // [[x1, 0.0, z1], [x2, 0.0, z2], ...]
      _coordinates.push(coordinates.flat()); // [x1, 0.0, z1, x2, 0.0, z2, ...]
    }

    this.setMultiLine(_coordinates);
  }
}
