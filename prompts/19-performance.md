# 19. 性能观察与轻量场景

前置: 15, 16, 17, 18. 后续: 20.

## 目标与边界

建立一个可复现, 可调节负载的观察页面, 确认批量渲染和局部更新发挥作用, 发现主要耗时来源. 未提供客户机规格, 设备数和数据频率前, 不承诺固定 FPS 或宣称比模板快某个倍数.

只做轻量场景与统计, 不引入重型测试服务, 持续压力测试框架或线上监控. 真实业务数据与 Socket.IO 接入留给用户集成.

实现目录: `core/debug/refactor/`, `multi-pages/debug/refactor/performance.html`. 核心必要计数接口放在各自模块, 性能场景本身不从生产入口导出.

## 场景与类型草案

```ts
interface SceneLoad {
  deviceCount: number;
  movingRatio: number;
  updateHz: number;
  labelsVisible: boolean;
  labelChangeHz: number;
  pipelineCount: number;
  pointsPerPipeline: number;
  dpr: number;
  seed: number;
}

interface FrameStats {
  frameCpuMs: number;
  updateCpuMs: number;
  colorCpuMs: number;
  pickCpuMs: number;
  pickReadbackMs: number;
  colorCalls: number;
  pickCalls: number;
  uploadedBytes: number;
  uploadRanges: number;
  activeMotionCount: number;
  batchCount: number;
  glyphCount: number;
  atlasPages: number;
  gpuMs?: number;
}
```

这些是观察字段, 不要求所有模块共享一个巨大统计对象. 各模块提供只读 snapshot 或可选 debug observer, 聚合器在帧边界汇总. 未支持的字段显示 unavailable, 不伪装为0.

## 可调场景

- 从小负载启动, 通过 GUI 增加数量和频率. 改变负载有显式 apply/rebuild, 不在滑动数字控件时连续创建大量图元.
- 组合设备包括精灵车身, 附属多边形, 标签和路径. 使用固定随机种子, 使两次相同配置具有同样轨迹及初始布局.
- 移动比例独立于设备总数, 更新频率独立于渲染频率. labelChangeHz 与位置更新分开, 便于观察文字重排与字形上传成本.
- 管线包含直段, 转弯, 虚线和重叠区域. 点击/悬浮, 图层过滤与容差可切换, 观察拾取额外 pass 和读回.
- DPR 显式显示实际生效值及画布像素尺寸, 可比较1/2等值, 避免 CSS 尺寸一样但 GPU 负载差异被隐藏.
- 页面支持只显示, 持续移动, 文字变化和拾取四类组合开关, 方便定位负载来源, 不将它们拆成多套实现.

## 实现步骤

1. 以固定采样周期汇总帧统计, 控件与统计文本低频刷新. 不每帧创建大量字符串, console输出或对全部实例建立 `.listen()`.
2. 用 `performance.now()` 记录更新, 颜色提交和拾取 CPU 时间. 明确它测量调用时间, 不能直接解释为 GPU 已完成执行时间.
3. 分开记录 color/pick pass 的 draw calls. 多 pass 时管理 `renderer.info` reset 时机, 防止只看到最后一遍或累计多帧.
4. 07 的实际上传入口累计字节数及范围数, 包括 buffer/texture 上传, 不由 requested dirty 数量推断 GPU 传输量.
5. 展示逻辑图元数量, 批次数, 平均批容量利用率. 数量增加导致有序区段变多是可解释现象, 不以极少 draw calls 换取错误绘制顺序.
6. 14 记录 pick pass 次数与读回调用耗时. 观察悬浮合并, 最新请求替换与点击单次新查询, 不靠永远读全画布提高结果质量.
7. 12/13 统计字形布局次数, 图集页数和增量上传. 区分首次字体/纹理加载的冷启动与预热后动态标签更新.
8. 可选启用 `EXT_disjoint_timer_query_webgl2` 测 GPU 时间. 异步轮询结果, 检查 disjoint, 未支持时只保留 CPU/计数观察.
9. 统计采集可关闭. 页面关闭或切换配置时释放统计查询, 模拟更新源, GUI, motion绑定和Viewer, 不积累多套场景.
10. 输出包含配置, 分辨率, DPR, 浏览器, GPU能力, 采样时长及是否预热的可复制摘要. 不写入远程服务.

## 观察方法

先让资源加载和 shader 编译结束, 再采集一段短窗口. 冷启动单独报告. 帧时间显示中位数/p95和采样数, 避免只看某一个瞬间 FPS.

静态场景在按需调度下不连续绘制, FPS 此时没有比较意义. 同时展示 RAF/实际渲染帧数及 activeMotionCount, 静止后应返回空闲.

浏览器掉帧和高温降频可影响结果. 同一客户机比较时固定窗口大小, DPR和负载, 记录热机状态, 不把不同机器或冷/热启动结果合成一项排名.

如需以后与 OpenLayers 比较, 保证设备, 文本, 更新频率, 拾取和可见范围等价. 本任务只参照 templates 的业务复杂度建立新场景, 不改动老模板.

## 联动约定

- 03 显示已合并更新数和持续调度状态, 04/07 显示稳定handle对应的局部更新量.
- 16 的模拟推送在页面管理, 只送合法 MotionSample. GUI 切换频率时不会遗留旧定时器.
- 17 使用真实组合操作创建设备, 18 只为当前选中实例显示细节面板, 不给每台设备同时创建可见文件夹.
- GPU timer 是可选观察能力, 无扩展时框架仍可使用. WebGL2 基础不可用按01规则明确停止.
- 本任务通过前置模块的内部组装 helper 创建场景, 不反向依赖尚未实现的 20 公共 Facade. 20 完成后可切换为公开入口.
- 遵循 03 的 context 协议, 丢失时取消 timer 查询并标记 GPU 时间不可用, 恢复后重新创建查询资源.

## 轻量验收

1. 小场景完成创建, 移动, 标签变化, 筛选拾取和删除. 随后增大负载, 页面能显示实际 draw calls, CPU 时间与上传量.
2. 只改变位置时不反复重建图集, 文字布局和所有几何. 关闭标签变化后该部分布局统计明显停止.
3. 开关拾取能看到额外 pass/readback成本, 同一帧颜色与拾取计数不混淆. 静止后无需持续渲染.
4. 两次相同seed/config可以复现同样场景. 不支持GPU时间扩展时显示 unavailable且其他统计正常.
5. 重建场景数次和打开两个Viewer后, 各自数量, 选中态和统计互不串用, 关闭页面后无残留循环.
