import * as THREE from "three";

export interface BatchedMeshBuilderParameters {
  maxInstanceCount: number;
  maxVertexCount: number;
  maxIndexCount?: number;
  material: THREE.Material;
  name?: string;
  sortObjects?: boolean;
  perObjectFrustumCulled?: boolean;
}

export interface BatchedMeshInstanceParameters {
  matrix?: THREE.Matrix4;
  color?: THREE.Color;
  visible?: boolean;
}

export interface BatchedMeshInstanceHandle {
  id: number;
  geometryKey: string;
}

const identityMatrix = new THREE.Matrix4();

/**
 * THREE.BatchedMesh 的轻量封装。
 *
 * 核心思路:
 * 1. 应用层用业务 key 管理 geometry, 不直接记 three 内部的 geometryId。
 * 2. addInstance 返回稳定 handle, 后续只用 instanceId 更新矩阵/颜色/显隐。
 * 3. 所有会影响画面的写操作都会 invalidate, 和按需渲染调度器保持一致。
 */
export class BatchedMeshBuilder {
  readonly mesh: THREE.BatchedMesh;
  /** geometryKey -> BatchedMesh 内部 geometryId。 */
  private readonly geometryIds = new Map<string, number>();
  /** instanceId -> 业务可读 handle, 便于调试和反查所属 geometry。 */
  private readonly instances = new Map<number, BatchedMeshInstanceHandle>();

  constructor(parameters: BatchedMeshBuilderParameters) {
    this.mesh = new THREE.BatchedMesh(parameters.maxInstanceCount, parameters.maxVertexCount, parameters.maxIndexCount, parameters.material);
    this.mesh.name = parameters.name ?? "BatchedMeshBuilder";
    this.mesh.sortObjects = parameters.sortObjects ?? true;
    this.mesh.perObjectFrustumCulled = parameters.perObjectFrustumCulled ?? true;
  }

  /**
   * 注册一种几何模板。
   * reservedVertexRange/reservedIndexRange 用于未来替换更大几何时预留空间,
   * 不需要动态替换时可以不传。
   */
  addGeometry(key: string, geometry: THREE.BufferGeometry, reservedVertexRange?: number, reservedIndexRange?: number): number {
    const existed = this.geometryIds.get(key);
    if (existed !== undefined) return existed;

    const geometryId = this.mesh.addGeometry(geometry, reservedVertexRange, reservedIndexRange);
    this.geometryIds.set(key, geometryId);
    return geometryId;
  }

  /** 基于已注册的 geometryKey 创建一个实例, 可一次性写入矩阵、颜色和显隐。 */
  addInstance(geometryKey: string, parameters: BatchedMeshInstanceParameters = {}): BatchedMeshInstanceHandle {
    const geometryId = this.geometryIds.get(geometryKey);
    if (geometryId === undefined) throw new Error(`BatchedMeshBuilder: unknown geometry key ${geometryKey}`);

    const id = this.mesh.addInstance(geometryId);
    const handle = { id, geometryKey };
    this.instances.set(id, handle);

    this.setMatrix(id, parameters.matrix ?? identityMatrix);
    if (parameters.color) this.setColor(id, parameters.color);
    if (parameters.visible !== undefined) this.setVisible(id, parameters.visible);

    return handle;
  }

  /** 更新单个实例的局部矩阵, 适合 WebSocket 点位驱动设备移动。 */
  setMatrix(instanceId: number, matrix: THREE.Matrix4): this {
    this.mesh.setMatrixAt(instanceId, matrix);
    return this;
  }

  /** 更新 BatchedMesh 自带的 instance color, shader 需支持 USE_BATCHING_COLOR 才能消费。 */
  setColor(instanceId: number, color: THREE.Color): this {
    this.mesh.setColorAt(instanceId, color);
    return this;
  }

  /** Shader/renderer 级别的实例显隐, 不需要从场景树移除对象。 */
  setVisible(instanceId: number, visible: boolean): this {
    this.mesh.setVisibleAt(instanceId, visible);
    return this;
  }

  /** 删除实例并释放 BatchedMesh 内部 slot, 外部 handle 随之失效。 */
  deleteInstance(instanceId: number): this {
    this.mesh.deleteInstance(instanceId);
    this.instances.delete(instanceId);
    return this;
  }

  getGeometryId(key: string): number | undefined {
    return this.geometryIds.get(key);
  }

  getInstance(instanceId: number): BatchedMeshInstanceHandle | undefined {
    return this.instances.get(instanceId);
  }
}
