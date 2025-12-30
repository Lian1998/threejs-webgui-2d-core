type Constructor<T = {}> = abstract new (...args: any[]) => T;

/**
 * Mixin这个函数, 使类拥有一个静态属性用于记录其生成的所有实例(Map中数字代表按生成实例顺序进行排序的实例, 其中'default'和数字0代表第一个实例)
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
    private static sequence = 1;
    private static classInstanceMap: Map<any, WithInstanceMap> = new Map();

    constructor(...args: any[]) {
      super(...args);

      const ctor = this.constructor as TBase & {
        sequence: number;
        classInstanceMap: Map<any, WithInstanceMap>;
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

    static getClassInstance<T>(key: any) {
      return this.classInstanceMap.get(key) as T;
    }
  }

  return WithInstanceMap;
};
