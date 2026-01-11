import * as THREE from "three";

export class MeshPolygonGeometry extends THREE.BufferGeometry {
  override type = "MeshPolygon";
  isMeshPolygon = true;

  position: number[] = [];

  _attributes!: {
    position: THREE.BufferAttribute;
  };

  constructor() {
    super();
  }

  setPolygons(position: number[]): void {
    this.position.length = 0;
    this.position.push(...position);

    if (!this._attributes) {
      this._attributes = {
        position: new THREE.BufferAttribute(new Float32Array(this.position), 3),
      };
    } else {
      this._attributes.position.copyArray(new Float32Array(this.position));
    }

    this.setAttribute("position", this._attributes.position);
  }
}
