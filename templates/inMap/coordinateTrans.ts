// 通过接口传递的逻辑位置, 推断出逻辑位置在EPSG:3857坐标系下的原点 LOGIC_X LOGIC_Y

// V2底图坐标转换
export const LOGIC_CENTER_X = 485920.20794917895;
export const LOGIC_CENTER_Y = 2493695.8752075257;

export const LOGIC_CENTER = [LOGIC_CENTER_X, LOGIC_CENTER_Y];

// coordinateTrans    逻辑 => EPSG:3857
// _coordinateTrans   EPSG:3857 => 逻辑

export const coordinateTrans_mm = (x: number, y: number): Array2<number> => {
  return [LOGIC_CENTER_X - x / 1000.0, LOGIC_CENTER_Y - y / 1000.0];
};

export const coordinateTrans_mm_x = (x: number): number => {
  return LOGIC_CENTER_X - x / 1000.0;
};

export const coordinateTrans_mm_y = (y: number): number => {
  return LOGIC_CENTER_Y - y / 1000.0;
};

export const coordinateTrans_cm = (x: number, y: number) => {
  return [LOGIC_CENTER_X - x / 100.0, LOGIC_CENTER_Y - y / 100.0];
};

export const coordinateTrans_cm_x = (x: number): number => {
  return LOGIC_CENTER_X - x / 100.0;
};

export const coordinateTrans_cm_y = (y: number): number => {
  return LOGIC_CENTER_Y - y / 100.0;
};

export const _coordinateTrans_mm = (x: number, y: number): Array2<number> => {
  return [1000.0 * (LOGIC_CENTER_X - x), 1000.0 * (LOGIC_CENTER_Y - y)];
};

export const _coordinateTrans_mm_x = (x: number): number => {
  return 1000.0 * (LOGIC_CENTER_X - x);
};

export const _coordinateTrans_mm_y = (y: number): number => {
  return 1000.0 * (LOGIC_CENTER_Y - y);
};

export const _coordinateTrans_cm = (x: number, y: number): Array2<number> => {
  return [100.0 * (LOGIC_CENTER_X - x), 100.0 * (LOGIC_CENTER_Y - y)];
};

export const _coordinateTrans_cm_x = (x: number): number => {
  return 100.0 * (LOGIC_CENTER_X - x);
};

export const _coordinateTrans_cm_y = (y: number): number => {
  return 100.0 * (LOGIC_CENTER_Y - y);
};
