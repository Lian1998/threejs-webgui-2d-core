<template>
  <div v-for="(element, index) of props.instanceCount" :ref="(el: HTMLDivElement) => (instanceMap.get(index).infoCardRootElement = el)" class="gui-infocard">
    <!-- 弹窗标头 -->
    <div class="gui-infocard-header">
      <div class="title">
        <template v-if="titleType(index) === 'string'">{{ titleRenderFunction(index) }}</template>
        <template v-else-if="titleType(index) === 'default'">
          <template v-if="slots.title">
            <slot name="title" />
          </template>
          <template v-else>{{ props.instanceTitle }}</template>
        </template>
        <template v-else-if="titleType(index) === 'renderFunction'">
          <component :is="titleRenderFunction(index)" />
        </template>
      </div>
      <div @click="closeInfoCard(index)" class="close-button">
        <!-- <SvgIcon name="mapui-close" /> -->
      </div>
    </div>

    <!-- 弹窗组件插件 -->
    <component :key="index" :is="props.instanceComponent" :ref="(el: InfoCardDefaultSlot) => (instanceMap.get(index).infoCardSlot = el)" />
  </div>
</template>

<script lang="ts" setup>
import "./index.scss";

// import { SvgIcon } from "@/components/Icon";

import type { Ref } from "vue";
import type { VNode } from "vue";
import { ref } from "vue";
import { getCurrentInstance } from "vue";
import { useSlots } from "vue";
import { computed } from "vue";
import { onMounted } from "vue";

import { context } from "./index";

const slots = useSlots();

const props = defineProps({
  instanceCount: { type: Number, default: 1 },
  instanceComponent: Object,
  instanceTitle: { type: String, default: "Default Title" },
  instanceKeyFilter: { type: Function, default: (data: any): string => data ?? "0" },
});

let fatherContainer = undefined; // 弹窗注册到的父级容器
let instanceIndex = 0; // 弹窗当前索引
let instanceKey = undefined; // 弹窗当前key
let instanceKeyMap = new Map<number, string>(); // `索引<=>key`
let instanceExposed = undefined;

// `索引<=>上下文`
const instanceMap = new Map<number, { infoCardRootElement: HTMLDivElement; infoCardSlot: InfoCardDefaultSlot; titleRenderFn: Ref<(() => VNode) | string> }>(); // prettier-ignore
for (let i = 0; i < props.instanceCount; i++) {
  instanceMap.set(i, { infoCardRootElement: undefined, infoCardSlot: undefined, titleRenderFn: ref() });
}

/** 计算当前实例的渲染头方式 */
const titleType = computed(() => (index: number): string => {
  const _value = instanceMap.get(index).titleRenderFn.value;
  if (typeof _value === "string") return "string";
  else if (_value === undefined) return "default";
  else return "renderFunction";
});

const titleRenderFunction = computed(() => (index: number) => {
  return instanceMap.get(index).titleRenderFn.value;
});

/** 设置当前弹窗key */
const setInfoCardKey = (_instanceKey: string) => {
  instanceKey = _instanceKey;
  let foundInstanceIndex = undefined; // 从 `索引<=>key` 中尝试寻找弹窗索引
  if (!_instanceKey) return;
  for (const [_instanceIndex, __instanceKey] of instanceKeyMap) {
    if (foundInstanceIndex !== undefined) continue;
    if (__instanceKey === _instanceKey) foundInstanceIndex = _instanceIndex;
  }

  // 如果能找到key对应的索引, 那么设置当前索引为找到的索引
  if (foundInstanceIndex !== undefined) instanceIndex = foundInstanceIndex;
  // 如果无法找到, 那么优先找没有被绑定的索引, 如果不存在没有被绑定的索引则正常轮转到下一个索引
  else {
    let foundInstanceIndex1 = undefined;
    for (let i = 0; i < props.instanceCount; i++) {
      if (foundInstanceIndex1 !== undefined) continue;
      if (!instanceKeyMap.get(i)) foundInstanceIndex1 = i;
    }
    if (foundInstanceIndex1 !== undefined) instanceIndex = foundInstanceIndex1;
    else instanceIndex = (instanceIndex + 1) % props.instanceCount;
  }
};

