import * as THREE from "three";
import type { RenderContext, UploadStats } from "../../contracts";
import { applyRenderContext, createBatchMaterial, fragmentPass, updateAttribute, vertexPass } from "../shared/material";

export type QuadKind = "sprite" | "glyph" | "background" | "bounds" | "text";
export const MAX_QUAD_INSTANCES = 16384;
export interface QuadInstance {
  primitiveId: string;
  matrix: ArrayLike<number>;
  rect: readonly [number, number, number, number];
  uv: readonly [number, number, number, number];
  color: readonly [number, number, number, number];
  pick: readonly [number, number, number];
  hit: readonly [number, number];
  style: readonly [number, number, number, number]; // screen, radius, threshold, outlineWidth.
  outline: readonly [number, number, number];
  bounds: number;
  type?: number; // text 批内 1=字形, 2=背景, 3=整体 bounds.
}

const vertexShader = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
${vertexPass}
in vec3 position;
in mat4 aMatrix;
in vec4 aRect;
in vec4 aUv;
in vec4 aColor;
in vec3 aPick;
in vec2 aHit;
in vec4 aStyle;
in vec3 aOutline;
in float aBounds;
in float aType;
out vec2 vUv;
out vec2 vLocal;
flat out vec2 vSize;
flat out vec4 vColor;
flat out vec4 vStyle;
flat out vec3 vOutline;
flat out float vBounds;
flat out float vType;
flat out vec3 vPickColor;
flat out vec2 vHit;
void main() {
  vec2 local = aRect.xy + position.xy * aRect.zw;
  if (aStyle.x > 0.5) local /= max(uScale, 0.000001);
  vec4 world = aMatrix * vec4(local.x, 0.0, -local.y, 1.0);
  gl_Position = cropClip(projectionMatrix * modelViewMatrix * world);
  vUv = mix(aUv.xy, aUv.zw, vec2(position.x, 1.0-position.y));
  vLocal = (position.xy-0.5)*aRect.zw;
  vSize = aRect.zw;
  vColor = aColor;
  vStyle = aStyle;
  vOutline = aOutline;
  vBounds = aBounds;
  vType = aType;
  vPickColor = aPick;
  vHit = aHit;
}
`;

function fragmentShader(kind: QuadKind): string {
  const glyphCoverage = `
    float distanceValue = texture(uAtlas, vUv).r;
    float aa = max(fwidth(distanceValue), 1.0/255.0);
    float fill = smoothstep(vStyle.z-aa, vStyle.z+aa, distanceValue);
    float outer = smoothstep(vStyle.z-vStyle.w-aa, vStyle.z-vStyle.w+aa, distanceValue);
    vec3 color = (vColor.rgb*fill + vOutline*max(outer-fill,0.0)) / max(outer, 0.000001);
    writeColor(vec4(color, outer*vColor.a));
  `;
  const backgroundCoverage = `
    float radius = min(vStyle.y, min(vSize.x, vSize.y)*0.5);
    vec2 q = abs(vLocal)-vSize*0.5+radius;
    float distanceValue = length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
    float aa = max(fwidth(distanceValue), 0.000001);
    float coverage = 1.0-smoothstep(-aa,aa,distanceValue);
    writeColor(vec4(vColor.rgb, vColor.a*coverage));
  `;
  const coverage =
    kind === "sprite"
      ? `
    vec4 sampleColor = texture(uAtlas, vUv);
    vec3 straightColor = sampleColor.rgb / max(sampleColor.a, 0.000001);
    writeColor(vec4(straightColor * vColor.rgb, sampleColor.a * vColor.a));
  `
      : kind === "glyph"
        ? glyphCoverage
        : kind === "background"
          ? backgroundCoverage
          : kind === "text"
            ? `
    if (vType > 2.5) { writeColor(vColor); return; }
    if (vType > 1.5) { ${backgroundCoverage} return; }
    ${glyphCoverage}
  `
            : `writeColor(vColor);`;
  return /* glsl */ `
