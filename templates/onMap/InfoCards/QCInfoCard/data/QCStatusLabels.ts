import { ref } from "vue";

export const IMAGE_BASE_SRC = "/v2/status/";
export const QCStatusLabels = ref<BaseStatusLabelItem[]>([
  {
    src: `${IMAGE_BASE_SRC}lockigv_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}lockigv_gray.png`,
      on: `${IMAGE_BASE_SRC}lockigv.png`,
    },
    subject: "ahtId",
    description: "锁定IGV",
    description_i18n: "",
  },

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
  {
    src: `${IMAGE_BASE_SRC}current_auto_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}current_auto_gray.png`,
      on: `${IMAGE_BASE_SRC}current_auto.png`,
    },
    subject: "MtWorkMode",
    description: "Auto自动模式",
    description_i18n: "",
  },
  {
    src: `${IMAGE_BASE_SRC}current_manual_gray.png`,
    status: {
      on: `${IMAGE_BASE_SRC}current_manual.png`,
      off: `${IMAGE_BASE_SRC}current_manual_gray.png`,
    },
    subject: "MtWorkMode",
    description: "MANUAL手动模式",
    description_i18n: "",
  },

  {
    src: `${IMAGE_BASE_SRC}binded.png`,
    status: {
      on: `${IMAGE_BASE_SRC}binded.png`,
      off: `${IMAGE_BASE_SRC}binded_gray.png`,
    },
    subject: "CraneColligation",
    description: "绑扎状态",
    description_i18n: "",
  },
  {
    src: `${IMAGE_BASE_SRC}anchor.png`,
    status: {
      off: `${IMAGE_BASE_SRC}anchor.png`,
      on: `${IMAGE_BASE_SRC}anchor_green.png`,
    },
    subject: "GantryAnchor",
    description: "大车锚定",
    description_i18n: "",
  },

  // 暂停状态 (False; True)
  {
    src: `${IMAGE_BASE_SRC}anchor_trolley.png`,
    status: {
      on: `${IMAGE_BASE_SRC}anchor_trolley_green.png`,
      off: `${IMAGE_BASE_SRC}anchor_trolley.png`,
    },
    subject: "GantryAnchor1",
    description: "小车锚定",
    description_i18n: "",
  },

  // 紧停状态 (1 紧停; 2 非紧停;)
  {
    src: `${IMAGE_BASE_SRC}emergency_stop_gray.png`,
    status: {
      on: `${IMAGE_BASE_SRC}emergency_stop.png`,
      off: `${IMAGE_BASE_SRC}emergency_stop_gray.png`,
    },
    subject: "E-STOP",
    description: "紧停状态",
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

  {
    src: `${IMAGE_BASE_SRC}mt_mode_unkown.png`,
    status: {
      off: `${IMAGE_BASE_SRC}mt_mode_unkown.png`,
      normal: `${IMAGE_BASE_SRC}mt_mode_normal.png`,
      free: `${IMAGE_BASE_SRC}mt_mode_free.png`,
      hatchcover: `${IMAGE_BASE_SRC}mt_mode_hatch_cover.png`,
      special: `${IMAGE_BASE_SRC}mt_mode_special.png`,
    },
    subject: "RealMtWorkMode",
    description: "主小车工作模式",
    description_i18n: "",
  },

  {
    src: `${IMAGE_BASE_SRC}pt_mode_unkown.png`,
    status: {
      off: `${IMAGE_BASE_SRC}pt_mode_unkown.png`,
      normal: `${IMAGE_BASE_SRC}pt_mode_normal.png`,
      maintenance: `${IMAGE_BASE_SRC}pt_mode_maintenance.png`,
      local: `${IMAGE_BASE_SRC}pt_mode_local.png`,
      suspended: `${IMAGE_BASE_SRC}pt_mode_suspended.png`,
    },
    subject: "RealPtWorkMode",
    description: "门架小车工作模式",
    description_i18n: "",
  },

  {
    src: `${IMAGE_BASE_SRC}Nren.png`,
    status: {
      off: `${IMAGE_BASE_SRC}Nren.png`,
      on: `${IMAGE_BASE_SRC}Nren.png`,
    },
    subject: "???",
    description: "N人模式",
    description_i18n: "",
    tipValue: 0,
  },
]);
