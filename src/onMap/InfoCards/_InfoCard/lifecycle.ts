// 此代码模块用于给用户自定义的内部组件(如IGVInfoCard)中快速获取其父组件_InfoCard提供的上下文
// _InfoCard会Provide下面InfoCardContext类型的上下文数据

import { inject, onBeforeUnmount, type InjectionKey, type ShallowRef } from "vue";

/** 弹窗为子组件提供的上下文 */
export interface InfoCardContext {
  /** 打开弹窗实例时传输的数据(只读) */
  data: Readonly<ShallowRef<any>>;

  /** 弹窗实例的状态(只读) */
  active: Readonly<ShallowRef<boolean>>;

  /** 用于注册子组件的上下文的函数, 返回值是一个注销函数 */
  register: (hooks: InfoCardDefaultSlot) => () => void;
}
export const infoCardContextKey: InjectionKey<InfoCardContext> = Symbol("InfoCardContext");

/** 子组件取得当前弹窗的数据(以弹窗实例为单位拥有独立上下文) */
export function useInfoCardContext() {
  const context = inject(infoCardContextKey); // 获取inject的数据
  if (!context) throw new Error("组件必须位于 InfoCard 内");
  return context;
}

/** hook注册子组件的的生命周期(动态挂载的面板也会收到当前打开事件) */
export function useInfoCardLifecycle(hooks: InfoCardDefaultSlot) {
  const unregister = useInfoCardContext().register(hooks); // 注册子组件生命周期, 得到注销函数
  onBeforeUnmount(unregister); // 注册onBeforeUnmount当子组件被回收时触发注销函数
  return hooks;
}
