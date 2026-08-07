<template>
  <div class="tab-container">
    <a-card title="控制">
      <div class="switch-control" @click="switchEnableIGVE">
        <span class="switch-control-label-left">移出车队</span>
        <a-switch size="small" v-model:checked="switchEnableIGV" />
        <span class="switch-control-label-right">加入车队</span>
      </div>
      <div class="switch-control" @click="switchPauseStatusE" v-show="switchEnableIGV">
        <span class="switch-control-label-left">取消暂停</span>
        <a-switch size="small" v-model:checked="switchPauseStatus" />
        <span class="switch-control-label-right">暂停IGV</span>
      </div>
      <div class="switch-control" @click="switchControlModeE" v-show="switchEnableIGV">
        <span class="switch-control-label-left">自动模式</span>
        <a-switch size="small" v-model:checked="switchControlMode" />
        <span class="switch-control-label-right">人工介入</span>
      </div>
      <div class="switch-control" @click="switchAvl4tosE" v-show="switchEnableIGV">
        <span class="switch-control-label-left">不可调度</span>
        <a-switch size="small" v-model:checked="switchAvl4tos" />
        <span class="switch-control-label-right">可被调度</span>
      </div>
      <div class="button-control" type-child="first" v-show="switchEnableIGV">
        <a-button @click="cancelJob_MANUAL(idRef.value)">终止人工任务</a-button>
        <a-button @click="cancelJob_TOS(idRef.value)">终止TOS任务</a-button>
      </div>
      <div class="button-control" v-show="switchEnableIGV">
        <a-button @click="resetFault(idRef.value)">复位故障</a-button>
        <a-button @click="resend(idRef.value)">重发</a-button>
      </div>
      <div class="button-control" v-show="switchEnableIGV">
        <a-button @click="resetCommand(idRef.value)">复位指令</a-button>
        <a-button @click="resetCommand_Force(idRef.value)">强制复位指令</a-button>
      </div>
      <div class="button-control" v-show="switchEnableIGV">
        <a-button @click="cleanRoutes(idRef.value)">清除路径</a-button>
      </div>
      <div class="button-control" v-show="switchEnableIGV">
        <a-button @click="removeAHTSForce(idRef.value)">强制移除车队</a-button>
      </div>
    </a-card>

    <a-card title="移车" v-show="switchEnableIGV && switchControlMode">
      <div class="ratio-control">
        <a-radio-group v-model:value="moveIGVRatioValue" @change="requestParamLists">
          <a-radio :value="'1'">停车位</a-radio>
          <a-radio :value="'2'">悬臂作业位</a-radio>
          <a-radio :value="'3'">充电位</a-radio>
          <a-radio :value="'4'">岸桥作业位</a-radio>
          <a-radio :value="'5'">维修车位</a-radio>
          <a-radio :value="'6'">指定坐标位</a-radio>
        </a-radio-group>
      </div>

      <div style="height: 235px; display: flex; flex-direction: column; justify-content: center">
        <!-- 堆场助选框 -->
        <div class="select-control" type-child="first" v-show="moveIGVRatioValue === '2'">
          <span>所在堆场:</span>
          <a-select v-model:value="moveIGVSelect0" @change="changePBNo">
            <a-select-option v-for="(item, index) in moveIGVSelect0List" :key="index" :value="item">{{ item }}</a-select-option>
          </a-select>
        </div>

        <!-- 普通选择框 -->
        <div class="select-control" v-show="moveIGVRatioValue !== '6'" :type-child="moveIGVRatioValue !== '2' ? 'first' : ''">
          <span>位置编号:</span>
          <a-select v-model:value="moveIGVSelect1">
            <a-select-option v-for="(item, index) in moveIGVSelect1List" :key="index" :value="item">{{ item }}</a-select-option>
          </a-select>
        </div>
        <div class="select-control" v-show="moveIGVRatioValue !== '6'">
          <span>车头方向:</span>
          <a-select v-model:value="moveIGVSelect2">
            <a-select-option v-for="(item, index) in moveIGVSelect2List" :key="index" :value="item">{{ item }}</a-select-option>
          </a-select>
        </div>
        <div class="select-control" v-show="moveIGVRatioValue !== '6'">
          <span>停车位置:</span>
          <a-select v-model:value="moveIGVSelect3">
            <a-select-option v-for="(item, index) in moveIGVSelect3List" :key="index" :value="item">{{ item }}</a-select-option>
          </a-select>
        </div>

        <!-- 手动输入位置 -->
        <div class="input-control" type-child="first" v-show="moveIGVRatioValue === '6'">
          <span>角度: </span>
          <a-input v-model:value="manualHeading" />
        </div>
        <div v-show="moveIGVRatioValue === '6'" style="margin-top: 5px; font-size: 10px; text-align: center"> 按下 "A" 快速同步鼠标位置 </div>
        <div class="input-control" v-show="moveIGVRatioValue === '6'">
          <span>坐标位X: </span>
          <a-input v-model:value="manualPosX" />
        </div>
        <div class="input-control" v-show="moveIGVRatioValue === '6'">
          <span>坐标位Y: </span>
          <a-input v-model:value="manualPosY" />
        </div>

        <!-- 发出指令按钮 -->
        <div class="button-control" type-child="first">
          <a-button @click="doMoveIGVCommand">执行命令</a-button>
        </div>
      </div>
    </a-card>

    <a-card title="充电机控制" v-show="switchEnableIGV">
      <div class="button-control">
        <a-button @click="cancelCharger(idRef.value)">取消充电任务</a-button>
        <a-button @click="cancelCharger_Force(idRef.value)">强制结束充电</a-button>
      </div>
      <div class="button-control">
        <a-button @click="openChargerCover(idRef.value)">打开保护罩</a-button>
        <a-button @click="closeChargerCover(idRef.value)">关闭保护罩</a-button>
      </div>
      <div class="button-control" type-child="first"> 当前保护罩状态: {{ chargeCoverStatus }} </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { reactive } from "vue";
