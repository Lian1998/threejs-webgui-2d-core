import type { Vec2 } from "../contracts";

export interface CoordinateAdapter {
  toLocal(input: Vec2): Vec2;
  fromLocal(local: Vec2): Vec2;
}

export interface LocalCoordinateOptions {
  origin: Vec2;
  unitsPerMeter?: number;
  axis?: readonly [1 | -1, 1 | -1];
}

function finitePair(value: Vec2, name: string): void {
  if (value.length !== 2 || !value.every(Number.isFinite)) throw new Error(`${name} must contain two finite coordinates`);
}

/** 外部业务坐标到局部米坐标的显式适配器, 不自动挂接到图元工厂.
 * 在 CPU double 精度下减原点并换算单位, 避免大坐标直接进入 GPU float32. */
export class LocalCoordinateAdapter implements CoordinateAdapter {
  readonly origin: Vec2;
  readonly unitsPerMeter: number;
  readonly axis: readonly [1 | -1, 1 | -1];

  constructor(options: LocalCoordinateOptions) {
    finitePair(options.origin, "origin");
    this.origin = [options.origin[0], options.origin[1]];
    this.unitsPerMeter = options.unitsPerMeter ?? 1;
    this.axis = options.axis ? [...options.axis] : [1, 1];
    if (!Number.isFinite(this.unitsPerMeter) || this.unitsPerMeter <= 0) throw new Error("unitsPerMeter must be positive");
    if (!this.axis.every((value) => value === 1 || value === -1)) throw new Error("axis values must be 1 or -1");
  }

  toLocal(input: Vec2): Vec2 {
    finitePair(input, "input");
    return [((input[0] - this.origin[0]) / this.unitsPerMeter) * this.axis[0], ((input[1] - this.origin[1]) / this.unitsPerMeter) * this.axis[1]];
  }

  fromLocal(local: Vec2): Vec2 {
    finitePair(local, "local");
    return [this.origin[0] + local[0] * this.unitsPerMeter * this.axis[0], this.origin[1] + local[1] * this.unitsPerMeter * this.axis[1]];
  }
}
