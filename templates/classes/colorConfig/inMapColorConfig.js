// 正则表达式 #[(a-z)|(0-9)]{6}

// 以下预定义色决定了项目的色系
export const DEFAULT_COLOR = "#F905F9FF"; // 缺省色
const TRANSPARENT = "#00000000"; // 透明色
const THEME = "#498CFFFF"; // 主题色
const THEME_ = "#83AFCDFF"; // 主题色_稍浅
// (饱和度)雅色 主要用于图上的设备
const LIGHT_GRAY = "#CDCDCDFF";
const LIGHT_RED = "#FFD3D3FF";
const LIGHT_GREEN = "#D9FFD9FF";
const LIGHT_ORANGE = "#EEB45CFF";
// (饱和度)艳色 主要用于虚拟状态提示
const GREEN = "#47EE1DFF";
const RED = "#FF0000FF";
const YELLOW = "#FFFF00FF";
const GRAY = "#8D989FFF";
const ORANGE = "#FFC107FF";
const DARK_GREEN = "#1D8F20FF";

export default {
  NAME: "light",
  QUAY: "#FFFFFFFF", // 岸边颜色
  ANNOTATION: "#000000FF", // 通用注记

  // 设备标签
  LABEL: {
    VESSEL: {
      DEFAULT: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFFAA",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00AA",
      },
    },

    IGV: {
      DEFAULT: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFFAA",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00AA",
      },
    },

    QC: {
      DEFAULT: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFFAA",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00AA",
      },
    },

    YC: {
      DEFAULT: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFFAA",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00AA",
      },
    },
  },

  // 车位
  LANE: {
    QCTP: {
      TEXT: "#000000FF",
      BACKGROUND: LIGHT_GREEN,
    },
    YCTP: {
      TEXT: "#000000FF",
      IGV_BACKGROUND: "#D9F4FFFF",
      TRUCK_BACKGROUND: LIGHT_GREEN,
    },
  },

  // 堆场
  YARD: {
    BLOCK: {
      DEFUALT: {
        TEXT: "#FF0000FF",
        BACKGROUND: "#FFA07A88",
      },
    },
    WORKAREA: {
      DEFAULT: {
        BACKGROUND: "#16982C22",
      },
      SELECTED: {
        BACKGROUND: "#16982C55",
      },
    },
  },

  IGV: {
    ROUTE: {
      DEFAULT: {
        PASS: "#BBBBBBFF",
        CURRENT: DARK_GREEN,
      },
      SELECTED: {
        PASS: "#BBBBBBFF",
        CURRENT: DARK_GREEN,
      },
      TERMINAL: DARK_GREEN,
    },
    LOCK_AREA: {
      FILL: "#FFB631AA",
    },
  },

  // 特殊的 需要同时保持一份 csskey
  VARS: {
    DEVICE_STATUS: {
      NORMAL: THEME,
      OFFLINE: GRAY,
      FAULT: RED,
      OTHERS: ORANGE,
    },

    CONTAINER_STATUS: {
      RECV: "#BA713dFF",
      DLVR: "#B83DBAFF",
      UNKNOWN: "#0100FDFF",
      LOAD: "#FFFF00FF",
      DSCH: "#02823CFF",
      YARD: "#000000FF",
    },

    YARD_TIER: {
      TIER0: "#BDBCBF44", // #F3F3F3FF
      TIER1: "#A8E6CFFF",
      TIER2: "#DCEDC1FF",
      TIER3: "#FFD3B6FF",
      TIER4: "#FFAAA5FF",
      TIER5: "#CCA8E9FF",
      TIER6: "#FF0C5CFF",
    },
  },
};
