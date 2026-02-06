import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

import { ref } from "vue";

import { message } from "ant-design-vue";

import { historyReplayStatus } from "./index_core";
import { historyDBSub } from "./index_core";
import { historyReplaySub, historyReplayStart, historyReplayStop } from "./index_core";
import { _historyReplayStartC } from "./index_core";

// UI
export const timePicked = ref<[Dayjs, Dayjs]>([null, null]);
export const timePickedClear = () => [0, 1].forEach((key) => (timePicked.value[key] = null));
export const sliderMarks = ref<Record<number, any>>({});
export const sliderValue = ref<number>(0);
export const sliderLimitPercent = { value: 0.0 };
export const sliderMin = ref<number>(0);
export const sliderMax = ref<number>(0);
export const xSpeed = ref<number>(1);
export const extraDoms = { headerCloseBtn: undefined, sliderTrackAdd: undefined, tooltipAdd: undefined };
export const importBtnLoading = ref<boolean>(false);
export const exportBtnLoading = ref<boolean>(false);

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;

let _timePickedSuccess = false;
/** 当时间组件被修改时回调 */
export const on_timePickedChanged = (value: [Dayjs, Dayjs]) => {
  if (!value[0] || !value[1]) return;
  const startTimeStamp = timePicked.value[0].toDate().getTime();
  const endTimeStamp = timePicked.value[1].toDate().getTime();

  // 时间轴刻度
  if (endTimeStamp - startTimeStamp >= 4 * HOUR) {
    message.warn("回放时间跨度不能超过4个小时");
    timePickedClear();
    return;
  }

  // 动态生成marks
  on_calculateMarks(startTimeStamp, endTimeStamp);

  // 设置一下当前页面组件的UI值
  sliderMin.value = startTimeStamp;
  sliderMax.value = endTimeStamp;
  sliderValue.value = startTimeStamp;
  _timePickedSuccess = true;
};

/* 向服务器提交申请的回放时间 */
export const on_timePickedConfirmed = () => {
  if (!_timePickedSuccess) {
    message.error("请选择回放时间");
    return;
  }
  // 锁定timePicker和确认时间的按钮
  historyReplayStatus.pickTimeConfirmed = true;

  historyReplaySub();
};

/* 退出回放(刷新页面) */
export const on_quit = () => {
  window.location.reload();
};

/* 获取当前时刻任务信息 */
export const on_reqeuestDBInfo = () => {
  historyDBSub(sliderValue.value);
};

/* 确定以(x倍速)回放 */
let uuid = undefined;
export const on_playpauseButtonClicked = () => {
  if (!historyReplayStatus.playing) {
    uuid = Date.now();
    if (_historyReplayStartC.eventMap.get(uuid) !== undefined) return;
    historyReplayStatus.playing = true;
    historyReplayStart(uuid);
  } else {
    historyReplayStatus.playing = false;
    historyReplayStop(uuid);
  }
};

/* 计算进度条标记 */
export const on_calculateMarks = (startTimeStamp: number, endTimeStamp: number) => {
  const stripes = [HOUR, 30 * MINUTE, 10 * MINUTE, 5 * MINUTE]; // 刻度 60min(60*3) 30min(30*5) 10min(10*5) 5min(5*5)
  Object.keys(sliderMarks.value).forEach((key) => delete sliderMarks.value[key]); // 清除之前计算的刻度
  let stripeFound = false; // 记录当前是否已经找到了可以被接受的最大刻度
  for (let i = 0; i < stripes.length; i++) {
    if (stripeFound) continue;
    const stripe = stripes[i];
    // 从刻度区间*3判断, 起始时间-结束时间必须能显示3个刻度即以上
    if (endTimeStamp - startTimeStamp >= 3 * stripe) {
      stripeFound = true;
      let currentTimeStamp = startTimeStamp + stripe;
      let isFirst = false;
      do {
        if (isFirst === false) {
          currentTimeStamp = currentTimeStamp - (currentTimeStamp % stripe);
          isFirst = true;
        }
        sliderMarks.value[currentTimeStamp] = { label: dayjs(currentTimeStamp).format("MM-DD HH:mm") };
        currentTimeStamp += stripe;
      } while (currentTimeStamp <= endTimeStamp);
    }
  }
};

/** 当使用进度条步进标记改变进度条当前值 */
export const on_sliderStepChange = (step: number) => {
  // 假设当前是 15.24 存在 15.20 15.30
  const timeStamps = Object.keys(sliderMarks.value); // 所有的生成标记时间戳
  if (step === -1) {
    const _timeStamps = timeStamps.reverse();
    const _prevIndex = _timeStamps.findIndex((timeStamp) => Number.parseInt(timeStamp) < sliderValue.value); // 时间戳反一下, 找到最近小于当前的
    if (_prevIndex !== -1) sliderValue.value = Number.parseInt(_timeStamps[_prevIndex]);
  } else if (step === 1) {
    const _nextIndex = timeStamps.findIndex((timeStamp) => Number.parseInt(timeStamp) > sliderValue.value); // 找到最近大于当前的
    if (_nextIndex !== -1) sliderValue.value = Number.parseInt(timeStamps[_nextIndex]);
  }
};

/** 当进度条加载条的百分比发生改变 */
export const on_sliderTrackAddChange = (percent: number) => {
  const _percent = parseFloat(percent.toFixed(2));
  sliderLimitPercent.value = _percent;

  const sliderTrackAdd = extraDoms.sliderTrackAdd;
  if (sliderTrackAdd) {
    sliderTrackAdd.style.width = `${percent * 100}%`;
    // #FFD3B6FF
    // #DCEDC1FF
    if (percent === 1.0) sliderTrackAdd.style.backgroundColor = "#DCEDC1FF";
    else sliderTrackAdd.style.backgroundColor = "#FFD3B6FF";
  }
};

/** 当进度条拖拽时 */
export const on_sliderTackChange = (value: number) => {
  const _sliderMin = sliderMin.value;
  const _sliderMax = sliderMax.value;

  const currentSliderLimit = _sliderMin + (_sliderMax - _sliderMin) * sliderLimitPercent.value;
  if (value > currentSliderLimit) sliderValue.value = currentSliderLimit;
};

/** 当进度条被hover时 */
export const on_sliderRailHover = (hoverX: number, totalX: number) => {
  const tooltipAdd = extraDoms.tooltipAdd;
  if (!tooltipAdd) return;

  const _sliderMin = sliderMin.value;
  const _sliderMax = sliderMax.value;
  const ratio = hoverX / totalX;
  const ratioed_timeStamp = _sliderMin + (_sliderMax - _sliderMin) * ratio;
  const ratioed_time = dayjs(ratioed_timeStamp).format("MM-DD HH:mm:ss");

  tooltipAdd.innerHTML = ratioed_time;
  tooltipAdd.style.left = `${hoverX}px`;
};
