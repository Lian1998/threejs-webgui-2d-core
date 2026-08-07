import { ref } from "vue";

export const IMAGE_BASE_SRC = "/v2/status/";
export const YCStatusLabels = ref<BaseStatusLabelItem[]>([
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
    subject: "ControlMode",
    description: "Remote远程控制",
    description_i18n: "",
  },
  {
    src: `${IMAGE_BASE_SRC}current_maintain_gray.png`,
    status: {
      off: `${IMAGE_BASE_SRC}current_maintain_gray.png`, // 自动
      on: `${IMAGE_BASE_SRC}current_maintain.png`, // 本地
    },
    subject: "MAINTAIN",
    description: "维修模式",
    description_i18n: "",
  },
]);
