// 通过接口传递的逻辑位置, 推断出逻辑位置在EPSG:3857坐标系下的原点 LOGIC_X LOGIC_Y

// V2底图的VMS坐标中心点
export const LOGIC_CENTER_X = 567485;
export const LOGIC_CENTER_Y = -2397835;

// QC岸桥坐标系的轨道零端点
export const QC_LOCATION_Y = -2397680;

export const LOGIC_CENTER = [LOGIC_CENTER_X, LOGIC_CENTER_Y];

/** 逻辑 => EPSG:3857 */
export const coordinateTrans_mm = (x: number, y: number): [number, number] => {
  return [LOGIC_CENTER_X - x / 1000.0, y / 1000.0 - LOGIC_CENTER_Y];
};

/** 逻辑 => EPSG:3857 */
export const coordinateTrans_cm = (x: number, y: number) => {
  return [LOGIC_CENTER_X - x / 100.0, y / 100.0 - LOGIC_CENTER_Y];
};

/** 逻辑 => EPSG:3857 */
export const coordinateTrans = (x: number, y: number): [number, number] => {
  return [LOGIC_CENTER_X - x, y - LOGIC_CENTER_Y];
};

/** EPSG:3857 => 逻辑 */
export const _coordinateTrans_mm = (x: number, y: number): [number, number] => {
  return [1000.0 * (LOGIC_CENTER_X - x), 1000.0 * (y - LOGIC_CENTER_Y)];
};

/** EPSG:3857 => 逻辑 */
export const _coordinateTrans_cm = (x: number, y: number): [number, number] => {
  return [100.0 * (LOGIC_CENTER_X - x), 100.0 * (y - LOGIC_CENTER_Y)];
};

/** EPSG:3857 => 逻辑 */
export const _coordinateTrans = (x: number, y: number): [number, number] => {
  return [LOGIC_CENTER_X - x, y - LOGIC_CENTER_Y];
};
