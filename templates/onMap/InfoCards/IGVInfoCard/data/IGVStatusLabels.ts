import { ref } from "vue";

const IMAGE_BASE_SRC = "/v2/status/";
export const IGVStatusLabels = ref<BaseStatusLabelItem[]>([
  {
    src: `${IMAGE_BASE_SRC}very_low_energy.png`,
    status: {
      fullEnergy: `${IMAGE_BASE_SRC}full_energy.png`,
      fullEnergyCharging: `${IMAGE_BASE_SRC}full_charge_energy.png`,
      normalEnergy: `${IMAGE_BASE_SRC}normal_energy.png`,
      normalEnergyCharging: `${IMAGE_BASE_SRC}normal_charge_energy.png`,
      lowEnergy: `${IMAGE_BASE_SRC}low_energy.png`,
      lowEnergyCharging: `${IMAGE_BASE_SRC}low_charge_energy.png`,
      off: `${IMAGE_BASE_SRC}very_low_energy.png`,
      verylowCharging: `${IMAGE_BASE_SRC}very_low_charge_energy.png`,
    },
    subject: "EnergyPercent",
    description: "电池状态",
    description_i18n: "",
    value: 0,
  },

  // 通信状态
  {
    src: `${IMAGE_BASE_SRC}communication_disconnected.png`,
    status: {
      off: `${IMAGE_BASE_SRC}communication_disconnected.png`,
      on: `${IMAGE_BASE_SRC}communication_connected.png`,
    },
    subject: "Communication",
    description: "通信状态",
    description_i18n: "",
  },

  // 控制状态
  {
    src: `${IMAGE_BASE_SRC}control_off_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}control_off_gray.png`,
      on: `${IMAGE_BASE_SRC}control_off.png`,
    },
    subject: "Control_Mode",
    description: "控制状态",
    description_i18n: "",
  },

  // 控制模式
  {
    src: `${IMAGE_BASE_SRC}control_local_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}control_local_gray.png`,
      on: `${IMAGE_BASE_SRC}control_local.png`,
    },
    subject: "ControlMode",
    description: "Local本地控制",
    description_i18n: "",
  },
  {
    src: `${IMAGE_BASE_SRC}current_auto_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}current_auto_gray.png`,
      on: `${IMAGE_BASE_SRC}current_auto.png`,
    },
    subject: "ControlMode",
    description: "Auto自动模式",
    description_i18n: "",
  },
  {
    src: `${IMAGE_BASE_SRC}current_manual_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}current_manual_gray.png`, // 自动
      on: `${IMAGE_BASE_SRC}current_manual.png`, // 本地
    },
    subject: "ControlMode",
    description: "Remote远程模式",
    description_i18n: "",
  },

  // 暂停状态 (False; True)
  {
    src: `${IMAGE_BASE_SRC}Pause_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}Pause_gray.png`,
      on: `${IMAGE_BASE_SRC}Pause.png`,
    },
    subject: "PAUSE_STATUS",
    description: "暂停状态",
    description_i18n: "",
  },

  // 紧停状态 (1 紧停; 2 非紧停;)
  {
    src: `${IMAGE_BASE_SRC}emergency_stop_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}emergency_stop_gray.png`,
      on: `${IMAGE_BASE_SRC}emergency_stop.png`,
    },
    subject: "E-STOP",
    description: "紧停状态",
    description_i18n: "",
  },

  // 车队状态 (Yes 在VMS中; NO 不在VMS车队中;)
  {
    src: `${IMAGE_BASE_SRC}enabled_gray.png`,
    status: {
      on: `${IMAGE_BASE_SRC}enabled.png`,
      off: `${IMAGE_BASE_SRC}enabled_gray.png`,
    },
    subject: "AHT_FLEET",
    description: "车队状态",
    description_i18n: "",
  },

  // ECS故障 (FAULT 致命故障 ERROR 一般故障 WORNING 警告或事件)
  {
    src: `${IMAGE_BASE_SRC}ecs_error_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}ecs_error_gray.png`,
      WORNING: `${IMAGE_BASE_SRC}ecs_error_yellow.png`,
      ERROR: `${IMAGE_BASE_SRC}ecs_error_orange.png`,
      FAULT: `${IMAGE_BASE_SRC}ecs_error_red.png`,
    },
    subject: "Fault",
    description: "ECS故障",
    description_i18n: "",
  },

  // 调度状态 (FALSE 无法被调度; TRUE 能够被调度)
  {
    src: `${IMAGE_BASE_SRC}dispatch_not_available.png`,
    status: {
      off: `${IMAGE_BASE_SRC}dispatch_not_available.png`,
      on: `${IMAGE_BASE_SRC}dispatch_available.png`,
    },
    subject: "AVL4TOS",
    description: "调度状态",
    description_i18n: "",
  },

  // 告警 有任务但是长时间不移动 (FALSE; TRUE)
  {
    src: `${IMAGE_BASE_SRC}timeout_not.png`,
    status: {
      off: `${IMAGE_BASE_SRC}timeout_not.png`,
      on: `${IMAGE_BASE_SRC}timeout.png`,
    },
    subject: "ALARM",
    description: "告警状态",
    description_i18n: "",
  },
]);