import { onMounted } from "vue";
import { BlockMap } from "@2dmapv2/data";
import { message } from "ant-design-vue";

import { Card as ACard } from "ant-design-vue";
import { Popconfirm as APopconfirm } from "ant-design-vue";
import { Select as ASelect } from "ant-design-vue";
import { SelectOption as ASelectOption } from "ant-design-vue";

import { axiosInstance } from "./index";
import { cancelCharger, cancelCharger_Force, openChargerCover, closeChargerCover } from "./charge.operations.js";
// prettier-ignore
import { cancelJob_MANUAL, cancelJob_TOS,
  resetFault, resend, resetCommand, resetCommand_Force,
  cleanRoutes, removeAHTSForce,
  switchEnableIGVEvent, switchPauseStatusEvent, switchControlModeEvent, switchAvl4tosEvent,
} from "./vms.operations.js";
import { manualPosX, manualPosY, syncMousePositionEvent } from "./listeners";

defineExpose({
  setStatus: (id: string) => {
    initialization(id);
  },
});

const idRef = ref();
const initialization = (id: string) => {
  return;
  idRef.value = id;
  axiosInstance
    .get({
      url: "/ecs-interface/vms-operational-control/selectAgvConfigById",
      params: { cheId: idRef.value },
    })
    .then((response) => {
      if (!response) return;
      const enableV = response["enable"].toLowerCase() === "true" ? true : false;
      switchEnableIGV.value = enableV;
      const pauseStatusV = JSON.parse(response["pauseStatus"].toLowerCase());
      switchPauseStatus.value = pauseStatusV;
      const msControlModeV = response["msControlMode"].toLowerCase() === "auto" ? false : true;
      switchControlMode.value = msControlModeV;
      const avl4tosV = JSON.parse(response["avl4tos"].toLowerCase());
      switchAvl4tos.value = avl4tosV;
      const chargeCoverStatusV = JSON.parse(response["chargerCoverStatus"].toLowerCase());
      let chargeCoverStatusT = "其他";
      if (chargeCoverStatusV === "1") {
        chargeCoverStatusT = "开启";
      } else if (chargeCoverStatusV === "2") {
        chargeCoverStatusT = "关闭";
      }
      chargeCoverStatus.value = chargeCoverStatusT;
    });

  window.addEventListener("keydown", syncMousePositionEvent);
};

const switchEnableIGV = ref(false);
const switchPauseStatus = ref(false);
const switchControlMode = ref(false);
const switchAvl4tos = ref(false);
const manualHeading = ref(0);
const switchEnableIGVE = (event: MouseEvent) => {
  event.preventDefault();
  switchEnableIGVEvent(!switchEnableIGV.value, idRef.value).then((response) => {
    if (response) switchEnableIGV.value = !switchEnableIGV.value;
  });
};
const switchPauseStatusE = (event: MouseEvent) => {
  event.preventDefault();
  switchPauseStatusEvent(!switchPauseStatus.value, idRef.value).then((response) => {
    if (response) switchPauseStatus.value = !switchPauseStatus.value;
  });
};
const switchControlModeE = (event: MouseEvent) => {
  event.preventDefault();
  switchControlModeEvent(!switchControlMode.value, idRef.value).then((response) => {
    if (response) switchControlMode.value = !switchControlMode.value;
  });
};
const switchAvl4tosE = (event: MouseEvent) => {
  event.preventDefault();
  switchAvl4tosEvent(!switchAvl4tos.value, idRef.value).then((response) => {
    if (response) switchAvl4tos.value = !switchAvl4tos.value;
  });
};

