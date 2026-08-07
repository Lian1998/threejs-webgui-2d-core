const middleGap_half = 0.5; // 两个箱中间间隙

const container20_x = 6.06;
const container20_x_half = container20_x / 2.0;
const container40_x = 12.2;
const container40_x_half = container40_x / 2.0;
const container_y = 2.44;
const container_y_half = container_y / 2.0;

/** 0:Null 1:Empty 2:Center20 3:Center40 4:Center45 5:Twin20 6:Center30 7:Changing 8:Left20 9:Right20 */
export const getContainerGeometryQC = (center: Array2<number>, size: number): Array2<number>[][] => {
  switch (size) {
    case 0: {
      return [];
    }
    case 1: {
      return [];
    }
    case 2: {
      return [
        [
          [center[0] - container20_x_half, center[1] - container_y_half],
          [center[0] - container20_x_half, center[1] + container_y_half],
          [center[0] + container20_x_half, center[1] + container_y_half],
          [center[0] + container20_x_half, center[1] - container_y_half],
          [center[0] - container20_x_half, center[1] - container_y_half],
        ],
      ];
    }
    case 3: {
      return [
        [
          [center[0] - container40_x_half, center[1] - container_y_half],
          [center[0] - container40_x_half, center[1] + container_y_half],
          [center[0] + container40_x_half, center[1] + container_y_half],
          [center[0] + container40_x_half, center[1] - container_y_half],
          [center[0] - container40_x_half, center[1] - container_y_half],
        ],
      ];
    }
    case 4: {
      return [
        [
          [-container40_x_half, -container_y_half],
          [-container40_x_half, +container_y_half],
          [+container40_x_half, +container_y_half],
          [+container40_x_half, -container_y_half],
          [-container40_x_half, -container_y_half],
        ],
      ];
    }
    case 5: {
      return [
        [
          [center[0] - middleGap_half - container20_x, center[1] - container_y / 2],
          [center[0] - middleGap_half - container20_x, center[1] + container_y / 2],
          [center[0] - middleGap_half, center[1] + container_y / 2],
          [center[0] - middleGap_half, center[1] - container_y / 2],
          [center[0] - middleGap_half - container20_x, center[1] - container_y / 2],
        ],
        [
          [center[0] + middleGap_half, center[1] - container_y / 2],
          [center[0] + middleGap_half, center[1] + container_y / 2],
          [center[0] + middleGap_half + container20_x, center[1] + container_y / 2],
          [center[0] + middleGap_half + container20_x, center[1] - container_y / 2],
          [center[0] + middleGap_half, center[1] - container_y / 2],
        ],
      ];
    }
    case 6: {
      return [];
    }
    case 7: {
      return [];
    }
    case 8: {
      return [
        [
          [center[0] - middleGap_half - container20_x, center[1] - container_y / 2],
          [center[0] - middleGap_half - container20_x, center[1] + container_y / 2],
          [center[0] - middleGap_half, center[1] + container_y / 2],
          [center[0] - middleGap_half, center[1] - container_y / 2],
          [center[0] - middleGap_half - container20_x, center[1] - container_y / 2],
        ],
      ];
    }
    case 9: {
      return [
        [
          [center[0] + middleGap_half, center[1] - container_y / 2],
          [center[0] + middleGap_half, center[1] + container_y / 2],
          [center[0] + middleGap_half + container20_x, center[1] + container_y / 2],
          [center[0] + middleGap_half + container20_x, center[1] - container_y / 2],
          [center[0] + middleGap_half, center[1] - container_y / 2],
        ],
      ];
    }
  }
};

/** 0:Null 1:Center20 2:Center40 3:Center45 4:Twin20 */
export const getContainerGeometryYC = (center: Array2<number>, size: number): Array2<number>[][] => {
  let _size = 0;
  if (size == 1) _size = 2;
  else if (size == 2) _size = 3;
  else if (size == 3) _size = 4;
  else if (size == 4) _size = 5;
  return getContainerGeometryQC(center, _size);
};

export const hasContainerGeometry = (size: number): boolean => {
  switch (size) {
    case 0: {
      return false;
    }
    case 1: {
      return false;
    }
    case 2: {
      return true;
    }
    case 3: {
      return true;
    }
    case 4: {
      return true;
    }
    case 5: {
      return true;
    }
    case 6: {
      return false;
    }
    case 7: {
      return false;
    }
    case 8: {
      return true;
    }
    case 9: {
      return true;
    }
  }
};
