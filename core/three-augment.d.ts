import "three";

declare module "three" {
  declare type MeshLike = import("three").Mesh | import("three").InstancedMesh | import("three").BatchedMesh;
}
