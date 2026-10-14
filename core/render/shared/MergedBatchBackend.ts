import * as THREE from "three";
import type { PrimitiveHandle, PrimitiveKind, PrimitiveRenderBackend, RenderContext, RenderFeature, RenderItem, RenderPassKind, UploadStats } from "../../contracts";
import { applyRenderContext, createBatchMaterial, updateAttribute } from "./material";

export type VertexData = Record<string, number[]>;
interface Batch {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  capacity: number;
  features: Map<string, { signature: string; data: VertexData; offset: number }>;
}
/** 合并几何保留逐图元数据范围. 姿态/颜色变化只比较并上传变更图元的范围. */
export abstract class MergedBatchBackend implements PrimitiveRenderBackend {
  abstract readonly kind: PrimitiveKind;
  readonly stats: UploadStats = { bytes: 0, ranges: 0, rebuiltBatches: 0 };
  private batches = new Map<string, Batch>();
  private encoded = new Map<string, { signature: string; data: VertexData }>();
  private used = new Set<string>();
  constructor(
    private layout: Record<string, number>,
    private vertex: string,
    private fragment: string,
  ) {}
  abstract encode(feature: RenderFeature): VertexData;
  prepare(_handle: PrimitiveHandle<any>): Promise<void> {
    return Promise.resolve();
  }
  beginFrame(_pass: RenderPassKind): void {
    this.used.clear();
  }
  build(runKey: string, features: readonly RenderFeature[], context: RenderContext): readonly RenderItem[] {
    type Part = { feature: RenderFeature; signature: string; data: VertexData };
    const chunks: Part[][] = [];
    let chunk: Part[] = [],
      vertices = 0;
    const maxVertices = 65535; // 三角形边界分块, 每个逻辑图元可映射多个 GPU 片段.
    for (const feature of features) {
      const old = this.encoded.get(feature.handle.id);
      const signature = `${feature.version}:${feature.opacity}:${feature.pickId}`;
      const data = old?.signature === signature ? old.data : this.encode(feature);
      this.encoded.set(feature.handle.id, { signature, data });
      const count = data.position.length / 3;
      for (let start = 0; start < count;) {
        if (vertices === maxVertices) {
          chunks.push(chunk);
          chunk = [];
          vertices = 0;
        }
        const length = Math.min(count - start, maxVertices - vertices);
        const sliced = start === 0 && length === count ? data : Object.fromEntries(Object.entries(this.layout).map(([name, size]) => [name, data[name].slice(start * size, (start + length) * size)]));
        chunk.push({ feature, signature: `${signature}:${start}:${length}`, data: sliced });
        vertices += length;
        start += length;
      }
    }
    if (chunk.length) chunks.push(chunk);
    return chunks.flatMap((parts, index) => this.buildChunk(`${runKey}:${index}`, parts, context));
  }
  private buildChunk(runKey: string, data: { feature: RenderFeature; signature: string; data: VertexData }[], context: RenderContext): readonly RenderItem[] {
    this.used.add(runKey);
    let batch = this.batches.get(runKey);
    const count = data.reduce((n, item) => n + item.data.position.length / 3, 0);
    if (!count) return [];
    const created = !batch || count > batch.capacity;
    if (created) {
      const capacity = 2 ** Math.ceil(Math.log2(Math.max(8, count)));
      batch?.mesh.geometry.dispose();
      batch?.mesh.material.dispose();
      const geometry = new THREE.BufferGeometry();
      for (const [key, size] of Object.entries(this.layout)) geometry.setAttribute(key, new THREE.BufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage));
      const mesh = new THREE.Mesh(geometry, createBatchMaterial(this.vertex, this.fragment));
      mesh.frustumCulled = false;
      batch = { mesh, capacity, features: new Map() };
      this.batches.set(runKey, batch);
      this.stats.rebuiltBatches++;
      this.stats.bytes += Object.values(geometry.attributes).reduce((n, attr) => n + attr.array.byteLength, 0);
      this.stats.ranges += Object.keys(this.layout).length;
    }
    let vertexOffset = 0;
    const cache = new Map<string, { signature: string; data: VertexData; offset: number }>();
    for (const { feature, signature, data: vertexData } of data) {
      const previous = batch!.features.get(feature.handle.id);
      // 同一槽位且内容未变时跳过逐顶点比较. 删除或排序导致范围移动时仍同步该范围.
      if (created || previous?.signature !== signature || previous.offset !== vertexOffset) {
        for (const [key, size] of Object.entries(this.layout)) {
          const attr = batch!.mesh.geometry.getAttribute(key) as THREE.BufferAttribute;
          if (created) (attr.array as Float32Array).set(vertexData[key], vertexOffset * size);
          else {
            const bytes = updateAttribute(attr, vertexOffset * size, vertexData[key]);
            this.stats.bytes += bytes;
            if (bytes) this.stats.ranges++;
          }
        }
      }
      cache.set(feature.handle.id, { signature, data: vertexData, offset: vertexOffset });
      vertexOffset += vertexData.position.length / 3;
    }
    batch!.features = cache;
    batch!.mesh.geometry.setDrawRange(0, count);
    applyRenderContext(batch!.mesh.material, context);
    return [{ object: batch!.mesh, primitiveIds: [...new Set(data.map((part) => part.feature.handle.id))], key: runKey }];
  }
  endFrame(pass: RenderPassKind): void {
    for (const [key, batch] of this.batches)
      if (key.startsWith(`${pass}:`) && !this.used.has(key)) {
        batch.mesh.geometry.dispose();
        batch.mesh.material.dispose();
        this.batches.delete(key);
      }
  }
  remove(id: string): void {
    this.encoded.delete(id);
    for (const [key, batch] of this.batches) {
      batch.features.delete(id);
      if (!batch.features.size) {
        batch.mesh.removeFromParent();
        batch.mesh.geometry.dispose();
        batch.mesh.material.dispose();
        this.batches.delete(key);
      }
    }
  }
  contextRestored(): void {
    for (const batch of this.batches.values())
      for (const attr of Object.values(batch.mesh.geometry.attributes)) {
        const attribute = attr as THREE.BufferAttribute;
        attribute.clearUpdateRanges();
        attribute.needsUpdate = true;
        this.stats.bytes += attribute.array.byteLength;
        this.stats.ranges++;
      }
  }
  dispose(): void {
    for (const batch of this.batches.values()) {
      batch.mesh.geometry.dispose();
      batch.mesh.material.dispose();
    }
    this.batches.clear();
    this.encoded.clear();
  }
}
