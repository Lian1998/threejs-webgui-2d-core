# 13. 文字批渲染

前置: 07, 12. 联动: 02, 04, 05, 14, 17, 18. 先读 00 和对应前置文档.

## 目标与范围

提供每标签独立的文字内容, 字号, 颜色, 描边, 圆角背景和 padding, 并在内部合批字形.
布局以标签为单位, 渲染以字形/背景 quad 为单位, 一个标签所有 quad 使用相同逻辑图元 ID.
高频位置更新不重新布局, 数值文本变化只更新受影响标签, 不重建整个文字批次.
首期实现中文/英文/数字的换行和对齐, 不承诺复杂文字 shaping, 自动避让或富文本.

## 建议目录与调试入口

- `core/primitives/text/TextHandle.ts`: 标签状态, 内容更新和资源就绪.
- `core/primitives/text/layoutText.ts`: 度量, 换行, 对齐和局部 bounds.
- `core/render/text/TextBatchBackend.ts` 与 `core/render/sprites/QuadBatch.ts` 的共享 shader.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/text.html`.
- 可以参考 `core/SDFText2D`, 不视为已有逐字形实例变换或动态 glyph 批后端.

## 必要类型草案

```ts
interface TextOptions extends CommonOptions {
  text: string;
  font: string;
  fontSize: number;             // world 为米, screen 为 CSS 像素.
  sizeMode?: SizeMode;          // 默认 world.
  lineHeight?: number;          // 同 fontSize 单位, 默认 fontSize * 1.2.
  letterSpacing?: number;       // 同 fontSize 单位, 默认 0.
  maxWidth?: number;            // 可选, 换行限制, 同 fontSize 单位.
  align?: "left" | "center" | "right";
  anchor?: Vec2;                // 默认 [0.5,0.5], 指完整布局框.
  color?: ColorInput;
  outline?: { color: ColorInput; width: number };
  background?: { color: ColorInput; opacity: number; radius: number };
  padding?: readonly [number, number, number, number]; // 上,右,下,左.
}

interface TextHandle extends PrimitiveHandle<TextOptions> {
  setText(text: string): this;
  ready(): Promise<void>;
}

interface TextLayout {
  readonly size: Vec2;
  readonly glyphs: readonly {
    region: GlyphRegion;
    offset: Vec2;
    size: Vec2;
  }[];
}
```

outline.width, background.radius 和 padding 均使用 fontSize 的同类单位, 要求有限且非负.
background/outline 字段整体替换, transform/hit 子字段按 00 合并. getOptions 返回深层只读快照.

## 实现步骤

1. 复用 04 的 handle 和 12 的资源服务. 初次布局等待字体/字形就绪, `ready()` 表示当前文本
   可提交渲染. 更新请求使用版本号, 异步旧布局不得覆盖新文本或在 dispose 后恢复实例.
2. 使用字形 advance, bearing 和 baseline 布局, 与 SDF padding 分开计算.
   支持显式换行, maxWidth 自动换行和三种水平对齐, 统一 CRLF, 空格计入布局宽度.
3. 字形度量从 rasterSize 换算到 fontSize. 空文字不提交可拾取 quad,
   空格和换行组成的标签可以有布局框, 有背景时可渲染背景, 不产生虚假字形 ink.
4. 对齐在每行内容宽度内计算, padding 再扩大完整布局框. anchor 相对完整布局框定位,
   旋转和平移作用于整个标签. radius 按背景实际大小约束, 避免过大圆角退化.
5. 布局以局部坐标保存. world 尺寸随相机缩放, screen 尺寸保持 CSS 像素,
   02 的 scale 转换尺寸与局部偏移, DPR 只调整栅格采样. 平移/旋转不重新测量文字.
   adapter 消费 07 的父子有效矩阵, 17 组合变换不回写布局坐标或只读的局部 transform.
6. 使用 07 接口实现字形批后端, 每个标签映射到可变长 slot 范围或多个小段,
   字形按纹理 bindingKey 分批. 扩容, 换页和文本长度变化时逻辑 handle 和事件保持稳定.
7. 标签背景先绘制, 本标签字形随后绘制, 整组遵循 05 的 layer/order/insertionSequence.
   不为了跨标签合批将某标签的背景移到其他标签文字之上, 不跨越必须保序的绘制区段.
8. glyph 实例保留标签变换, 颜色, outline, opacity 和 pickId, 不用共享 uniform 表达标签样式.
   SDF 描边宽度受 12 的栅格 padding/radius 限制, 超限明确 clamp 或报错, 不输出裁切的描边.
9. 同帧多次 setText 只布局最新内容一次. 内容, 字体, 字号, maxWidth 和 padding 触发布局,
   位置只改变换, 颜色/opacity 只改样式. 相同长度数值尽量复用槽位, 仅上传该标签必要范围.
10. 最新布局就绪前保留旧显示, 失败保留旧布局并由 ready() 反馈错误.
    新布局提交后释放不再使用的 glyph lease, 旧请求, 失败请求和销毁过程完整释放新增引用.

## 拾取与模块联动

- 实现 07 的 setPickId 和 preparePass, 预留独立 pick 预览, 本模块不导入 14.
- 每个标签的背景和所有字形使用相同 pickId, 不将字符编号作为业务图元 ID.
- visible 模式用同一 SDF 字形, 描边和圆角背景 alpha, 乘有效 opacity 后与 alphaThreshold 比较.
  alpha<=0 必须 discard, 正 alpha 小于阈值才 discard, 等于阈值可命中.
- 背景透明区域, 圆角缺口和字形空白不输出 ID. 标签颜色改变不改变 alpha 判定.
- bounds 模式由本后端的 pick pass 提交完整布局矩形, 不把每个 glyph quad 当作整体框.
  忽略字形/背景孔洞, 仍检查有效 opacity 与阈值, 两种模式都不能拾取隐藏标签.
- visible/pickable, 图层 LOD 和有效 opacity 来自 05, 变更须同时影响 color 与 pick pass.
- 14 接入后检验最终拾取顺序和 ownerId/partId. 17 使用标签 handle 组合设备, 18 调同一更新入口.
- 可选碰撞避让, HTML 文本编辑器和完整 3D billboard 留作后续, 不阻塞首期可读标签.

## 轻量验收

- 中文设备名, 多行文本, 数值, 不同对齐和 padding 无重叠错位, baseline 与字形度量一致.
- 每实例颜色, 描边和背景独立, 圆角 alpha 与 visible/pick 预览一致, bounds 显示整体矩形.
- 缩放和 DPR 切换后 screen 字号稳定, world 字号随视图变化, 标签变换不触发布局.
- 连续数值更新只改变对应标签, 缺字增量追加不重烘焙已有字形或重布局无关标签.
- 文本增长/缩短, 换字体, 跨页与 dispose 后没有错误 ID, 失效槽位或增长的 glyph 引用.
- 页面显示标签数, glyph 数, 布局次数, draw calls 和上传范围, 不设置无依据的固定 FPS 承诺.
