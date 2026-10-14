# 12. 字形与字体图集

前置: 06. 联动: 07, 13, 19. 先读 00 和 06, 本任务不实现标签渲染或全文排版.

## 目标与范围

使用离线本地字体和 tiny-sdf 建立可增量追加的字形图集, 重点支持中文, 英文和设备数值.
缓存缺字时只生成新增字形, 已有字形 UV, 页编号和布局度量保持稳定, 不全量重烘焙.
字体加载完成后才能测量和生成字形, 避免在网络/字体尚未就绪时烘焙错误的系统替代字体.
可以参考 `core/SDFText2D/TinySdfAtlas.ts`, 不保留一次 prepare 后无法补字的限制.

## 建议目录与调试入口

- `core/resources/fonts/FontStore.ts`: 本地 FontFace, 资源就绪和 fallback 链.
- `core/resources/fonts/GlyphAtlas.ts`: 字形缓存, 稳定 packing 和区域 lease.
- `core/resources/fonts/GlyphPage.ts`: SDF 页缓冲, 容量和脏页上传.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/font-atlas.html`.

## 必要类型草案

```ts
interface FontSource {
  id: string;
  url: string;                 // 离线 woff2/woff/ttf 文件.
  family: string;              // 使用独立内部 family, 避免系统同名覆盖.
  weight?: string;
  style?: string;
  fallbackIds?: readonly string[];
  coverage?: readonly string[]; // 可选的字体字符覆盖清单.
}

interface GlyphRegion {
  readonly fontId: string;
  readonly glyph: string;
  readonly bindingKey: string;
  readonly page: number;
  readonly uv: readonly [number, number, number, number];
  readonly advance: number;
  readonly bearing: Vec2;
  readonly inkSize: Vec2;
  readonly sdfPadding: number;
  readonly rasterSize: number;
}

interface GlyphAtlasOptions {
  pageSize: number;
  maxPages: number;
  rasterSize: number;
  radius: number;
  cutoff: number;
}

interface GlyphAtlas {
  ready(fontId: string): Promise<void>;
  acquire(fontId: string, glyph: string): Promise<ResourceLease<GlyphRegion>>;
  ensure(fontId: string, text: string): Promise<void>;
  flush(): void;
  dispose(): void;
}
```

使用 06 的 ResourceLease 语义. 图集持有字体 lease, 使用标签持有字形区域 lease.
advance/bearing/inkSize 按 rasterSize 的栅格像素计量, 13 统一换算至标签字体尺寸.

## 实现步骤

1. 注册本地字体源并通过 06 并发去重加载. `FontFace.load()` 成功后添加至 document.fonts,
   `ready(fontId)` 表示该 fontId 可测量和生成. 底层字体 lease 最后释放时才从 document.fonts 移除.
   document.fonts 是全局集合, 实际内部 family 包含 Viewer scope, fontId 与资源版本, tiny-sdf 始终使用该内部名称. 释放时仅 delete 自己创建的 FontFace, 不按 family 删除其他 Viewer 的字体.
2. 禁止默认 CDN 和无说明的系统字体兜底. 缺少字体文件时返回可解释错误,
   如配置了本地 fallback 链则按顺序处理, debug 页面显示实际使用的 fontId.
3. 字形缓存 key 包含 fontId, weight/style, rasterSize, radius/cutoff 和字形内容.
   用 `for...of` 或等价 Unicode 遍历, 不用 `split("")` 拆坏代理对. 换行由 13 处理.
4. 区分缓存缺字与字体缺字. 缓存缺字调用 tiny-sdf 增量生成, 字体缺字按已知 coverage/fallback
   处理. 不把 `document.fonts.check()` 的成功误当成单个字符有真实字形的证明.
5. 首期保证中文, 英文, 数字与常用符号. 不承诺复杂文字 shaping 和完整 emoji 支持,
   未支持的组合字符返回明确 fallback. 预留可替换的字形生成接口, 避免布局依赖 tiny-sdf 私有字段.
6. 用 glyphAdvance, glyphLeft, glyphTop 和实际 inkSize 保存布局度量,
   空格有 advance 但可没有 ink quad. SDF padding 与版面间距分开, 不以栅格矩形宽度代替 advance.
7. 固定页大小与单字形安全边距. SDF 为数据纹理, 使用 RedFormat/NoColorSpace,
   关闭 mipmaps. 线性采样保留 SDF 梯度, padding 需覆盖允许的描边范围.
8. 稳定 shelf packing 追加字形, 页满追加页或页组, 不重排已有字形.
   页上限受配置和 GPU 能力约束. 预留本地 fallback 字形区域, 容量不足时不中断已有标签.
9. 容量不足/不可生成时返回 fallback 字形并记录原因, 保持确定的 advance 规则.
   未预留 fallback 且资源不可用时 reject, 不返回无效 UV. 不删除仍被标签引用的字形来强行腾页.
10. 同帧合并新增字形的脏页上传. 首期允许上传整张脏页, 未变更页不上传,
    不重新生成已缓存字形. atlas generation 只用于绑定变化, 不强迫所有标签重新布局.
11. 释放标签后递减字形引用. 可保留未引用字形作为受容量限制的缓存,
    如需回收区域, 仅回收无引用区域. dispose 释放纹理, 页缓冲, FontFace 和底层资源 lease.

## 联动要求

- 13 在布局前 await font/glyph 就绪, 字体和字形不会由每个标签重复加载或各建一份 atlas.
- 字体尺寸是布局参数, 同一 rasterSize 的字形可被多个字体尺寸标签复用.
- bindingKey 给 07 分批, 新页只影响使用新字形的标签, 已有批次和 UV 保持有效.
- 03 调度新增字形的上传和相关标签刷新, 不要求持续 RAF 才能显示追加的中文.
- 20 的 `view.resources.fonts.register(source)` 登记字体源并等待 ready, facade 持有预加载 lease,
  直到 unregister 或 Viewer.dispose. 字形区域引用独立管理, 本模块就绪 Promise 可用于独立 debug.

## 轻量验收

- 断网加载本地字体, 检查中文, 英文, 数字, 空格和常用标点的度量与字形.
- 初次只生成少量中文, 之后追加新文本, 新字形数量增长且旧字形 UV/页面不变.
- 相同字形并发请求只生成一次, 同字体不同字号复用字形数据.
- 缺字, 缺字体, 页上限与 fallback 有明确显示结果, 不无限重试或悄悄请求外网.
- 卸载标签和 Viewer 后字形引用, 页纹理和 FontFace 按所有权释放.
- 两个 Viewer 用同一 fontId/family 注册不同本地字体, 度量和生成互不串用, 关闭一个后另一个仍可生成新字形.
- 页面显示缓存命中, 新生成数, 页数, 引用和上传量, 不引入重型字体解析测试.
