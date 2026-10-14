# 验证记录

本轮只验证新框架及轻量模块场景, 没有接入真实设备数据, Socket.IO 或改写 source/templates. 浏览器记录使用 Chromium 156 + ANGLE SwiftShader/WebGL2, 用于渲染与拾取正确性检查, 不能代表客户机硬件 GPU 的性能.

## 工程检查

- 环境: Node 24.21.0, npm 12.2.0, 本地 Three.js r170.
- `npm run typecheck:core` 已通过. 范围包含新旧 core, 独立 debug TS 与工程配置.
- `npm run build:core` 已通过, 输出 `dist-core/webgui-2d.js`, 不复制业务 public 资源. 生产库中没有 lil-gui, 调试代理或 GUI 动态模块.
- `npm run build:debug` 已通过, 输出 `dist-debug`, 包含19个新模块页面, 离线检查页, 索引和原有历史 debug 页面.
- 所有运行时图片/字体均使用本地 public 资源. Noto Sans SC 示例子集, 字符覆盖清单, OFL 和来源位于 `public/fonts`.

工程依赖按现有 package.json 安装, 未写锁文件或修改离线 Three.js. 资源运行时可离线, 开发依赖首次安装仍需要 npm 缓存或网络.

## 16 组轻量检查

调试场景的基础检查按钮实际执行以下模块函数:

| 模块 | 组数 | 已覆盖 |
| --- | --- | --- |
| foundations | 5 | 调度合并, 独立持续 token, 坐标与相机往返, 最短弧和时间戳插帧, 资源取消/引用计数, 父子组合/销毁 |
| interaction | 1 | owner/part状态, 事件顺序, 过期hover, 删除失效, 幂等释放 |
| primitives | 7 | patch合并, 快照保护, ID寿命, 孔洞/MultiPolygon, 透明度, 分段粗线, 异常回调与pick批次释放 |
| sprite/text | 3 | 实例上传范围及恢复, 字形布局失败释放, 样式/锚点缓存, 16385字形分块, 最后成员跨chunk释放 |

16组已在Node环境和真实浏览器中执行通过. 不依赖重型测试服务或全场景截图回归.

## 真实 WebGL2 检查

初轮综合场景在 DPR=1/1.25/2 下已通过可见像素, 本地SVG透明洞, 图层过滤, bounds/opacity, priority, 虚线间隙, 逐管线CSS容差, 小块crop, 固定CSS线宽, 中文增量字形, 异步ID生命周期以及空闲调度检查. 上下文丢失/恢复和独立GLSL3/lil-gui页面也通过.

精灵/字库专属浏览器检查已通过:

- GLSL3精灵, SDF字形和背景实际编译, 无shader错误或未捕获页面错误. 暗色opaque像素为 `[5,10,15,255]`, 半透明像素为 `[11,19,29,255]`.
- 环形透明中心visible不命中, bounds命中, opacity=0不命中, 半透明alphaThreshold=0.9过滤而0.1命中.
- 文字anchor从中心变为[0,0]后, await ready得到新布局和对应拾取位置.
- SpriteAtlas使用64px两页时, 增量加载保持旧UV, 并发请求共享region, 超容量明确reject且无底层lease泄漏. 两页上传65536bytes, 无变化再次flush为0, 位图与纹理完整释放.
- GlyphAtlas使用128px两页时, 追加字形保留UV, 已知字超容量和coverage缺字均使用保留fallback. 上传32768bytes, 无变化flush为0. unregister保留活跃字形租约, 最后引用释放FontFace与两页纹理.
- Viewer销毁后canvas和GUI归零, 自有 `webgui_` FontFace归零. 调试页面的本地UI字体和lil-gui自身通过data URL安装的共享字体样式可能继续存在, 不属于Viewer持有的字体.

最终综合复验44/44通过, 无未捕获页面错误和console/shader错误. 新增通过项包括构造失败清理, GUI每实例编辑与primitive/entity命名冲突, 完整性能控件, 双Viewer自有字体清理, 同步点击与异步GPU读回重叠. 连续两次同步flush均单独采到帧, 两次改色累计提交32bytes. 拾取停用后GPU passes不增长, 恢复后正常选择.

上下文恢复后背景像素保持 `[16,28,42,255]`, 显示与拾取均正常. Debug DOM/GUI另加载官方Noto本地UI子集, 在无系统中文字体的主机上也能显示中文控件, 不进入SDK生产包.

性能轻量复验使用64台设备, 移动比例25%, 标签2Hz, 16条管线和seed=31415, 得到42个预热后CPU帧样本并确认活跃对象不超过16. 此结果只验证采样与配置生效, 不作为硬件性能承诺. 自动检查脚本为 `.scripts/debug/browser-smoke.mjs`, JSON结果写入 `/tmp/webgui-browser-results.json`. 最后视觉检查截图在 `/tmp/webgui-delivery.png`, 未加入长期截图测试.

## 性能摘要的解释

页面使用固定seed, 可调设备数/移动比例/更新频率/标签频率/管线数量与点数. DPR控件表示上限, 摘要同时记录物理DPR与实际drawing buffer比例. 相机center/scale, 分辨率, 浏览器, 能力, 热机标记和预热状态一起输出.

帧监听仅观察既有调度器, onAfterFrame在整帧之后同步取值, 同一任务内连续flushNow也不会丢样本. 默认跳过资源就绪后600ms预热期, CPU median/p95使用最近最多1200帧, 上传量及颜色calls累计预热后采到的帧. 拾取calls/passes是采样窗口起止的累计差值. 活跃帧间隔与静止画面的按需帧计数分开. 不创建新的持续RAF.

上传量统计框架提交的buffer范围和实际绑定的脏纹理页, 不把逻辑dirty请求量当上传量. GPU timer显示unavailable, CPU提交耗时不解释为GPU完成时间. 平均批次利用率为各颜色批次的逻辑用量/容量比例的平均值, 合并顶点与quad实例使用各自单位计算.

尚未进行等价OpenLayers场景, 真实客户机数量和网络数据的性能比较, 不承诺固定FPS或加速倍数.

## 保留的旧业务构建问题

默认 `npm run build` 仍检查原source入口, 当前有4项既有类型错误:

- `source/classes/Devices/AGV.ts:7`, `ASC.ts:8`, `STS.ts:13`: 从viewport导入的orthoCamera未导出.
- `source/classes/Devices/STS.ts:100`: ThreejsGroups.Void不存在.

这些属于未接入的新旧业务衔接, 未通过修改source或放宽全局类型检查隐藏. 新框架的 `typecheck:core`, `build:core` 和 `build:debug` 独立可用. `core/index.ts` 保留legacy兼容出口, 新代码建议导入 `core/public.ts`.