${fragmentPass}
uniform highp sampler2D uAtlas;
in vec2 vUv;
in vec2 vLocal;
flat in vec2 vSize;
flat in vec4 vColor;
flat in vec4 vStyle;
flat in vec3 vOutline;
flat in float vBounds;
flat in float vType;
void main() {
  // bounds 忽略图片/字形孔洞, 但 writeColor 仍统一检查 opacity 与拾取阈值.
  if (uPickPass && vBounds > 0.5) { writeColor(vColor); return; }
  ${coverage}
}
`;
}

/** 精灵与标签共享的四边形实例批次, 使用 Mesh + InstancedBufferGeometry.
 * aMatrix/aRect/aUv 等 InstancedBufferAttribute 保存每实例状态, RawShaderMaterial 计算覆盖.
 * 与 Three.InstancedMesh 不同, 本类直接管理实例属性和局部上传范围. */
export class QuadBatch {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.RawShaderMaterial;
  private capacity = 0;
  private initialUpload = false;
  private attributes: Record<string, THREE.InstancedBufferAttribute> = {};
  private readonly primitiveIds = new Set<string>();
  private disposed = false;
  private readonly fallbackTexture?: THREE.DataTexture;
  constructor(
    readonly key: string,
    readonly kind: QuadKind,
    texture: THREE.Texture | undefined,
    private readonly stats: UploadStats,
  ) {
    if (!texture) {
      this.fallbackTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      this.fallbackTexture.needsUpdate = true;
      this.stats.bytes += 4;
      this.stats.ranges++;
      texture = this.fallbackTexture;
    }
    this.material = createBatchMaterial(vertexShader, fragmentShader(kind), { uAtlas: { value: texture } });
    this.mesh = new THREE.Mesh(new THREE.InstancedBufferGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.name = key;
  }

  /** 将逻辑实例顺序写入槽位, 用 instanceCount 控制有效数量, 隐藏或删除不依赖修改基础顶点. */
  sync(instances: readonly QuadInstance[], context: RenderContext): void {
    if (this.disposed) throw new Error("QuadBatch has been disposed");
    if (instances.length > MAX_QUAD_INSTANCES) throw new Error(`Quad batch exceeds ${MAX_QUAD_INSTANCES} instances`);
    if (instances.length > this.capacity) this.allocate(Math.max(4, 2 ** Math.ceil(Math.log2(instances.length))));
    const geometry = this.mesh.geometry as THREE.InstancedBufferGeometry;
    geometry.instanceCount = instances.length;
    this.primitiveIds.clear();
    for (let i = 0; i < instances.length; i++) {
      const data = instances[i];
      this.primitiveIds.add(data.primitiveId);
      this.write("aMatrix", i, data.matrix);
      this.write("aRect", i, data.rect);
      this.write("aUv", i, data.uv);
      this.write("aColor", i, data.color);
      this.write("aPick", i, data.pick);
      this.write("aHit", i, data.hit);
      this.write("aStyle", i, data.style);
      this.write("aOutline", i, data.outline);
      this.write("aBounds", i, [data.bounds]);
      this.write("aType", i, [data.type ?? 0]);
    }
    this.initialUpload = false;
    applyRenderContext(this.material, context);
  }
  /** 同一标签可能有多个 glyph 槽位, 成员集合按逻辑 ID 管理最后持有者. */
  removePrimitive(id: string): boolean {
    this.primitiveIds.delete(id);
    return this.primitiveIds.size === 0;
  }
  contextRestored(): void {
    if (this.disposed) return;
    // WebGL 恢复会重建整个 buffer, 静态顶点/index 也属于本次提交容量.
    const geometry = this.mesh.geometry;
    for (const attribute of Object.values(geometry.attributes)) {
      attribute.needsUpdate = true;
      this.stats.bytes += attribute.array.byteLength;
      this.stats.ranges++;
    }
    if (geometry.index) {
      geometry.index.needsUpdate = true;
      this.stats.bytes += geometry.index.array.byteLength;
      this.stats.ranges++;
    }
    this.material.needsUpdate = true;
    if (this.fallbackTexture) {
      this.fallbackTexture.needsUpdate = true;
      this.stats.bytes += 4;
      this.stats.ranges++;
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.fallbackTexture?.dispose();
    this.primitiveIds.clear();
  }
  private write(name: string, slot: number, values: ArrayLike<number>): void {
    const attr = this.attributes[name];
    // 新 buffer 首次由 Three.js 全量创建, 容量字节已统计, 不重复计入局部更新.
    if (this.initialUpload) {
      (attr.array as Float32Array).set(values, slot * attr.itemSize);
      return;
    }
    const bytes = updateAttribute(attr, slot * attr.itemSize, values);
    if (bytes) {
      this.stats.bytes += bytes;
      this.stats.ranges++;
    }
  }
  private allocate(capacity: number): void {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_QUAD_INSTANCES) throw new Error("Invalid quad batch capacity");
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const sizes = {
      aMatrix: 16,
      aRect: 4,
      aUv: 4,
      aColor: 4,
      aPick: 3,
      aHit: 2,
      aStyle: 4,
      aOutline: 3,
      aBounds: 1,
      aType: 1,
    };
    this.attributes = {};
    for (const [name, size] of Object.entries(sizes)) {
      const attr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage);
      this.attributes[name] = attr;
      geometry.setAttribute(name, attr);
    }
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.capacity = capacity;
    this.initialUpload = true;
    this.stats.rebuiltBatches++;
    this.stats.bytes += Object.values(geometry.attributes).reduce((bytes, attribute) => bytes + attribute.array.byteLength, geometry.index?.array.byteLength ?? 0);
    this.stats.ranges += Object.keys(geometry.attributes).length + 1;
  }
}
