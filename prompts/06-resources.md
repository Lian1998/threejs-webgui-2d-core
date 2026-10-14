# 06. 共享资源与释放

前置: [03](./03-render-scheduler.md). 后续: 07, 10, 12. 此模块只负责资源生命周期, 图集排版分别在 10/12.

## 目标与接口

建议文件: `core/resources/ResourceStore.ts`, `core/resources/ResourceLease.ts`. 调试页: `multi-pages/debug/refactor/resources.html`.

```ts
interface ResourceLease<T> {
  readonly value: T;
  release(): void; // 幂等, 一个持有者一份 lease.
}
interface AcquireOptions { signal?: AbortSignal }
class ResourceStore {
  acquire<T>(
    key: string,
    loader: (signal: AbortSignal) => Promise<T>,
    disposer: (value: T) => void,
    options?: AcquireOptions,
  ): Promise<ResourceLease<T>>;
  dispose(): void;
}
```

## 实现步骤

1. 每个 Viewer 自有资源索引, 同一 key 的并发 acquire 共用一次加载, 分别返回 lease. key 包含资源类型, 版本与影响结果的参数, 不允许不同类型借用同名 key.
2. 明确缓存所有权: 资源只有仍被租用或显式预加载持有时存活. 最后 lease 释放后调用 disposer 并移除条目. 后续 acquire 可以重新加载, 不无限保留无主 GPU 资源.
3. 使用 pending/ready/error 状态. 失败时所有等待者得到同一可理解错误, 清理条目以允许重试, 不永久缓存失败 Promise.
4. 取消一个等待者只取消它的申请, 其他等待者继续. 无等待者且没有持有者时可中止底层加载; 不支持中止的解码在返回后立刻释放未使用结果.
5. store.dispose 时使所有 lease 失效, 中止 pending 请求并释放 ready 资源. 迟到的 async 结果也要 disposer, 防止销毁后又创建纹理/注册图元.
6. 支持本地 URL, Blob/ImageBitmap 和已有纹理的适配加载器. dispose 由所有权决定: 外部借入资源不擅自 dispose, 内部创建的 Texture/Geometry/Material 与 ImageBitmap.close 明确配对.
7. 加载就绪与必要 GPU 上传通过 scheduler.invalidate 合并. 禁止每完成一张图片直接 render. 10/12 的图集服务持有基础资源 lease, 使用者持有图集区域自己的引用.
8. 给 dev 提供资源数量, pending 数和引用数快照, 用于 19/20 观察, 不把全局缓存作为默认设计.

## 联动

- 10 负责图片去边缘污染, 纹理页和 colorSpace, 12 负责字体就绪与字形参数. Store 不猜测贴图用途.
- 07 释放批次自己的 geometry/material, 共享图集纹理由图集服务统一释放, 不能让一个 batch 释放仍被其他 batch 使用的纹理.
- 04/17 dispose 归还本对象持有的 lease. 一个组合设备销毁不应导致其他设备贴图丢失.
- 运行时离线资源放在本地 libs/public/assets, 不额外依赖远程字体或图片服务.
- 遵循 03 的 context 协议, 活跃资源保留可重传的 CPU 数据/来源. 恢复时重新标记纹理等 GPU 资源上传, 不重新请求每个图元的共享图片或撤销有效 lease.

## 轻量验收

- 两个 acquire 同一 key 只加载一次, 释放一个后另一个仍可用, 最后释放只 dispose 一次.
- pending 期间取消单个申请, 全部取消, Viewer 销毁, 加载失败与重试都有明确结果.
- 用自增 fake disposer 或 debug 资源计数检查释放, 不需要搭建大规模测试环境.
- 迟到的资源回调不重绘已销毁视口, 外部借入资源不被错误释放.
