# 11. 精灵批渲染

前置: 07, 10. 联动: 02, 04, 05, 14, 17, 18. 先读 00 和对应前置文档.

## 目标与范围

提供每实例可换图, 改色, 显隐和移动的精灵 handle, 业务不操作 Three.js 材质或 GPU 槽位.
默认使用共享四边形和实例属性, 使用 07 的后端接口自动分批, 顺序变化时保持 handle 稳定.
可以参考 `core/Sprite2D`, 但现有 RawShaderMaterial 不视为已支持 InstancedMesh.
首期精灵位于 XZ 平面, 屏幕尺寸表示固定 CSS 像素大小, 不实现透视 billboard.

## 建议目录与调试入口

- `core/primitives/sprites/SpriteHandle.ts`: 公开实例状态和更新方法.
- `core/render/sprites/SpriteBatchBackend.ts`: 槽位, 脏范围和批次管理.
- `core/render/sprites/shaders/`: color/pick 共用的几何, UV 和 alpha 处理.
- `core/debug/refactor/index.ts` 与 `multi-pages/debug/refactor/sprites.html`.

## 必要类型草案

```ts
interface SpriteOptions extends CommonOptions {
  image: string;
  size: Vec2;                  // world 为米, screen 为 CSS 像素.
  sizeMode?: SizeMode;         // 默认 world.
  anchor?: Vec2;               // 默认 [0.5,0.5], [0,0] 为左下角.
  tint?: ColorInput;           // 默认白色, 与贴图颜色相乘.
}

interface SpriteHandle extends PrimitiveHandle<SpriteOptions> {
  setImage(imageId: string): this;
  setSize(size: Vec2, sizeMode?: SizeMode): this;
  setTint(color: ColorInput): this;
  ready(): Promise<void>;      // 当前换图请求就绪, 失败时 reject.
}

// 内部类型, 业务不持有或修改.
interface SpriteInstanceData {
  effectiveMatrix: THREE.Matrix4; // 使用 07 的父子有效变换入口, 不给业务暴露.
  size: Vec2;
  sizeMode: SizeMode;
  anchor: Vec2;
  region: SpriteRegion;
  tintLinear: readonly [number, number, number];
  effectiveOpacity: number;
  pickId: number;
}
```

补全 patch 类型以合并 `transform` 和 `hit`. 尺寸要求有限且大于 0, anchor 要求有限且位于 [0,1].
`getOptions()` 和 transform getter 返回只读快照, 修改嵌套数组不会改变内部状态.

## 实现步骤

1. 复用 04 的 ID, 事件和生命周期. 创建时保留逻辑实例, 资源未就绪前不提交可拾取四边形.
   `ready()` 反馈初次加载和换图完成. 不要求 20 的最终 Viewer 入口才能调试本模块.
2. 使用 10 的区域 lease. 每实例存储 region, anchor, tint, sizeMode 和必要变换数据,
   共享材质中只放全批通用状态, 不用共享 uniform 表达每实例颜色, opacity 或尺寸.
3. 基于单位四边形计算锚点偏移与 size, 再用有效矩阵一次性应用变换, 不重复乘局部 scale.
   anchor 是局部归一化坐标, rotation 使用 00 的平面内逆时针约定, 不能沿用不明旧 heading 单位.
   adapter 使用 07 的有效矩阵入口, 17 的 parentTransform 与部件局部 transform 均参与变换.
4. world 尺寸参与世界缩放. screen 尺寸通过 02 的 scale 转换为世界跨度,
   DPR 只影响栅格化, 不把 CSS 像素尺寸重复乘 DPR. transform.scale 仍可缩放精灵自身.
5. 高度来自 transform.height, 视觉顺序来自 05. 后端不能依赖物理高度维持 layer/order,
   合批只跨越合法的连续绘制区段. 图片页不同或程序不同则使用相应批次.
6. 移动, 旋转, tint, opacity 和显隐写必要实例范围, 同帧合并上传.
   换图更新 UV/页绑定, 只有绑定变化时迁移批次, 不重建其他实例的 geometry.
7. 换图使用请求版本号处理乱序返回. 新区域就绪前保留旧图, 最新请求失败时保留旧状态,
   被覆盖请求的 lease 及时释放. dispose 后的异步返回不得复活实例或污染新槽位.
8. 将 sRGB tint 归一化到线性颜色, 结合 10 的纹理颜色空间完成一次颜色输入/输出转换.
   effectiveOpacity = 图元 opacity * 图层 opacity, 17 的父级显隐作为独立条件, 不改写局部状态.
9. 明确实现所选后端的实例矩阵读取与自定义属性. 不凭 `isInstancedMesh` 或已有 shader 名称
   推断其已支持实例变换. 启用 debug shader 错误输出, 验证逐实例位置和样式确实不同.

## 拾取与模块联动

- 实现 07 的 `setPickId(primitiveId,pickId)` 和 `preparePass(context)` 接口, 本模块不导入 14.
- color/pick 共用几何, transform, UV, layer 显隐和透明掩码, pick 通道输出纯 ID, 禁用颜色混合.
- visible 模式按贴图 alpha 乘有效 opacity 与 `hit.alphaThreshold` 比较, 透明孔洞不输出 ID.
  alpha<=0 必须 discard, 正 alpha 小于阈值才 discard, 等于阈值可命中.
- bounds 模式使用精灵完整矩形, 忽略贴图孔洞, 仍检查有效 visible/pickable, opacity 和阈值.
  隐藏或有效 opacity 为 0 的对象不能留下拾取残影.
- 图片未就绪时两种模式均不拾取. 14 接入后再验证优先级, 过滤和最终 PickResult.
- 每个 GPU 槽位绑定逻辑 primitiveId, ownerId/partId 存储在注册表, 不混进像素 RGB.
- 17 通过 handle 组合设备部件, 18 通过相同 setImage/update/setter 编辑单个精灵.

## 轻量验收

- 同批精灵分别使用不同图, 尺寸, 颜色, opacity 和锚点, 修改一个不影响其他实例.
- 图片顺序与图层切换后 handle 和事件保持不变, GPU 槽位释放和迁移无串图.
- 平移, 缩放和 DPR 切换中 world 尺寸随视图变化, screen 尺寸维持设定的 CSS 像素.
- 快速连续换图与销毁不会出现旧图覆盖新图, 异常引用增长或延迟重现的实例.
- 独立 debug 的 color/pick 预览能显示透明洞与 bounds 差别, 不依赖 GpuPicker 查询实现.
- 批量移动仅上传必要实例范围, 页面显示 draw calls, 实例数量和资源引用数.
