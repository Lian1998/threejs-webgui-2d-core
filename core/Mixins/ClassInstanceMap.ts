type Constructor<T = {}> = abstract new (...args: any[]) => T;

/**
 * (Mixin)使得类型拥有跟踪记录自己所生成过的实例的能力, **用例:**
 * ```javascript
 * class Person extends WithClassInstanceMap(Object) {
 *   name: string = "";
 *   constructor(name: string) {
 *     super();
 *     this.name = name;
 *   }
 * }
 *
 * const p1 = new Person("张三");
 * const p2 = new Person("李四");
 * const p3 = new Person("王五");
 *
 * console.log(p1.getSequence()); // 0
 * console.log(p1.unregisterClassInstanceMap()); // undefined
 * console.log(Person.getClassInstance(0)); // undefined
 * console.log(Person.getClassInstance(2)); // 王五
 * ```
 * @param {Function} Base 类
 * @returns
 */
export const WithClassInstanceMap = <TBase extends Constructor>(Base: TBase) => {
  abstract class WithInstanceMap extends Base {
    private static sequence = 0; // WithInstanceMap域, 该类型所有实例的递增序列
    static classInstanceMap: Map<number, WithInstanceMap> = new Map(); // 该类型的所有实例数组
    private _sequence = -1; // 记录当前实例在类型实例数组中的序列

    constructor(...args: any[]) {
      super(...args);

      const ctor = this.constructor as TBase & {
        sequence: number;
        classInstanceMap: Map<number, WithInstanceMap>;
      };

      const s = WithInstanceMap.sequence++;
      this._sequence = s;
      Object.defineProperty(this, "_sequence", { writable: false, enumerable: false });
      const instance = this as unknown as WithInstanceMap;
      ctor.classInstanceMap.set(s, instance);
    }

    /**
     * 从类型中获取其第x个序列的实例
     * @param sequence 序列号
     * @returns
     */
    static getClassInstance<T>(sequence: number = 0) {
      return this.classInstanceMap.get(sequence) as T;
    }

    /**
     * 获取传入实例在类型实例数组中的序列号
     * @param instance 实例
     * @returns 序列号
     */
    static getSequence(instance: WithInstanceMap): number {
      return instance._sequence;
    }

    /**
     * 获取当前实例在类型实例数组中的序列号
     * @returns 序列号
     */
    getSequence(): number {
      return this._sequence;
    }

    /**
     * 清理当前实例在 classInstanceMap 上的索引 (回收)
     * @returns
     */
    unregisterClassInstanceMap() {
      const ctor = this.constructor as TBase & {
        classInstanceMap: Map<number, WithInstanceMap>;
      };
      if (this._sequence < 0) return;
      ctor.classInstanceMap.delete(this._sequence);

      Object.defineProperty(this, "_sequence", { writable: true, enumerable: false });
      this._sequence = -1;
    }

    /** 清理当前类所有实例索引，通常用于调试重置。 */
    static clearClassInstanceMap() {
      this.classInstanceMap.clear();
      this.sequence = 0;
    }
  }

  return WithInstanceMap;
};
