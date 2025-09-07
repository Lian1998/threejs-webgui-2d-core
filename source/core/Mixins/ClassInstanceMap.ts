import * as THREE from "three";

type Constructor<T = object> = abstract new (...args: any[]) => T;

export const WithClassInstanceMap = <TBase extends Constructor>(Base: TBase) => {
  abstract class WithInstanceMap extends Base {
    static classInstanceMap: Map<any | "default", WithInstanceMap> = new Map();

    constructor(...args: any[]) {
      super(...args);

      const ctor = this.constructor as typeof Base & {
        classInstanceMap: Map<any | "default", WithInstanceMap>;
      };

      if (!ctor.classInstanceMap.has("default")) {
        ctor.classInstanceMap.set("default", this as unknown as ThisType<WithInstanceMap>);
      }
    }
  }

  return WithInstanceMap;
};

// class ViewportDispatcher extends WithClassInstanceMap(THREE.Object3D) {
//   customName: string;

//   constructor(customName: string) {
//     super();
//     this.customName = customName;
//   }
// }

// const vd1 = new ViewportDispatcher("QC01");
// const vd2 = new ViewportDispatcher("QC02");
// const _vd = ViewportDispatcher.classInstanceMap.get("default");

// console.log(vd1, vd2, _vd);
