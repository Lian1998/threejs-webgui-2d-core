# core 源码导读

本文按当前源码解释调用链. `prompts/00-20` 是规划和验收依据, 其中的类型草案及旧路径不能替代实际实现.

建议从 [整体链路](./01-runtime.md) 读起, 再看 [渲染与资源](./02-rendering.md), [拾取和设备](./03-interaction.md), 最后用 [独立调试指南](./04-debug.md) 对照源码.

当前公开入口是 [core/index.ts](../../core/index.ts).

| 规划          | 实际实现                                                            | 主要职责                                             | 底层依赖                                             |
| ------------- | ------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| 00 公共契约   | `core/contracts/index.ts`                                           | Options, Handle, RenderFeature, RenderContext 等边界 | 类型, 无运行时 GPU                                   |
| 01 离线工程   | `vite.config.ts`, `libs`                                            | 本地 r170 别名, HTML 多入口                          | Vite, 本地 Three.js                                  |
| 02 坐标与视口 | `LocalCoordinateAdapter`, `Viewport2D`, `OrthographicCameraAdapter` | 单位适配, CSS/DPR, 平移缩放, 屏幕换算                | OrthographicCamera, Vector3                          |
| 03 帧调度     | `FrameScheduler`                                                    | 同帧合并, 持续动画令牌, 暂停恢复                     | RAF, 不直接调用 Three.js                             |
| 04 图元       | `PrimitiveFactory`, `BasePrimitive`, `PrimitiveRegistry`            | 稳定 API, 校验, 身份和脏状态                         | Matrix4, Quaternion, Vector3                         |
| 05 图层       | `LayerHandle`, `LayerManager`                                       | 显隐, 透明度, LOD, 顺序                              | 逻辑状态, 不创建 Group                               |
| 06 资源       | `ResourceStore`, `ResourceLease`                                    | 加载去重, 取消, 引用释放                             | 注入 loader/disposer                                 |
| 07 合批       | `BatchManager`, `MergedBatchBackend`, `QuadBatch`                   | 有序分批, 缓冲更新, 扩容                             | Scene, Mesh, BufferGeometry, InstancedBufferGeometry |
| 08 多边形     | `PolygonBatchBackend`, `triangulatePolygonGeometry`                 | 外环, 孔洞和多区域三角剖分                           | earcut, BufferAttribute                              |
| 09 线         | `LineBatchBackend`                                                  | 路径扩展, 端点, 转角, 虚线                           | Mesh, RawShaderMaterial                              |
| 10 图片图集   | `SpriteAtlas`                                                       | 图片加载和稳定 UV                                    | ImageBitmap, Canvas2D, DataTexture                   |
| 11 精灵       | `SpriteBatchBackend`                                                | 图片区域转换为实例                                   | QuadBatch                                            |
| 12 字体图集   | `FontStore`, `GlyphAtlas`                                           | 字体加载, fallback, SDF 和度量                       | FontFace, TinySDF, DataTexture                       |
| 13 文字       | `layoutText`, `TextBatchBackend`                                    | 排版, 背景, 字形实例                                 | QuadBatch                                            |
| 14 拾取       | `GpuPicker`                                                         | 小区域 ID pass 和读回                                | WebGLRenderTarget, WebGLRenderer                     |
| 15 交互       | `InteractionController`                                             | hover, selection, owner/part 事件                    | DOM, picker, scheduler                               |
| 16 插帧       | `MotionController`, 内部 `MotionBinding`                            | latest/timestamped, 位置与最短角度插值               | 共享 FrameScheduler                                  |
| 17 组合       | `EntityRegistry`, `EntityView`                                      | 跨图层部件和父变换                                   | Matrix4, 无场景树 Group                              |
| 18 GUI        | `DebugField`, `DebugRegistry`, `DebugProxy`, `DebugGUIManager`      | 元数据, 实例注册, 代理编辑                           | lil-gui                                              |
| 19 性能       | `core/debug/refactor/PerformanceObserver.ts`                        | 观察真实帧, 滚动采样和摘要                           | ViewerStats, 无额外 RAF                              |
| 20 交付       | `core/index.ts`, `core/examples/SimulatedDevice.ts`                 | API 导出和业务组合示例                               | Viewer2D                                             |

阅读顺序: `Viewer2D` 构造器 -> `PrimitiveFactory.create` -> `BasePrimitive.update` -> `FrameScheduler.run` -> `BatchManager.build` -> 对应后端 `build/encode` -> `Viewer2D.renderColor`.

当前源码中 `core/legacy` 是历史模块, 新渲染链不会自动使用旧 MeshLine/Sprite2D/SDFText2D. 老示例里尚有迁移前的别名, `SimulatedDevice.ts` 也仍引用已不存在的 `../public`. 本次独立单元使用实际存在的入口, 不加载这些旧示例.
