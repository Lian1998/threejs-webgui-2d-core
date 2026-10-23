# 渲染后端与资源链路

## BatchManager 统一顺序

`BatchManager.features` 将 handle 选项, 有效 Matrix4, 图层透明度, 显隐, pickable 和 paintKey 合并为 RenderFeature. 颜色顺序按 `(layer.order, primitive.order, insertionSequence)` 升序, 后绘制覆盖先绘制. 物理 height 不承担图层排序职责.

`build` 排序后只把连续同类区段交给后端. 例如 Polygon A, Polygon B 可合批; Polygon A, Line C, Polygon B 必须保留三个区段. 同类后端还可能按纹理页或容量继续拆分.

每个 RenderItem 的 object 被赋予递增 renderOrder 并加入 colorScene/pickScene. 公共 `createBatchMaterial` 使用 RawShaderMaterial/GLSL3, transparent=true, depthTest=false, depthWrite=false, 避免默认 opaque/transparent 分桶和深度遮挡改变 2D 画家顺序.

| 用户 API                 | 处理链                                                                     | Three.js 最终对象                                                       |
| ------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| addPolygon / setGeometry | PolygonPrimitive -> PolygonBatchBackend.encode -> MergedBatchBackend       | Mesh + BufferGeometry + BufferAttribute + RawShaderMaterial             |
| addLine / setPoints      | LinePrimitive -> LineBatchBackend.encode -> MergedBatchBackend             | Mesh + BufferGeometry + BufferAttribute + RawShaderMaterial             |
| addSprite / setImage     | SpritePrimitive -> SpriteAtlas -> SpriteBatchBackend -> QuadBatch          | Mesh + InstancedBufferGeometry + InstancedBufferAttribute + DataTexture |
| addText / setText        | TextPrimitive -> layoutText -> GlyphAtlas -> TextBatchBackend -> QuadBatch | Mesh + InstancedBufferGeometry + InstancedBufferAttribute + DataTexture |

这套新后端没有统一使用 Three.InstancedMesh 或 BatchedMesh. 逻辑图元也不是 Three.Object3D 子类.

## 多边形

`triangulatePolygonGeometry` 清理重复闭合点和环方向, 分别处理每个独立 polygon, 外环与其 holes 一起交给 earcut. MultiPolygon 的后续区域不能当作前一区域的孔洞. debug 下额外检查不合法环和孔洞关系.

`PolygonBatchBackend.encode` 缓存三角剖分, 应用 feature.matrix, 输出三角形 position, aColor, aPickColor 和 hit 参数. 合并后端使用非索引三角形缓冲, 每个顶点保留所属图元的颜色和 pick ID.

`MergedBatchBackend` 缓存 feature 签名和范围. 拓扑数量变化会使后续图元偏移变化, 但不一定需要扩容. 容量不足才按 2 的幂新建 BufferGeometry. 普通改色或变换使用 `updateAttribute`, 通过 `addUpdateRange` 和 `needsUpdate` 请求局部上传. Three.js 最终向 GPU 提交缓冲更新.

## 粗线和虚线

`LineBatchBackend.encode` 清理重复点, 沿变换后的路径生成三角形条带及端点/转角数据. 这里绘制的是 Mesh, 不依赖 WebGL 原生线宽.

aOffset 与 aWidth 在顶点 shader 中扩展线宽. widthMode=screen 时按 uScale 换算, 缩放视口时仍维持 CSS 像素宽度. widthMode=world 时使用世界宽度. 路径上的 aDistance 与 aDash 在片元 shader 中决定实段或间隙, 同时参与颜色与拾取覆盖.

当前 join 类型是 miter/bevel, cap 类型以 contracts 为准. 不应把规划中的可选能力写成现有实现已支持的 API.

## 图片与精灵

```text
resources.sprites.register({id,url})
  -> Viewer.registerImage
  -> SpriteAtlas.register / acquire
  -> ResourceStore.acquire 图片解码资源
  -> fetch + ImageBitmap + Canvas2D 打包
  -> 多页 DataTexture + SpriteRegion(uv,page,bindingKey)
addSprite / setImage
  -> SpriteBatchBackend.prepare 获取区域 lease
  -> build 按连续纹理页分组
  -> QuadBatch.sync 写入实例属性
```

注册时 Viewer 持有预加载 lease, 各图元后端还持有自己的区域 lease. unregister 阻止后续 acquire, 已有图元不会立即失去图片. 释放图元/Viewer 时分别回收引用. 页和 UV 采用追加分配, 不会因新图片进入而重排已有 UV.

`QuadBatch` 的基础几何只有一个四边形, 每实例记录 aMatrix, aRect, aUv, aColor, aPick, aHit 和样式. 设置 instanceCount 决定有效数量. 更新姿态不需要复制四边形基础顶点.

图片纹理保存半浮点预乘数据. shader 取样后还原直通 RGB 并应用 tint/opacity. 透明区域的 alpha 同时用于 ID pass, 可见像素拾取不会把整张图片矩形都当作实心.

## 字体, SDF 与标签

```text
resources.fonts.register
  -> GlyphAtlas.register -> FontStore.register / acquire
  -> ResourceStore -> fetch 字体 -> FontFace.load -> document.fonts.add
addText / setText
  -> TextBatchBackend.prepare
  -> layoutText 按需申请字形
  -> GlyphAtlas.acquire -> TinySDF -> 单通道 DataTexture
  -> 布局行, advance, bearing, anchor, padding
  -> 字形/背景 QuadInstance -> QuadBatch
```

FontStore 按 Viewer 分配内部 family, 避免相同业务字体名在 document.fonts 中相互覆盖. coverage/fallbackIds 由字体资源声明, 缺字处理和页容量回退由 GlyphAtlas 执行. 修改文本会申请所需字形, 不重新布局其他无变化的标签.

`layoutText` 将字形 SDF 的采样边距和字符 advance 区分. 标签自己的 padding 是另一个概念. 排版结果含字形 rect, 整体 rect 和 leases. TextBatchBackend 在新布局准备成功后释放旧布局引用, 并通过 token 拒绝迟到结果.

一个标签的背景和字形可占多个实例/纹理批次, 都写入同一逻辑 pickId. 空格没有字形墨迹时 visible 模式不会凭空命中, bounds 模式可以采用整体布局范围.

## 上传统计的含义

后端 stats 是累计缓冲写入/请求上传字节和范围, ViewerStats 转换为逐帧差值. 扩容会计入整块容量, 静态重复提交应无新增属性上传. 纹理更新按图集页计量, 不保证只传一个字符或图片的小矩形.

`frameCpuMs` 是 CPU 提交链的时间, 不是 GPU 真实执行时间. draw calls 由 renderer.info 统计. 不应把局部属性上传量等同于完整显存占用, 或把 CPU 帧时间直接当作显卡耗时.