// 移车 相关
let response2DataCache = undefined;
const mapping = {
  "1": { description: "停车位", selectType: "PB.PB", list2: ["LANDSIDE", "WATERSIDE", "NA"], list3: ["CENTER"] },
  "2": { description: "悬臂作业位", selectType: "CLTP", list2: ["LANDSIDE", "HIGHROW"], list3: ["LANDSIDE", "HIGHROW", "CENTER"] },
  "3": { description: "充电位", selectType: "RECH", list2: ["LANDSIDE", "WATERSIDE", "NA"], list3: ["CENTER"] },
  "4": {
    description: "岸桥作业位",
    selectType: "QCTP",
    list2: ["HIGHBOLLARD", "LOWBOLLAR"],
    list3: ["CENTER", "HIGHBOLLARD", "LOWBOLLAR"],
  },
  "5": { description: "维修车位", selectType: "MT.", list2: ["LANDSIDE", "WATERSIDE", "NA"], list3: ["CENTER"] },
};
const moveIGVRatioValue = ref<string>("");
const moveIGVSelect0 = ref<string>(""); // 堆场编号
const moveIGVSelect1 = ref<string>(""); // 位置编号
const moveIGVSelect2 = ref<string>(""); // 车头方向
const moveIGVSelect3 = ref<string>(""); // 停车位置
// prettier-ignore
const moveIGVSelect0List = ref<string[]>([
  "B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10",
  "B11", "B12", "B13", "B14", "B15", "B16", "B17", "B18", "B19", "B20", "B21",
]);
const moveIGVSelect1List = ref<string[]>([""]);
const moveIGVSelect2List = ref<string[]>([""]);
const moveIGVSelect3List = ref<string[]>([""]);

/** 请求接口, 获取当前移车参数 */
const requestParamLists = () => {
  moveIGVSelect1.value = "";
  moveIGVSelect2.value = "";
  moveIGVSelect3.value = "";

  const _value = moveIGVRatioValue.value;
  const mappingObject = mapping[_value];
  if (!mappingObject) {
    return;
  }

  moveIGVSelect2List.value = mappingObject.list2;
  moveIGVSelect3List.value = mappingObject.list3;

  // 根据映射到的 selectType请求接口, 获取进一步的选择列表
  if (_value === "2") {
    if (response2DataCache !== undefined) {
      return;
    }
    axiosInstance
      .get({
        url: "/ecs-interface/vms-moving-vehicle/selectList",
        params: { selectType: mappingObject.selectType },
      })
      .then((response) => {
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          response2DataCache = response.data.data;
        }
      });
  }
  // 根据映射到的 selectType请求接口, 获取进一步的选择列表
  else if (_value === "1" || _value === "3" || _value === "4" || _value === "5") {
    axiosInstance
      .get({
        url: "/ecs-interface/vms-moving-vehicle/selectList",
        params: { selectType: mappingObject.selectType },
      })
      .then((response) => {
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const _arr = response.data.data;
          moveIGVSelect1List.value.length = 0;
          moveIGVSelect1List.value.push(..._arr.map((item) => item["location"]));
        }
      });
  }
};

/** 根据选择的堆场编号, 来决定"悬臂作业位"的位置编号 */
const changePBNo = (value: string) => {
  if (!response2DataCache) {
    return;
  }
  const filtered = response2DataCache.filter((item: { location: string }) => {
    if (item.location.lastIndexOf(value) !== -1) {
      return true;
    }
    return false;
  });
  const mapped = filtered.map((item) => item.location);
  moveIGVSelect1List.value = mapped;
};

/** 点击执行移车命令的按钮, 发出移车指令 */
const doMoveIGVCommand = () => {
  const _value = moveIGVRatioValue.value;
  // 拼接移车请求参数
  let requestDataObject = { aht_id: idRef.value };
  if (_value !== "6") {
    requestDataObject["location"] = moveIGVSelect1.value;
    requestDataObject["oritation"] = moveIGVSelect2.value;
    requestDataObject["job_pos"] = moveIGVSelect3.value;
  } else {
    requestDataObject["x"] = Math.round(parseFloat(manualPosX.value)) + "";
    requestDataObject["y"] = Math.round(parseFloat(manualPosY.value)) + "";
    requestDataObject["heading"] = manualHeading.value;
  }
  // 请求移车操作
  axiosInstance.post({
    url: "/app-api/ecs-interface/vms-moving-vehicle/move",
    data: requestDataObject,
  });
};

// 充电机控制 相关
const chargeCoverStatus = ref<string>("其他"); // 当前保护罩状态
</script>

<style lang="scss"></style>
