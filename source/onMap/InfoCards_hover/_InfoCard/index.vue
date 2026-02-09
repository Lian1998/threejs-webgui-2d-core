<template>
  <div class="gui-infocard-hover" :ref="(el: HTMLDivElement) => (infoCardRootElement = el)">
    <!-- 弹窗组件插件 -->
    <component :is="props.instanceComponent" :ref="(el: InfoCardDefaultSlot) => (defaultSlotRef = el)" />
  </div>
</template>

<script lang="ts" setup>
import "./index.scss";

import { onUnmounted } from "vue";
import { useAttrs } from "vue";
import { onMounted } from "vue";
import { getCurrentInstance } from "vue";
import { debounce } from "lodash-es";

const { preWidth, preHeight } = useAttrs();

const props = defineProps({
  instanceComponent: Object,
});

let infoCardRootElement = undefined;
let defaultSlotRef = undefined;
let fatherContainer = undefined; // 弹窗注册到的父级容器
let isDebouncedActive = false;
let instanceExposed = undefined;

const _offset = { x: 5.0, y: 5.0 };
const _fatherContainer = { left: 0.0, top: 0.0, width: 0.0, height: 0.0 }; // gui-container
const _elContainer = { width: 0.0, height: 0.0 };
const mouseMoveEvent = (e: MouseEvent) => {
  const { clientX: mouseX, clientY: mouseY } = e; // 鼠标针对于window的移动
  if (!infoCardRootElement) return;

  let left = mouseX - _fatherContainer.left + _offset.x; // 实际在容器中的位置
  let top = mouseY - _fatherContainer.top + _offset.y;

  // 如果右边放不下就放在左边
  if (left + _elContainer.width > _fatherContainer.width) {
    left = left - _elContainer.width;
  }
  // 如果下边放不下 就放在上边
  if (top + _elContainer.height > _fatherContainer.height) {
    top = top - _elContainer.height;
  }

  infoCardRootElement.style.left = `${left}px`;
  infoCardRootElement.style.top = `${top}px`;
};

const _openInfoCard = debounce(
  (data: any, options: any) => {
    isDebouncedActive = false;

    // 显示弹窗
    infoCardRootElement.style.display = "block";

    // 触发回调
    if (defaultSlotRef) {
      if (defaultSlotRef.onOpenInfoCard) {
        defaultSlotRef.onOpenInfoCard(data, Object.assign(options, { rootElement: infoCardRootElement, infocardRef: instanceExposed }));
      }
    }

    // 在打开弹窗时计算一下当前Container的位置和宽高
    ({ left: _fatherContainer.left, top: _fatherContainer.top, width: _fatherContainer.width, height: _fatherContainer.height } = fatherContainer.getBoundingClientRect()); // prettier-ignore
    // 在打开弹窗时计算一下当前弹窗的宽高
    ({ width: _elContainer.width, height: _elContainer.height } = infoCardRootElement.getBoundingClientRect());
  },
  200,
  { trailing: true },
);

/** 打开弹窗回调 */
const openInfoCard = (data: any, options: any = {}) => {
  isDebouncedActive = true;
  _openInfoCard(data, options);
  window.addEventListener("mousemove", mouseMoveEvent); // 注册鼠标移动计算事件
};

/** 关闭弹窗回调 */
const closeInfoCard = () => {
  if (isDebouncedActive) {
    _openInfoCard.cancel();
    isDebouncedActive = false;
  }

  infoCardRootElement.style.display = "none"; // 隐藏弹窗
  window.removeEventListener("mousemove", mouseMoveEvent); // 解绑鼠标移动计算事件

  // 触发回调
  if (defaultSlotRef) {
    if (defaultSlotRef.onCloseInfoCard) {
      defaultSlotRef.onCloseInfoCard();
    }
  }
};

onMounted(() => {
  infoCardRootElement.style.display = "none";
  fatherContainer = infoCardRootElement.parentElement;
  instanceExposed = getCurrentInstance().exposed;

  _elContainer.width = preWidth as number;
  _elContainer.height = preHeight as number;
});

onUnmounted(() => {});

defineExpose({ openInfoCard, closeInfoCard } as InfoCardReference);
</script>
