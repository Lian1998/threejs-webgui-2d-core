<template>
  <!-- 点击弹窗内部时放到最前面展示 -->
  <div v-for="(_, index) in instances.length" :key="index" :ref="(el) => (instances[index].element = el as HTMLDivElement)" class="gui-infocard" @pointerdown="bringToFront(index)">
    <!-- 点击弹窗的header时触发拖拽 -->
    <div class="gui-infocard-header" @pointerdown="startDrag($event, index)">
      <div class="title">
        <!-- 如果setTitile传递的是一个渲染函数 -->
        <component v-if="typeof instances[index].title.value === 'function'" :is="instances[index].title.value" />
        <!-- 如果setTtitle没有传递内容, 那么从尝试openInfoCard传递的data找到标题 -->
        <slot v-else-if="instances[index].title.value === undefined" name="title">{{ instanceTitle }}</slot>
        <!-- 直接展示setTitle的传递内容 -->
        <template v-else>{{ instances[index].title.value }}</template>
      </div>
      <button class="close-button" aria-label="关闭弹窗" @pointerdown.stop @click="closeInfoCard(index)">
        <CloseOutlined />
      </button>
    </div>

    <!-- 渲染弹窗内容 -->
    <div class="gui-infocard-body">
      <!-- 渲染注册的组件 -->
      <InstanceContent :ref="(el) => (instances[index].content = el as InfoCardDefaultSlot)" :component="instanceComponent" />
    </div>

    <!-- 右下角挂载拖拽弹窗大小的组件 -->
    <div v-if="resizable" class="gui-infocard-resizer" role="separator" aria-label="调整弹窗大小" @pointerdown.stop="startResize($event, index)" />
  </div>
</template>
<script setup lang="ts">
import "./index.scss";
import { onBeforeUnmount, shallowRef, type Component } from "vue";
import InstanceContent from "./InstanceContent.vue";
import { context } from "./index";

const props = withDefaults(
  defineProps<{
    /** 实例数量 */
    instanceCount?: number;

    /** 实例组件 */
    instanceComponent?: Component;

    /** 实例标题(字符串时) */
    instanceTitle?: string;

    /** 实例传值过滤函数 */
    instanceKeyFilter?: (data: any) => string;

    /** 是否支持拖拽 */
    resizable?: boolean;

    /** 最小宽度 */
    minWidth?: number;

    /** 最小高度 */
    minHeight?: number;
  }>(),
  {
    instanceCount: 1,
    instanceTitle: "弹窗默认标题",
    instanceKeyFilter: (data: any) => data ?? "0",
    resizable: true,
    minWidth: 320,
    minHeight: 180,
  },
);

// 给每个实例生成闭包对象, 用于控制状态
const instances = Array.from({ length: Math.max(1, props.instanceCount) }, () => ({
  /** 组件的key(通过打开弹窗时传输的data和props.instanceKeyFilter共同决定) */
  key: undefined as any,

  /** 弹窗的根节点 */
  element: undefined as HTMLDivElement,

  title: shallowRef<any>(),
  opened: false,
  version: 0,

  /** 用户手动注册的组件中expose出来的生命周期函数回调 */
  content: undefined as InfoCardDefaultSlot,
}));
let cursor = 0;
let stopInteraction = () => {};

/** 变更zIndex让当前点击的弹窗到最前面 */
const bringToFront = (index: number) => {
  const element = instances[index].element;
  if (element && context.lastElement !== element) {
    element.style.zIndex = String(++context.no);
    context.lastElement = element;
  }
};

/** 关闭弹窗 */
const closeInfoCard = (index = 0) => {
  const instance = instances[index];
  if (!instance) return;
  instance.version++;
  instance.opened = false;
  instance.key = undefined;
  instance.element?.classList.remove("active");
  instance.content?.onCloseInfoCard?.(); // 执行用户手动定义的回调函数
  stopInteraction();
};

/** 打开弹窗 */
async function openInfoCard(data?: any, options: InfoCardOpenOptions = {}) {
  const key = props.instanceKeyFilter(data);
  let index = instances.findIndex((instance) => instance.key === key && instance.opened);
  if (index < 0) index = instances.findIndex((instance) => !instance.opened);
  if (index < 0) index = cursor;
  const instance = instances[index];
  const element = instance.element;
  if (!element) return;
  const wasOpen = instance.opened;
  // 立即保留实例 避免异步打开时多个请求抢占同一空闲窗口
  instance.key = key;
  instance.opened = true;
  const version = ++instance.version;
  cursor = (index + 1) % instances.length;
  bringToFront(index);
  try {
    const blocked = await instance.content?.onOpenInfoCard?.(data, {
      ...options,
      rootElement: element,
      infocardRef: api,
      instanceIndex: index,
    });
    if (instance.version !== version) return;
    if (blocked === true) {
      closeInfoCard(index);
      return;
    }
    instance.title.value = instance.content?.setTitle?.();
    element.classList.add("active");
    if (!wasOpen) {
      const parent = element.parentElement.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      element.style.left = `${Math.max(0, parent.width - rect.width - 10)}px`;
      element.style.top = `${Math.max(0, Math.min(80, parent.height - 45))}px`;
    }
  } catch (error) {
    if (instance.version === version) closeInfoCard(index);
    throw error;
  }
}

const api: InfoCardReference = { openInfoCard, closeInfoCard };

function interact(event: PointerEvent, move: (event: PointerEvent) => void) {
  if (event.button !== 0) return;
  event.preventDefault();
  stopInteraction();
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    window.removeEventListener("blur", stop);
  };
  stopInteraction = stop;
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
  window.addEventListener("blur", stop);
}
function startDrag(event: PointerEvent, index: number) {
  const element = instances[index].element;
  const rect = element.getBoundingClientRect();
  const parent = element.parentElement.getBoundingClientRect();
  interact(event, (move) => {
    element.style.left = `${Math.max(100 - rect.width, Math.min(parent.width - 100, rect.left - parent.left + move.clientX - event.clientX))}px`;
    element.style.top = `${Math.max(0, Math.min(parent.height - 45, rect.top - parent.top + move.clientY - event.clientY))}px`;
  });
}
function startResize(event: PointerEvent, index: number) {
  const instance = instances[index];
  const element = instance.element;
  const rect = element.getBoundingClientRect();
  const parent = element.parentElement.getBoundingClientRect();
  interact(event, (move) => {
    const maxWidth = Math.max(100, parent.right - rect.left);
    const maxHeight = Math.max(100, parent.bottom - rect.top);
    const width = Math.min(maxWidth, Math.max(props.minWidth, rect.width + move.clientX - event.clientX));
    const height = Math.min(maxHeight, Math.max(props.minHeight, rect.height + move.clientY - event.clientY));
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.classList.add("resized");
    instance.content?.onResizeInfoCard?.({ width, height });
  });
}
onBeforeUnmount(() => {
  instances.forEach((_, index) => closeInfoCard(index));
  stopInteraction();
  if (instances.some((instance) => instance.element === context.lastElement)) context.lastElement = undefined;
});
defineExpose(api);
</script>
