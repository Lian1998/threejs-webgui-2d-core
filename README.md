# 项目介绍
此项目目的是构建一套工业化WebGUI项目(canvas部分)核心图形工具包
- 使用 `vite` 作为基础脚手架
  - 所有的主要工具和算法库都采用离线构建, 如 `earcut`, `gl-matrix`, `lodash-es`, `Spector`, `threejs`, `tiny-sdf`, `tween`
  - 以 `theejs(webgl2)` 为图形API调用核心, 网页轻负载二维, 后续快速过渡到网页轻负载三维
- 不断优化 `drawcall` 直至为理论最优
- 一套标准的工业化WebGUI项目主要通过 `websocket点位` 驱动 **多种类型设备** 在canvas上运动
- 按需提供简单好用的应用端API
- 每个需求技术点完成后会提供测试页面
- 在涉及到需要使用到typescript的多重继承问题, 倾向使用 `对象组合` 去实现多重继承, 并且倾向于使用 `Facade` 隐藏内部调用api

```js
const instance1 = QCService.getInstance<多态图元>("QC101"); 
// 标签, 贴图(大车), 贴图(主小车), 贴图(门架小车)
// 贴图(在线状态), 贴图(任务状态), 贴图(紧停状态), 贴图(循环方向)
// 标签(任务持续时间)

socketHelperInstance.registListener(`ECS.QC101.gantryPos`, (itemValue) => {
  instance1.gantry<Object3DLikeAPI>.position.set(121837 + itemValue / 100.0);
  instance1.markDirty();
});
```

# 方便进行类属性配置调试的gui
设计一套用于 typescript + threejs + lil-gui 方便调试的源码, 基于以下几点思路:
1. 用 Mixin 特性将 `对象实例` 注册到容器, 当vite项目处于development开发模式时, 会自动遍历注册的 `对象实例` 完成初始化过程
2. 初始化过程中, 通过获取typescript装饰器定义属性的内容(往往是lil-gui的面板限制参数)以初始化 lil-gui 面板
3. 给一套title width 等 lil-gui 必要参数不指定时的默认值

# 基础框架生成
包含以下基础内容(功能/图元/类?):
1. core\Sprite2D 二维贴图精灵(XZ平面)(4个顶点, 2个三角面)
	1. 包含一个内置的贴图Atlas管理工具, 仅初始化时请求贴图网络资源并计算生成信息, 暂时不需要动态添加/修改/压缩
	2. 需支持以下可配置属性:
		1. <tag>批量时锁死</tag>贴图地址, 当前精灵使用的贴图地址或是Atlas管理工具给出的贴图对应的唯一符号
		2. <tag>批量时锁死</tag>贴图在threejs世界的比例, 当前贴图大小(px)和threejs世界1单位之间的比例尺
		3. <tag>批量时锁死</tag>贴图的中心点(相对于图片中心)的偏移量(px)
		4. <tag>批量时锁死</tag>贴图的旋转量(按中心点), 先完成偏移再旋转
		5. 贴图的混色, shader中定义的混合色
		6. <tag>批量时锁死</tag>贴图的混色算法标记, 内部支持多种算法(multiply,tint, screen, linear dodge, overlay, hard light)
		7. 整体额外透明度
		8. 贴图显示隐藏(在shader中discard片元)
		9. 世界矩阵(缩放/旋转/变换)
	3. 应用端API 支持对同种贴图的精灵进行 BatchedMesh 批量渲染 (上述可配置属性中标记 `<tag>批量时锁死</tag>` 了意味着在一次批量渲染中不会出现不同值)
2. core\SDFText2D 二维文字标签(XZ平面)(文字数量为n: (n*4 + 4)个顶点, (n*2+2)个三角面, `+4``+2`部分为额外的标签背景)
	1. 包含一个内置的管理 由tiny-sdf生成的简单字形贴图的Altas管理工具, 仅初始化时计算并生成所有字形资源, 暂时不需要动态添加/修改/压缩
		1. 在这里需要设置tiny-sdf的必要参数(font-family, font-weight, font-style, font-size, buffer, radius, cutoff), 不会动态更新(项目全局设置)
		2. 同时在这里需要设置全局的 threshold, outlineThreshold, smoothing, 会传输给shader进行运算, 不会动态更新(项目全局设置)
	2. 提供函数设置二维文字字符串(支持"\n"代表换行), 在设置二维字符串时计算新的顶点流和attribute, 并且函数支持一些其他的排版参数
	2. 需支持以下可配置属性:
		1. 字形颜色
		2. 字形描边颜色
		2. 字形及其描边透明度
		3. 背景色
		4. 背景圆角(解析规则如css, 非百分比单位为threejs世界单位)
		5. 背景透明度
		6. 整体额外透明度
		7. 标签显示隐藏(在shader中discard片元)
		8. 世界矩阵(缩放/旋转/变换)
	3. 应用端API 支持批量 BatchedMesh 渲染
3. core\MeshPolygon 多边形(三角面) 支持 线条颜色 虚线 方格线 线条透明度 等属性, 应用端API 支持批量 BatchedMesh 渲染
4. core\MeshLine 线条(三角面) 支持 线条颜色 线条透明度 阴影斜线 等属性, 应用端API 支持批量 BatchedMesh 渲染
4. 基于GpuPick的拾取


