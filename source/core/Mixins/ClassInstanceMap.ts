import * as THREE from "three";

type ClassInstanceMap<T> = Map<any | "default", T>;

type Constructor<T = {}> = new (...args: any[]) => T;

export const WithClassInstanceMap = <TBase extends Constructor>(Base: TBase) => {
  return class extends Base {
    static classInstanceMap: ClassInstanceMap<TBase> = new Map();

    constructor(...args: any[]) {
      super(...args);

      const ctor = this.constructor as typeof Base & { classInstanceMap: ClassInstanceMap<TBase> };

      if (!ctor.classInstanceMap.has("default")) {
        ctor.classInstanceMap.set("default", this as unknown as TBase);
      }
    }
  };
};

class ViewportDisPatcher extends WithClassInstanceMap(THREE.Object3D) {
  customName: string;

  constructor(customName: string) {
    super();
    this.customName = customName;
  }
}

const vd1 = new ViewportDisPatcher("QC01");
const vd2 = new ViewportDisPatcher("QC02");
const _vd = ViewportDisPatcher.classInstanceMap.get("default");

console.log(vd1, vd2, _vd);
