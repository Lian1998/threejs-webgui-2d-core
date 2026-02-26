import "three";

declare module "three" {
  /** threejs 泛Mesh类型 */
  declare type MeshLike = import("three").Mesh | import("three").InstancedMesh | import("three").BatchedMesh;

  /** threejs 泛二维(XZ平面)顶点类型 */
  declare type Vertex2DLike = THREE.Vector3[] | THREE.Vector2[] | THREE.Vector3Tuple[] | THREE.Vector2Tuple[] | number[];
}
