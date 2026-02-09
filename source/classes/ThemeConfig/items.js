// 以下预定义色决定了项目的色系
export const DEFAULT_COLOR = "#F905F9FF"; // 缺省色
export const TRANSPARENT = "#00000000"; // 透明色
export const THEME = "#498CFFFF"; // 主题色

// (饱和度低)雅色, 主要用于图上的设备
export const ELEG_GRAY = "#CDCDCDFF";
export const ELEG_RED = "#FFD3D3FF";
export const ELEG_GREEN = "#D9FFD9FF";
export const ELEG_ORANGE = "#EEB45CFF";

// (饱和度高)艳色, 主要用于虚拟状态提示
export const GORG_GREEN = "#47EE1DFF";
export const GORG_RED = "#FF0000FF";
export const GORG_YELLOW = "#FFFF00FF";
export const GORG_GRAY = "#8D989FFF";
export const GORG_ORANGE = "#FFC107FF";
export const GORG_DARKGREEN = "#1D8F20FF";

export const items = {
  NAME: "light",
  BACKGROUND: "#FFFFFFFF",
  ANNOTATION: "#000000FF", // 地图号码注记

  // 设备标签
  LABEL: {
    VESSEL: {
      DEFAULT: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFFFF",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00FF",
      },
    },

    QC: {
      DEFAULT: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFFFF",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00FF",
      },
    },

    IGV: {
      LOWPOWER: {
        TEXT: "#FFFFFFFF",
        TEXT_BACKGROUND: "#FF002FFF",
      },
      DEFAULT: {
        TEXT: "#FFFFFFFF",
        TEXT_BACKGROUND: "#2A6FB7FF",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00FF",
      },
    },

    YC: {
      DEFAULT: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFFFF",
      },
      SELECTED: {
        TEXT: "#000000FF",
        TEXT_BACKGROUND: "#FAFA00FF",
      },
    },

    WORKINGIGVS: {
      DEFAULT: {
        TEXT_SELECTED: "#000000FF",
        TEXT_BACKGROUND: "#FFFFFF44",
        TEXT_BACKGROUND_SELECTED: "#FAFA00FF",
      },
      QC: {
        TEXT: "#47EE1DFF",
      },
      YARD: {
        TEXT: "#1D8F20FF",
      },
    },
  },

  // 停车位
  LANE: {
    MT: {
      TEXT: "#BBBBBBFF",
      BACKGROUND: ELEG_GREEN,
    },
    PB: {
      TEXT: "#BBBBBBFF",
      BACKGROUND_ENABLE: TRANSPARENT,
      BACKGROUND_DISABLE: ELEG_GRAY,
    },
    RECHARGE: {
      TEXT: "#BBBBBBFF",
      BACKGROUND_ENABLE: ELEG_GREEN,
      BACKGROUND_INSERVICE_DISABLE: ELEG_GRAY,
      BACKGROUND_NOT_INSERVICE: ELEG_RED,
    },
    QCTP: {
      TEXT: "#BBBBBBFF",
      BACKGROUND_ENABLE: ELEG_GREEN,
      BACKGROUND_DISABLE: ELEG_GRAY,
    },
  },

  // 禁行区
  BLOCK: {
    FILL_0: "#FFA07AAA",
    FILL_1: "#FFA07A88",
    FILL_2: "#FFA07A40",
    FILL_3: "#FFA07AAA",
    FILL_4: "#FFA07AAA",
    FILL_5: "#FFA07AAA",
    FILL_6: "#FFA07AAA",
    FILL_7: "#FFA07AAA",
    FILL_8: "#FFA07AAA",
    FILL_9: "#FFA07ABE",

    TEXT: "#FF1912FF",
    FILL: "#FFA07A88",
    BORDER: "#FFA07AFF",
    SELECTED_BORDER: "#FF0000FF",

    // 不活跃状态的禁行区; 如堆场门禁设置的非活跃禁行区, 预设IGV禁行区
    INACTIVE: {
      FILL: "#BBBBBBCC",
      BORDER: "#000000FF",
    },
  },

  IGV: {
    ROUTE: {
      DEFAULT: GORG_GREEN,
      PASS: "#BBBBBBFF",
      ACTIVE: GORG_GREEN,
      TERMINAL: GORG_GREEN,
    },

    LOCK_AREA: {
      FILL: "#FFB631AA",
      DRAWING: "#CCCCCCAA",
      BORDER: "#1D8F2000",
    },
  },

  TRUCK: {
    NORMAL: "#008000FF",
    OVERTIME: "#FC1717FF",
    WARNING: "#FFFF00FF",
  },

  QC: {
    CYCLE: {
      ACTIVE: GORG_GREEN,
      INACTIVE: GORG_RED,
    },
  },

  YARD: {
    DOOR: {
      ENABLE: "#1D8F20FF",
      DISABLE: "#FF8E00FF",
    },
  },

  SIGNAL: {
    FILL: "#076EFF26",
    BORDER: "#000000FF",
  },

  // (VARS开头为特殊变量, 会同时写入RootCss)
  VARS: {
    DEVICE_STATUS: {
      NORMAL: THEME,
      OFFLINE: GORG_GRAY,
      ARRIVED: GORG_GREEN,
      FAULT: GORG_RED,
    },

    CONTAINER_STATUS: {
      RECV: "#BA713dFF",
      DLVR: "#B83DBAFF",
      DEFAULT: "#0100FDFF",
      LOAD: "#FFFF00FF",
      DSCH: "#02823CFF",
      YARD: "#000000FF",
      UNKNOWN: "#0100FDFF",
    },

    YARD_TIER: {
      TIER0: "#F3F3F3FF",
      TIER1: "#A8E6CFFF",
      TIER2: "#DCEDC1FF",
      TIER3: "#FFD3B6FF",
      TIER4: "#FFAAA5FF",
      TIER5: "#CCA8E9FF",
    },
  },
};
