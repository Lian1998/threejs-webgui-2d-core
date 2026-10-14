# 10. 精灵贴图图集

前置: 06. 联动: 07, 11, 14, 19. 先读 00 和本任务涉及的前置文档.

## 目标与范围

实现 Viewer 作用域内的图片图集, 支持异步加载, 多页, 增量追加, 稳定 UV 和引用计数.
图片 URL, 尺寸, 页编号和 GPU 纹理由资源服务管理, 业务只使用图片 ID.
复用本地 Three.js 的加载和纹理能力. SVG 先栅格化为位图, 再使用相同图集流程.
可以参考 `core/Sprite2D/Sprite2DAtlas.ts`, 不保留全局单例和重复装载覆盖旧 UV 的行为.

## 建议目录与调试入口

- `core/resources/sprites/SpriteAtlas.ts`: 注册, 区域分配和生命周期.
- `core/resources/sprites/AtlasPage.ts`: packing, 边缘填充和脏页上传.
- `core/resources/sprites/loadBitmap.ts`: 离线图片, SVG 栅格化和取消处理.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/sprite-atlas.html`.

## 必要类型草案

```ts
interface SpriteImageSource {
  id: string;
  url: string;                 // 本地 public/assets URL, 不默认请求 CDN.
}

interface SpriteRegion {
  readonly imageId: string;
  readonly bindingKey: string; // 对应纹理页或纹理页组, 给 07 分批使用.
  readonly page: number;
  readonly uv: readonly [number, number, number, number];
  readonly sourceSize: Vec2;   // 原始宽高像素, 不含 padding.
  readonly contentSize: Vec2;  // 图集中实际宽高, 可能经过受控缩小.
}

interface SpriteAtlasOptions {
  pageSize: number;
  maxPages: number;
  padding: number;
  oversized: "reject" | "downscale";
}

interface SpriteAtlas {
  register(source: SpriteImageSource): void;
  acquire(imageId: string, signal?: AbortSignal): Promise<ResourceLease<SpriteRegion>>;
  flush(): void;
  dispose(): void;
}
```

`ResourceLease<T>` 使用 06 的 `readonly value` 与幂等 `release()`. 图集区域的 lease 可采用相同接口,
由图集持有底层图片 lease 和纹理页. 多个精灵共享区域, 不重复解码或分配位置.

## 实现步骤

1. 注册 ID 到图片源的映射. 重复 ID 和不同 URL 明确报错, 并发 acquire 交给 06 去重.
   使用加载就绪 Promise, 解码成功后再分配区域. 失败不得留下半成品区域或永久 pending 状态.
2. 先实现简单, 可读的 shelf packing. 页尺寸受 `MAX_TEXTURE_SIZE` 限制, 新图片放不下时追加页.
   不重新打包已有区域. 超大图片按显式策略拒绝或等比缩小, 保留 sourceSize 供尺寸计算使用.
3. 页容量达到上限时给出带 imageId 的明确错误. 不静默创建无限页, 不覆盖尚有引用的区域.
   先允许区域释放后保留空洞, 后续可增加空闲区复用, 不要求首次实现压缩重排算法.
4. 图片外侧加 padding 和边缘颜色扩展, UV 指向内容区. 固定 Y 方向约定, 避免双重 flipY.
   透明孔洞保留 alpha, 边缘颜色扩展只处理 padding, 不把内容区透明像素改为不透明.
5. 首期按独立页纹理实现多页, 由 bindingKey 分批. 如采用 DataArrayTexture, 固定页组容量,
   新页组追加时不重建其他组. 不假定任意数量的 array layers 都受客户机支持.
6. 图片纹理声明 sRGB 输入, 着色器在线性空间做 tint, 输出只进行一次颜色转换.
   使用统一的直通 alpha 或预乘 alpha 策略, 在加载, 纹理和混合端保持一致, 用边缘案例验证.
7. 首期关闭 mipmaps, 用 LinearFilter 和 padding 避免串色. 如加入 mipmaps, 同步扩大隔离区,
   并验证缩小时不采样邻图. 不以开启 mipmaps 代替图集边缘处理.
8. CPU 仅写入新增区域, 同帧合并脏页上传. 初期允许整张脏页上传, 不重烘焙整个图集,
   不重传未变更的页. 统计上传字节数, 便于 19 判断是否需要进一步的局部 GPU 上传.
9. 原始图片, 位图和纹理都有明确所有者. 图集区域最后一个引用释放后才可复用位置,
   Viewer 销毁时关闭位图, 释放底层 lease 和纹理. 异步完成后再次检查 Viewer 是否已销毁.

## 联动要求

- 06 处理底层加载去重, 失败重试, 取消和引用计数, 图集不再造另一套通用 ResourceStore.
- 11 创建精灵时 acquire 区域, 换图采用先取得新区域, 再原子切换, 最后释放旧区域的顺序.
- 07 只读取 bindingKey, page 和 UV, 图集异步就绪后标记 resource 脏并请求 03 调度一帧.
- 14 的 visible 拾取采样相同 alpha 和 UV, 使用未经过 RGB 色彩变换的 alpha 通道.
- 20 的 `view.resources.sprites.register(source)` 先内部 register 再 acquire, 返回就绪 Promise,
  facade 保持预加载 lease 到 unregister 或 Viewer.dispose. 业务创建精灵只传 ID, 不手工操作 lease.

## 轻量验收

- 使用至少两页离线图片, 检查区域尺寸, UV, 上下方向和跨页加载结果.
- 透明洞, 半透明边缘和相邻红绿图片不串色. 放大, 缩小和高 DPR 下保留正确透明边界.
- 新图片追加后旧区域 UV 与页绑定保持有效, 只有必要页产生上传.
- 同 ID 并发加载只解码一次. 一张图被多个精灵使用时, 释放其中一个仍可正常显示.
- 加载失败, 超大图片, 页容量上限和加载过程中 dispose 都有可解释结果及完整释放.
- debug 页面显示页数, 区域数, 活跃引用和上传字节, 不接入真实业务.
