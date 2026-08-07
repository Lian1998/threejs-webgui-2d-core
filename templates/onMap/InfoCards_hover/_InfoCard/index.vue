<template>
  <div class="gui-infocard-hover" :ref="(el: HTMLDivElement) => (infoCardRootElement = el)">
    <!-- 弹窗组件插件 -->
    <component :is="props.instanceComponent" :ref="(el: InfoCardDefaultSlot) => (defaultSlotRef = el)" />
  </div>
</template>

<script lang="ts" setup>
import "./index.scss";

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
const _fatherContainer = { left: 0.0, top: 0.0, width: 0.0, height: 0.0 };
const _elContainer = { width: 0.0, height: 0.0 };
const mouseMoveEvent = (e: MouseEvent) => {
  const { clientX: mouseX, clientY: mouseY } = e;
  if (!infoCardRootElement) return;

  let left = mouseX + _offset.x;
  let top = mouseY + _offset.y;

  // 如果右边放不下就放在左边
  if (left + _elContainer.width > _fatherContainer.left + _fatherContainer.width) {
    left = mouseX - _elContainer.width - _offset.x;
  }
  // 如果下边放不下 就放在上边
  if (top + _elContainer.height > _fatherContainer.top + _fatherContainer.height) {
    top = mouseY - _elContainer.height - _offset.y;
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

    ({ left: _fatherContainer.left, top: _fatherContainer.top, width: _fatherContainer.width, height: _fatherContainer.height } = fatherContainer.getBoundingClientRect()); // prettier-ignore
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

defineExpose({ openInfoCard, closeInfoCard } as InfoCardReference);
</script>
