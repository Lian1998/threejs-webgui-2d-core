<template>
  <div ref="domRef" class="sider-components">
    <div class="sider-copmonents-control" @click="toogleSiderComponent">
      <SvgIcon size="25" name="mapui-siderleft" />
    </div>
    <slot v-if="slots.title" name="title"></slot>
    <slot v-if="slots.content" name="content"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";

const slots = defineSlots();

const domRef = ref(undefined);

const toogleSiderComponent = () => {
  const domEl = domRef.value;
  if (!domEl) return;
  domEl.classList.toggle("inactive");
};
</script>

<style lang="scss">
#gui-container {
  .sider-components {
    pointer-events: auto;
    width: 95%;
    padding: 2.5%;
    position: relative;
    border-radius: 10px;
    background-color: var(--ui-background);
    transform: translateX(0%);
    transition: transform 0.4s;

    .sider-copmonents-control {
      cursor: pointer;
      position: absolute;
      top: 50%;
      left: calc(100% - 25px);
      background-color: var(--ui-background);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      transform: translateY(-25px) scaleX(1);
      opacity: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition-property: transform, opacity;
      transition-duration: 0.3s;

      svg {
        fill: var(--ui-font);
      }
    }

    .sider-copmonents-control:hover {
      box-shadow: var(--ui-shadow);
    }

    .title {
      width: 95%;
      color: var(--ui-font);
      font-weight: bold;
      font-size: 1.1rem;
      padding: 10px 2.5%;
      border-bottom: 1px solid var(--ui-font);
    }

    .a-echarts {
      width: 100%;
      flex-grow: 1;
    }
  }

  .sider-components.inactive {
    transform: translateX(-100%);

    .sider-copmonents-control {
      transform: translateY(-25px) scaleX(-1);
    }
  }
}

// 分大屏模式, 模式1不显示
#gui-container[mode="0"] {
  .sider-components {
    .sider-copmonents-control {
      opacity: 0;
    }
  }
}

// 分左右
#gui-container {
  #gui-sider-right {
    .sider-components {
      .sider-copmonents-control {
        left: calc(0% - 25px);
        transform: translateY(-25px) scaleX(-1);
      }
    }

    .sider-components.inactive {
      transform: translateX(100%);

      .sider-copmonents-control {
        transform: translateY(-25px) scaleX(1);
      }
    }
  }
}
</style>
