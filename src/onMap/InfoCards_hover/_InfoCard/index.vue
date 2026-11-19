<template>
  <div ref="infoCardRootElement" class="gui-infocard-hover" style="display: none">
    <InstanceContent ref="defaultSlotRef" :component="props.instanceComponent" />
  </div>
</template>

<script lang="ts" setup>
import "./index.scss";
import InstanceContent from "../../InfoCards/_InfoCard/InstanceContent.vue";
import { nextTick, onBeforeUnmount, onMounted, shallowRef, type Component } from "vue";
import { debounce } from "lodash-es";

const props = defineProps<{ instanceComponent: Component }>();
const infoCardRootElement = shallowRef<HTMLDivElement>();
const defaultSlotRef = shallowRef<InfoCardDefaultSlot>();
let pointer: { clientX: number; clientY: number } | undefined;
let generation = 0;
let ready = false;
let resizeObserver: ResizeObserver | undefined;

const positionInfoCard = () => {
  const element = infoCardRootElement.value;
  const parent = element?.offsetParent as HTMLElement | null;
  if (!ready || !element || !parent || !pointer) return;

  const bounds = parent.getBoundingClientRect();
  const { width, height } = element.getBoundingClientRect();
  const x = pointer.clientX - bounds.left - parent.clientLeft;
  const y = pointer.clientY - bounds.top - parent.clientTop;
  const offset = 5;
  let left = x + offset;
  let top = y + offset;
  if (left + width > parent.clientWidth) left = x - width - offset;
  if (top + height > parent.clientHeight) top = y - height - offset;
  left = Math.max(0, Math.min(left, parent.clientWidth - width));
  top = Math.max(0, Math.min(top, parent.clientHeight - height));
  element.style.left = `${left + parent.scrollLeft}px`;
  element.style.top = `${top + parent.scrollTop}px`;
  element.style.visibility = "visible";
};

const mouseMoveEvent = (event: MouseEvent) => {
  pointer = { clientX: event.clientX, clientY: event.clientY };
  positionInfoCard();
};

const _openInfoCard = debounce(async (data: any, options: InfoCardOpenOptions, token: number) => {
  const element = infoCardRootElement.value;
  if (!element || token !== generation) return;
  const blocked = await defaultSlotRef.value?.onOpenInfoCard?.(data, {
    ...options,
    rootElement: element,
    infocardRef: api,
  });
  if (token !== generation) return;
  if (blocked) {
    closeInfoCard();
    return;
  }
  // 等待内容更新后测量；定位完成前保持不可见，避免首次显示在默认位置。
  await nextTick();
  if (token !== generation) return;
  element.style.display = "block";
  ready = true;
  positionInfoCard();
}, 200);

/** 支持通过 options.pointer 显式指定初始指针坐标。 */
const openInfoCard = (data: any, options: InfoCardOpenOptions = {}) => {
  closeInfoCard();
  if (options.pointer) pointer = { clientX: options.pointer.clientX, clientY: options.pointer.clientY };
  _openInfoCard(data, options, generation);
};

const closeInfoCard = () => {
  generation++;
  ready = false;
  _openInfoCard.cancel();
  const element = infoCardRootElement.value;
  if (element) {
    element.style.display = "none";
    element.style.visibility = "hidden";
  }
  defaultSlotRef.value?.onCloseInfoCard?.();
};

const api: InfoCardReference = { openInfoCard, closeInfoCard };
onMounted(() => {
  // 捕获阶段记录本次指针，早于地图的 movein 回调，包括进入项目后的第一次悬浮。
  window.addEventListener("pointermove", mouseMoveEvent, true);
  window.addEventListener("mousemove", mouseMoveEvent, true);
  resizeObserver = new ResizeObserver(positionInfoCard);
  resizeObserver.observe(infoCardRootElement.value);
  if (infoCardRootElement.value.parentElement) resizeObserver.observe(infoCardRootElement.value.parentElement);
});
onBeforeUnmount(() => {
  closeInfoCard();
  window.removeEventListener("pointermove", mouseMoveEvent, true);
  window.removeEventListener("mousemove", mouseMoveEvent, true);
  resizeObserver?.disconnect();
});

defineExpose(api);
</script>
