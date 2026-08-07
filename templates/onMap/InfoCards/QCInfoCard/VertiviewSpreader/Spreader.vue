<template>
  <div class="vertiview-spreader">
    <div class="icon">
      <a-tooltip v-if="attrs.platformLockName">
        <template #title> {{ attrs.platformLockName }} </template>
        <template #default>
          <div>
            <SvgIcon :color="lockColor" size="18" name="mapui-padstatus" />
          </div>
        </template>
      </a-tooltip>
    </div>
    <div class="containeris">
      <div class="containeri containeri20" ref="container201Ref">
        <div class="door"></div>
      </div>
      <div class="containeri containeri20" ref="container202Ref">
        <div class="door"></div>
      </div>
      <div class="containeri containeri40" ref="container401Ref">
        <div class="door"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { computed } from "vue";
import { onMounted } from "vue";
import { useAttrs } from "vue";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { Tooltip as ATooltip } from "ant-design-vue";
import { getAccValue } from "@2dmapv2/classes/DataHelper";
import { setStyleByMoveKind } from "@2dmapv2/inMap/projectUtils";

type QcContainerResponse = {
  name: "PT_L" | "PT_R" | "MT_WS_L" | "MT_WS_R" | "MT_LS_L" | "MT_LS_R" | "PF_LS_L" | "PF_LS_R" | "PF_WS_L" | "PF_WS_R";
  value: Partial<{
    containerHeightCm: number; // 259;
    containerId: string; // "cid179423258";
    containerLengthCm: number; // 610;
    containerPosition: string; // "中间";
    containerSize: number; // "20";
    containerType: string; // "干货箱";
    containerWeightKg: number; // 20061;
    doorDirection: string; // "高桩";
    moveKind: string; // "卸船";
    moveStage: string; // "作业中";
    pointOfWork: string; // "QC082";
    qcId: string; // "QC082";
  }>;
}[];

const attrs = useAttrs();
const container201Ref = ref(null);
const container202Ref = ref(null);
const container401Ref = ref(null);

onMounted(() => {
  container201Ref.value.style.display = "none";
  container202Ref.value.style.display = "none";
  container401Ref.value.style.display = "none";
});

const updateQcContainers = (response: QcContainerResponse) => {
  const name = attrs.name;
  const leftKey = `${name}_L`;
  const rightKey = `${name}_R`;
  const leftResponse = response.find((item) => item.name === leftKey);
  const rightResponse = response.find((item) => item.name === rightKey);

  const container201El = container201Ref.value;
  const container202El = container202Ref.value;
  const container401El = container401Ref.value;
  const container201DoorEl = container201El.childNodes[0];
  const container202DoorEl = container202El.childNodes[0];
  const container401DoorEl = container401El.childNodes[0];
  container201El.style.display = "none";
  container202El.style.display = "none";
  container401El.style.display = "none";
  container201DoorEl.style.display = "none";
  container202DoorEl.style.display = "none";
  container401DoorEl.style.display = "none";

  // 单20
  if (getAccValue(leftResponse, "value", "containerSize") == 20) {
    container201El.style.display = "block";
    containerColorSetting(container201El, getAccValue(leftResponse, "value", "moveKind"));
    containerDoorSetting(container201DoorEl, getAccValue(leftResponse, "value", "doorDirection"));

    // 双20
    if (getAccValue(rightResponse, "value", "containerSize") == 20) {
      container202El.style.display = "block";
      containerColorSetting(container202El, getAccValue(rightResponse, "value", "moveKind"));
      containerDoorSetting(container202DoorEl, getAccValue(rightResponse, "value", "doorDirection"));
    }
  }

  // 单40
  else if (getAccValue(leftResponse, "value", "containerSize") > 20) {
    container401El.style.display = "block";
    containerColorSetting(container401El, getAccValue(leftResponse, "value", "moveKind"));
    containerDoorSetting(container401DoorEl, getAccValue(leftResponse, "value", "doorDirection"));
  }
};

/** 通过任务类型设置元素 */
const containerColorSetting = (containerEl: HTMLDivElement, moveKind: string) => {
  const { colorString, colorStringDarken } = setStyleByMoveKind(moveKind);
  containerEl.style.backgroundColor = colorString;
  containerEl.style.border = `1px solid ${colorStringDarken}`;
};

/** 通过箱门方向高低桩设置元素 */
const containerDoorSetting = (containerDoorEl: HTMLDivElement, doorDirection: "高桩" | "低桩") => {
  if (doorDirection === "高桩") {
    containerDoorEl.style.display = "block";
    containerDoorEl.style.top = "0";
    containerDoorEl.style.transform = "translateY(-50%)";
  } else if (doorDirection === "低桩") {
    containerDoorEl.style.display = "block";
    containerDoorEl.style.top = "100%";
    containerDoorEl.style.transform = "translateY(-50%)";
  }
};

const updatePlatformLocks = (name: string, value: string) => {
  if (name === attrs.name) {
    lockStatus.value = value;
  }
};

const lockStatus = ref<string>("grey");
const lockColor = computed(() => {
  if (lockStatus.value === "green") return "#00FF00";
  else if (lockStatus.value === "red") return "#FF0000";
  return "#D6D3D1";
});

defineExpose({ updateQcContainers, updatePlatformLocks });
</script>

<style lang="scss">
.vertiview-spreader {
  display: flex;
  flex-direction: column;

  .icon {
    width: 100%;
    height: 18px;
    padding-bottom: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .containeris {
    width: 100%;
    flex-grow: 1;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    flex-direction: column;
    background-color: var(--overlay-background-darker);
    border: 1.5px dashed #c0c0c0;
    box-sizing: border-box;
    position: relative;
    width: 60px;

    .containeri {
      position: relative;
      width: 52px;
      background-color: #0100fd;

      .door {
        position: absolute;
        width: 100%;
        height: 5px;
        background-color: #ff8e00;
      }
    }

    .containeri20 {
      height: 80px;
    }

    .containeri40 {
      height: 160px;
    }
  }
}
</style>
