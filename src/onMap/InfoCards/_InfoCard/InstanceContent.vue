<template>
  <component :is="component" ref="content" class="gui-infocard-container" />
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, provide, readonly, shallowRef, type Component } from "vue";
import { InfoCardContext, infoCardContextKey } from "./lifecycle";

defineProps<{ component: Component }>();
const content = shallowRef<InfoCardDefaultSlot>(); // 组件expose内容
const data = shallowRef<any>(); // 打开弹窗时的数据
const active = shallowRef(false);
const children = new Set<InfoCardDefaultSlot>(); // 子面板的回调实例集
const childGenerations = new Map<InfoCardDefaultSlot, number>();
let ready = false;
let currentOptions: InfoCardOpenOptions;
let generation = 0;
const close = () => {
  generation++;
  if (active.value) {
    active.value = false;
    ready = false;
    try {
      children.forEach((hooks) => {
        if (childGenerations.has(hooks)) hooks.onCloseInfoCard?.();
      });
      childGenerations.clear();
      content.value?.onCloseInfoCard?.();
    } finally {
      data.value = undefined;
    }
  }
};

/** 为子组件提供上下文 */
provide(infoCardContextKey, {
  data: readonly(data),
  active: readonly(active),
  register(hooks) {
    children.add(hooks); // 注册
    if (active.value)
      void nextTick(() => {
        if (active.value && ready && children.has(hooks)) void openChild(hooks, data.value, currentOptions, generation);
      });
    // 返回一个注销函数
    return () => {
      children.delete(hooks);
      if (childGenerations.delete(hooks)) hooks.onCloseInfoCard?.();
    };
  },
} satisfies InfoCardContext);

const openChild = async (hooks: InfoCardDefaultSlot, value: any, options: InfoCardOpenOptions, token: number) => {
  if (childGenerations.get(hooks) === token) return;
  childGenerations.set(hooks, token);
  await hooks.onOpenInfoCard?.(value, options);
};
const open = async (value: any, options: InfoCardOpenOptions) => {
  close();
  const token = ++generation;
  data.value = value;
  active.value = true;
  const openOptions = { ...options, isCurrent: () => active.value && generation === token };
  currentOptions = openOptions;
  try {
    if ((await content.value?.onOpenInfoCard?.(value, openOptions)) === true) {
      if (openOptions.isCurrent()) close();
      return true;
    }
    if (!active.value || generation !== token) return true;
    ready = true;
    for (const hooks of children) {
      await openChild(hooks, value, openOptions, token);
      if (!active.value || generation !== token) return true;
    }
    return false;
  } catch (error) {
    if (generation === token) close();
    throw error;
  }
};

onBeforeUnmount(close);

defineExpose({
  onOpenInfoCard: open,

  onCloseInfoCard: close,

  setTitle: () => content.value?.setTitle?.(),

  onResizeInfoCard: (size: { width: number; height: number }) => {
    content.value?.onResizeInfoCard?.(size);
    children.forEach((hooks) => hooks.onResizeInfoCard?.(size)); // 触发时触发所有注册的子组件的回调函数
  },
});
</script>