/** 弹窗回调 */
const openInfoCard = async (data: any, options: any = {}) => {
  setInfoCardKey(props.instanceKeyFilter(data));

  const instance = instanceMap.get(instanceIndex); // 获取当前索引对应的上下文
  const infoCardRootElement: HTMLDivElement = instance.infoCardRootElement;
  const isOpened = infoCardRootElement.classList.contains("active"); // 是否在调用API时弹窗已经是开启了的

  // 更改 z-index
  const contextNo = context.no;
  if (!infoCardRootElement.style.zIndex) infoCardRootElement.style.zIndex = contextNo.toString(); // 根据当前弹窗编号改zIndex
  const elementContextNo = parseInt(infoCardRootElement.style.zIndex);
  if (infoCardRootElement !== context.lastElement) {
    if (elementContextNo <= contextNo) {
      context.no = contextNo + 1;
      infoCardRootElement.style.zIndex = contextNo.toString(); // 根据当前弹窗编号改zIndex
    }
  }

  // 触发回调函数
  const infoCardSlot = instance.infoCardSlot; // 找到当前使用的组件
  if (infoCardSlot.onOpenInfoCard) {
    // 触发一下注册到其中的插槽组件的 onOpenInfoCard 回调函数
    const onOpenInfoCardResult = await infoCardSlot.onOpenInfoCard(data, Object.assign(options, { rootElement: infoCardRootElement, infocardRef: instanceExposed, instanceIndex }));
    if (onOpenInfoCardResult === true) return; // 是否阻塞打弹窗
  }

  // 更新一下注册到其中的插槽组件的 setTitle 回调函数
  instance.titleRenderFn.value = undefined;
  if (infoCardSlot.setTitle) instance.titleRenderFn.value = infoCardSlot.setTitle();

  // 打开弹窗
  infoCardRootElement.classList.add("active");

  // 重新定位
  const { width: window_width, height: window_height } = fatherContainer.getBoundingClientRect(); // 计算视口包围盒

  // // 定位方式一: 每次打开弹窗以上一次打开位置为基准
  // const leftAnchor = (window_width / 5) * 3; // 默认位置固定在屏幕 五分之三位置
  // const elementOffsetStep = 5;
  // const elementOffset = (context.no % 5) * elementOffsetStep; // 新打开窗口在 0 ~ 25 px 抖动
  // let leftFactor = leftAnchor + elementOffset;
  // const { left: e_left, width: e_width } = infoCardRootElement.getBoundingClientRect();
  // // 如果打开过窗口, 那么使用之前打开过的定位作为基础
  // if (e_left) leftFactor = e_left + elementOffsetStep;
  // // 每次触发打开弹窗时, 计算弹窗是否超出viewport视野, 如果超出了, 就居中+offset
  // if (leftFactor + e_width > window_width) leftFactor = (window_width >> 1) - (e_width >> 1) + elementOffset;
  // infoCardRootElement.style.left = leftFactor + "px";

  // 定位方式二: 如果调用函数前就是开启的弹窗, 那么不修改其位置只改变zindex; 如果调用前是关闭的弹窗, 那么修改其位置到屏幕最右边
  if (!isOpened) {
    const { width: e_width } = infoCardRootElement.getBoundingClientRect();
    infoCardRootElement.style.left = window_width - e_width - 10 + "px";
  }

  instanceKeyMap.set(instanceIndex, instanceKey); // 绑定弹窗上下文索引和弹窗key
  instanceIndex = (instanceIndex + 1) % props.instanceCount;
  context.lastElement = infoCardRootElement;
};

