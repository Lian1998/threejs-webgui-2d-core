# 03. 帧调度与脏更新

前置: [02](./02-viewport-coordinates.md). 后续: 04, 06, 07, 16. 参照现有 `core/RenderScheduler/DirtyRenderScheduler.ts`, 按本任务重设实例作用域和更新顺序.

## 目标与接口

建议文件: `core/scheduler/FrameScheduler.ts`. 调试页: `multi-pages/debug/refactor/scheduler.html`.

```ts
interface FrameInfo {
  nowMs: number;   // RAF/performance.now 同一单调时间轴.
  deltaMs: number;
}
interface FramePipeline {
  flushUpdates(): void;
  renderColor(): void;
  afterRender?(): void;
}
class FrameScheduler {
  invalidate(reason?: string): void;
  onFrame(listener: (frame: FrameInfo) => void): () => void;
  onAfterFrame(listener: (frame: FrameInfo) => void): () => void;
  acquireContinuous(reason: string): () => void;
  flushNow(): void;
  dispose(): void;
}
```

## 实现步骤

1. 每个 Viewer 拥有独立 scheduler, 通过组合注入更新上下文. 不使用 static default 来连接图元 setter, 防止多画布相互影响.
2. invalidate 只标脏并安排最多一个 RAF. 理由集合只用于 dev 观察, 不随时间无限增长.
3. 帧顺序固定为: 获取 nowMs -> 插帧/动画 listener -> 合并图元变更 -> batch flush/资源上传 -> color render -> 已请求的 hover 拾取. 写操作与渲染之间不得出现半更新状态.
4. 持续动画使用独立 token 计数. `acquireContinuous` 返回幂等 release, 一个动画结束不能关闭其他动画. 所有 token 释放且无脏数据时停止 RAF.
5. 视口变化, 资源就绪, 图元更新, 选择样式变化都调用同一个 invalidate. 静态画面不周期性重绘, 新资源或主题更新在下一帧统一显示.
6. `flushNow` 用于点击拾取等必须读取当前场景的操作. 合并已有 pending 工作, 防止同一份脏数据重复处理. 若正在执行帧管线, 不递归执行自身, 延后本次补充请求.
7. RAF 时间保持真实间隔. 首帧 deltaMs=0, 页面从后台恢复后的大间隔交给 16 的时间策略处理. 页面隐藏时可暂停 RAF, 恢复时更新计时并 invalidate.
8. 所有渲染通道在 try/finally 中恢复修改过的 renderer 状态. 未来 pick 通道独立负责 renderTarget, viewport/scissor, clear, camera view offset 等状态恢复.
9. dispose 取消 RAF, 注销视口/DOM绑定, 清空 listener/token, 忽略已销毁对象的异步 invalidate. 多次 dispose 无副作用.

## 联动

- 04 通过 DirtyKind 标记变更, 07 在帧末统一上传. 同帧多次 setter 只应用最终状态.
- 16 只为仍在移动或等待采样的对象申请持续 token, 完成后释放.
- 14/15 点击先同步必要更新后执行当次坐标拾取; hover 只在有请求或相关视图变化时刷新.
- GUI 和共享样式更新使用同一条更新链, 不自行 render.
- 19 用 onAfterFrame 在完整管线后观察统计, 同一任务内多次 flushNow 各自通知, 不通过额外 RAF 或 microtask 丢失中间帧.

## WebGL 上下文丢失与恢复

- 在 Viewer 的 canvas 统一监听 webglcontextlost/restored. 丢失时 preventDefault, 暂停 GPU 提交与 RAF, 保留逻辑状态, CPU 图集数据和持续动画 token. 新消息只更新 CPU 状态, 不调用失效的 GL 对象.
- 向 14 发出失效通知, 终止业务层等待并作废所有在途拾取结果. lost context 的 GPU 句柄不再有效, 不无限等待某个读回才能继续生命周期清理.
- Three.js 完成自身 context restore 后, 06/10/12 恢复资源上传标记, 07 恢复 buffer/参数纹理, 14 重建 target. 自定义 GL 查询和缓存必须重建, 不只假定 Three.js 处理了全部工作.
- 逻辑 ID, handle, CPU binding 关系保持稳定. 恢复帧根据当前时间更新 16, 完成必要上传后再显示/拾取, 不补跑后台历史帧.
- dispose 清理上下文监听, 不恢复已销毁 Viewer. 20 按此恢复协议组装各模块.

## 轻量验收

- debug 记录 RAF/render/flush 次数: 同一同步任务内 invalidate 100 次, 只触发一帧.
- 同时申请两份持续 token, 释放一份后仍继续, 全部释放后停止.
- pending RAF 时 flushNow 不丢失更新, 回调中再次 invalidate 不形成递归循环.
- 两个 Viewer 独立刷新; 销毁其中一个不影响另一个, 异步回调不复活已销毁 Viewer.
- 如浏览器提供 WEBGL_lose_context, 手动丢失/恢复一次, 逻辑状态保持且显示重新可用; 拾取恢复在 14/20 补验收, 无需建立自动化 GPU 故障测试.
