# 16. 实时插帧

前置: 03, 04. 后续: 19, 20. 可在 04 后独立执行, 17 完成后通过同一 TransformTarget 注入组合设备.

## 目标与边界

将低频位置/角度更新平滑展示, 保留业务的一个绑定对象和一次 `push` 调用. 使用 00 的米, 弧度和 TransformTarget, 不接入 source, Socket.IO, 数据协议或毫米坐标转换.

插帧改变展示状态, 不修改原始业务数据. 调度使用同一 Viewer 的 03 帧循环和本地单调时间, 不为每台设备创建 RAF, 计时器或独立渲染器.

建议目录: `core/motion/MotionController.ts`, `core/motion/MotionHandle.ts`, `core/debug/refactor/index.ts`, `multi-pages/debug/refactor/motion.html`.

## 类型草案

```ts
interface MotionSample {
  position: Vec2;
  rotation: number;
  timestampMs?: number; // 外部时钟时间, 仅 timestamped 模式使用.
}

interface MotionOptions {
  mode?: "latest" | "timestamped"; // 默认 latest.
  durationMs?: number;           // latest 默认过渡时长.
  delayMs?: number;              // timestamped 的缓冲延迟.
  normalizeTime?: (timestampMs: number) => number;
  maxSamples?: number;
  staleAfterMs?: number;
  snapDistance?: number;         // 世界米, 默认可关闭.
  maxGapMs?: number;
}

interface MotionHandle {
  readonly state: "idle" | "moving" | "stale" | "disposed";
  push(sample: MotionSample): void;
  snap(sample: MotionSample): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

interface MotionController {
  bind(target: TransformTarget, options?: MotionOptions): MotionHandle;
  dispose(): void;
}
```

`normalizeTime` 返回与帧调度器同源的本地单调毫秒. 服务器 epoch, 设备秒值和 `performance.now()` 不直接相减. 映射由外部适配器提供, 核心不猜测网络时差.

暂停期间可继续接收样本但不写展示状态, resume 按恢复规则重建过渡. state 中移动与过期描述数据/运动状态, 暂停作为独立内部标志, dispose 幂等并释放目标引用.

## 两种明确的更新语义

- `latest` 是默认策略. 接收时采用本地时间, 从此刻已经显示的位置/角度过渡到最新目标. 新消息取代尚未完成的目标, 不从旧起点重复起步.
- `latest` 无消息顺序保证时按到达顺序处理. 业务有 sequence/timestamp 时在外部先拒绝旧消息; 核心不假设外部时间值属于同一时钟.
- `timestamped` 适合有可靠时间戳的轨迹. 要求每条数据有有限 timestampMs 且提供 normalizeTime, 缺失时报明确配置错误.
- `timestamped` 在 `nowMs - delayMs` 找相邻样本插值. delayMs 决定展示延迟, 不再额外套 latest 过渡, 避免产生两次延迟.
- 首期不按速度外推. 播放时刻超过最新样本就保持最新姿态, 接收到新样本后继续. 外推和误差追赶留给将来的明确策略扩展.

## 实现步骤

1. 实现纯计算函数: Vec2 线性插值, 角度归一化及最短弧插值. 所有输入先检查有限值, 拒绝 NaN/Infinity 和非法时间.
2. 角差归一化到 `[-PI, PI)`, 约定恰好 PI 的方向固定. 例如 359deg 到 1deg 经 0deg, 不绕一整圈. 内部可保持连续角, 写出弧度语义一致.
3. latest 用绝对 `nowMs` 算 `t=clamp((nowMs-startMs)/durationMs,0,1)`, 不依赖累计 delta. duration=0 或首次样本可直接定位.
4. timestamped 插入有界缓冲. 相同时间戳用最新到达样本替换, 乱序但仍在未播放窗口内的数据按时间插入, 已播放过的数据丢弃.
5. 缓冲同时受 maxSamples 和时间跨度约束. 保留播放点前最近一个样本供插值, 清理更早历史, 不无限积累设备轨迹.
6. 以 maxGapMs 判断长间隔, 以 snapDistance 判断空间大跳变. 命中阈值时切段并 snap 到新有效目标, 不跨长断点平滑飞越全场.
7. 超过 staleAfterMs 标记 stale 并保持最后姿态. 暂无新的插值区间时停止持续调度; 由新消息/恢复唤醒, 不为了检查过期永久续 RAF.
8. 若需精确在过期时刻触发状态通知, 使用 Viewer 级共享期限任务唤醒一次; 无通知需求可在下一次观测时派生 stale 状态.
9. 通过03的 `onFrame(({nowMs,deltaMs}) => ...)` 更新active集合, 用 `acquireContinuous("motion")` 申请持续帧. 活跃集合为空就调用其release, 不停止其他动画的申请; 新样本通过 `invalidate` 唤醒.
10. 后台恢复或 delta 突增时不补跑历史帧. latest 以真实时间落到当前插值/最终目标, timestamped 丢弃已过播放段并重新选择有效区间.
11. normalizeTime 映射发生跳变时, 外部重建绑定或显式 snap/reset 当前缓冲. 明确记录这一恢复协议, 不让混合时钟样本连成错误轨迹.
12. 同一目标仅有一个运动写入者. 重复 bind 明确报错或先释放旧绑定, GUI 手动拖动需要 pause/snap 后再 resume, 不与插值互相覆盖.

## 调用草案

```ts
const movement = motion.bind(sprite, { durationMs: 160 });
movement.push({ position: [20, 30], rotation: Math.PI / 2 });
// 同一入口也接收 17 的组合设备, 无需分别给车身和标签插帧.
const deviceMovement = motion.bind(device, { mode: "latest" });
deviceMovement.push({ position: [22, 31], rotation: 0 });
```

## 联动约定

- 03 注入时钟和帧回调, 测试可手动推进时间. 16 不依赖renderer, 无活跃插值时不续RAF, 相同属性值不制造脏更新. Controller销毁时注销onFrame订阅.
- 04 的 setPosition/setRotation 产生必要脏范围, 07 在一次帧内合并上传. 图层, 资源, 文本内容不由插帧重建.
- 17 的组合设备实现 TransformTarget, 一次设备姿态更新驱动自身部件. 核心不要求多重继承.
- 15 的点击读取实际当前展示姿态; 最新业务目标不能提前影响拾取. 隐藏或离屏对象仍遵守时间语义, 恢复后直接展示当前有效状态.
- 绑定释放和Viewer销毁清除样本, 活跃项, 期限任务和目标引用. 04注册表销毁通知解绑图元, 17实体dispose释放关联绑定; 自定义TransformTarget由调用方dispose绑定, 不猜测目标存活.

## 轻量验收

1. debug 页面可选模式, 输入频率和过渡时长, 观察持续低频更新, 快速新目标替换和359deg/1deg转向.
2. 模拟乱序, 重复时间戳, 断流, 零时长, 长间隔和空间大跳变, 状态与以上规则一致且缓冲有界.
3. 手动推进时钟模拟后台恢复, 不执行成百上千次补帧, 不由首次巨大 delta 推出非法位置.
4. 新样本唤醒帧循环, 全部动作完成后持续 RAF 停止. 多对象共用调度, dispose 后不再写目标.