/** 关闭弹窗 */
const closeInfoCard = (_instanceIndex: number = 0) => {
  const instance = instanceMap.get(_instanceIndex); // 获取当前索引对应的上下文
  const infoCardRootElement = instance.infoCardRootElement;
  if (!infoCardRootElement) return;
  infoCardRootElement.classList.remove("active");

  const infoCardSlot = instance.infoCardSlot;
  if (infoCardSlot) {
    if (infoCardSlot.onCloseInfoCard) {
      infoCardSlot.onCloseInfoCard();
    }
  }

  instanceKeyMap.delete(_instanceIndex);
};

defineExpose({ openInfoCard, closeInfoCard } as InfoCardReference);

onMounted(() => {
  for (let i = 0; i < props.instanceCount; i++) {
    const infoCardRootElement = instanceMap.get(i).infoCardRootElement;
    if (!infoCardRootElement) return;
    fatherContainer = infoCardRootElement.parentElement;

    // 获取InfoCard头 为InfoCard头绑定鼠标按下事件
    try {
      const headerElement: HTMLDivElement = infoCardRootElement.firstElementChild as HTMLDivElement;
      headerElement["callback_mousedown"] = (mousedownEvent: MouseEvent) => {
        if (!infoCardRootElement) return;
        if (context.lastElement !== infoCardRootElement) {
          context.no = context.no + 1;
          infoCardRootElement.style.zIndex = context.no.toString();
          context.lastElement = infoCardRootElement;
        }

        // 获取到盒子右侧和底部可以移动到的最值
        const moveBoundX = window.innerWidth;
        const moveBoundY = window.innerHeight;

        // 获取到盒子计算完成后的宽高
        const { left: e_left, top: e_top, width: e_width, height: e_height } = infoCardRootElement.getBoundingClientRect();
        const { left: window_left, top: window_top, width: window_width, height: window_height } = fatherContainer.getBoundingClientRect();
        const { left: header_left, top: header_top, width: header_width, height: header_height } = headerElement.getBoundingClientRect();

        // 鼠标点下的位置
        const click_x = mousedownEvent.clientX;
        const click_y = mousedownEvent.clientY;

        // 当前弹窗的位置
        const style_left = e_left - window_left;
        const style_top = e_top - window_top;

        // 鼠标移动事件
        const move = (mouseMoveEvent: MouseEvent) => {
          let movementX = mouseMoveEvent.clientX - click_x;
          let movementY = mouseMoveEvent.clientY - click_y;

          // 保证头元素不被完全移出视窗

          // 左边
          if (header_left + header_width + movementX < window_left + 100) movementX = window_left + 100 - (header_left + header_width);
          // 右边
          else if (header_left + movementX > window_left + window_width - 100) movementX = window_left + window_width - 100 - header_left;
          // 上边
          if (header_top + header_height + movementY < window_top + 55) movementY = window_top + 55 - (header_top + header_height);
          // 下边
          else if (header_top + movementY > window_top + window_height - 55) movementY = window_top + window_height - 55 - header_top;

          infoCardRootElement.style.left = style_left + movementX + "px";
          infoCardRootElement.style.top = style_top + movementY + "px";
        };

        // 监听鼠标移动事件
        document.addEventListener("mousemove", move);

        // 在鼠标抬起时去移除移动事件
        document.addEventListener("mouseup", () => {
          document.removeEventListener("mousemove", move);
        });
      };
      headerElement.addEventListener("mousedown", headerElement["callback_mousedown"]);
    } catch (err) {}

    // 获取InfoCard盒子 为其添加上类名 gui-infocard-container
    try {
      const containerElement: HTMLDivElement = infoCardRootElement.lastElementChild as HTMLDivElement;
      const originClass = containerElement.className;
      containerElement.className = `gui-infocard-container ${originClass}`.trim();
    } catch (err) {}
  }

  instanceExposed = getCurrentInstance().exposed;
});
</script>
