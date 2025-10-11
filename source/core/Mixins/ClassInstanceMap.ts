type Constructor<T = object> = abstract new (...args: any[]) => T;

/**
 * Mixin这个函数类型会使类型下拥有一个静态属性用于记录当前类生成的所有实例
 * ```javascript
 * import * as THREE from "three";
 * class ViewportDispatcher extends WithClassInstanceMap(THREE.Object3D) {
 *   customName: string;
 *   constructor(customName: string) {
 *     super();
 *     this.customName = customName;
 *   }
 * }
 * const vd1 = new ViewportDispatcher("QC01");
 * const vd2 = new ViewportDispatcher("QC02");
 * const _vd = ViewportDispatcher.classInstanceMap.get("default");
 *
 * console.log(ViewportDispatcher.classInstanceMap.get(0)["customName"], vd1 === _vd); // "QC01", true
 * console.log(ViewportDispatcher.classInstanceMap.get(1)["customName"]); // "QC02"
 * ```
 * **注意: 此混合函数导致实例无法回收, 不要用此函数混合一些需要不断回收实例的类**
 * @param {Function} Base 类
 * @returns
 */
export const WithClassInstanceMap = <TBase extends Constructor>(Base: TBase) => {
  abstract class WithInstanceMap extends Base {
    static sequence = 1;
    static classInstanceMap: Map<any | "default", WithInstanceMap> = new Map();

    constructor(...args: any[]) {
      super(...args);

      const ctor = this.constructor as typeof Base & {
        sequence: number;
        classInstanceMap: Map<any | "default", WithInstanceMap>;
      };

      //
      const instance = this as unknown as ThisType<WithInstanceMap>;
      if (!ctor.classInstanceMap.has("default")) {
        ctor.classInstanceMap.set("default", instance);
        ctor.classInstanceMap.set(0, instance);
      } else {
        ctor.classInstanceMap.set(ctor.sequence, instance);
        ctor.sequence++;
      }
    }
  }

  return WithInstanceMap;
};
