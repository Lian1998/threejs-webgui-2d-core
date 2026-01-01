# 需求分析
**当前Openlayers不满足:**
1. 以钦州项目为例
   1. QC `号码,大车,主小车,门架小车,平台,集装箱槽4,循环方向,任务计时器,状态栏` 11 * 12
   2. IGV `标签,号码,车头,车身,集装箱槽1,电池,状态栏` 7 * 72
   3. YC `号码,大车,小车,集装箱槽1,状态栏` 7 * 43
   4. 如果所有设备都在动的话, 每300ms要使用canvas2DAPI刷新图形937次 (理论最低)
2. openlayers的一些其他问题
   1. openlayers 在项目定位上不像cesium/mapbox, 其对webgl基本没有支持 无法过渡到三维/轻三维阶段
   2. 在钦州项目上制作历史回放功能时, 在调试4倍速(300ms/4)情况下设备的运动轨迹会有明显绘制效率更不上实际运动的情况(13hz)
      1. 我在项目中手动压缩报文才解决了这一问题
   3. openlayers 的GIS封装API导致了很多需求实现困难 
   4. 选择和缩放管线无法自控的问题

[各图形技术性能测试(仅供参考)](https://benchmarks.slaylines.io/webgl.html)

**(新框架)功能需求罗列:**
1. 稳定的图形编码测试环境
2. 一定的缓存机制, 不被标记updated的图元不调用api渲染
3. 批量渲染的优化, 比如所有岸桥大车批量渲染
4. 业务层面的拓展性, 更好的API帮助实现业务功能
5. 可读取geojson格式(或其他模型格式)并指定样式以在二维平面更好的绘制底图

**所有需要支持的图元:**
1. 由 png 或 svg 图片转化出来的贴图 (sprite2D) 
2. 设备号 (text)
3. 禁行区 (几何转三角面)
4. 锁闭区 (几何转三角面或多个面)
5. 路径 (线)
7. 底图 LineString/MultiLineString
8. 底图 Polygon/MultiPolygon

**关于 Threejs 加载 geojson**
8. 在视口缩放和移动的时候需要每帧都刷新, 要高性能
9. 要支持 geojson 的几何体挖空
10. 请求文件, 获取几何, 提交渲染状态
11. 一个文件(单类型的 GeometryCollection)对应一个"层"概念, 一个"层"对应一个样式
   1. 可以设置一定的样式, 如两个线条A(2px)B(1px), 在同视角时要明显的能感觉出A线条比B粗一倍
   2. 样式还支持虚线, 填充色等
结合以上需求设计一下技术方案, 是用canvas2D画一个类似bitmap? 还是直接自己整理几何在threejs的封装下用webgl画(要不要将几何扩充成面片)?

# 框架建设步骤
1. TypeScript继承 Mixins
2. 平面贴图精灵 Sprite2D
   1. mpp: (meter per pixel)固定几何与自动计算投影(实际)大小
   2. texture: 贴图
   3. color: 贴图混合色
   4. offset: 偏移量, 左上角为正方向
   5. depth: 深度值写入(枚举固定值)
3. 基于GPU拾取 GpuPickManager
   1. 注册 将Object3D注册到类内部 是否InstancedMesh, 是否继承透明度
   2. 内部自定义一个自增 pickBaseId 的分配管理函数
   3. 渲染一个场景的 pickBuffer
      1. 保存/恢复 Renderer的上下文环境
      2. 遍历Object3D (在原来的材质基础上)生成pickShaderMaterial
      > 难点: 怎么保证 自定义材质 和 原生材质 在字符串替换这件事上的一致性?
         1. 注册状态 和 object3D的visible 决定是否渲染到 pickBuffer
         2. pickShaderMaterial保留透明度通道, 替换rgb通道为 userData.__pickBaseId 计算的color
      3. 点击事件触发后 从pickBuffer和定义的threshold取x个像素
   4. Buffer通过一种机制映射可见色后输出到指定画布(用于debug)
4. 文字系统 这个找个第三方框架 并在改造的过程中兼容上面的 (或者我看源码后吸收)
   1. Canvas2D烘焙 / SVGAPI转path转Shape
   2. HTML
   3. **SDF**
   4. FontLoader => Geometry
   5. BitMap GPU取块
5. GoeJson解析与底图绘制
   1. 线条转面片, 宽度支持 按像素宽度绘制/按世界宽度绘制, 样式支持 实线/虚线
   2. 按面绘制, 支持 实心/挖心
6. 支持点击按钮, 图形部分能够从二维平滑过渡到三维
7. 绘制集装箱列优化 https://threejs.org/manual/?q=Geometry#en/voxel-geometry

# 问题修复
1. 如果不是注册到 GpuPickManager 里的mesh, 那么不加入 pickBuffer 渲染
   1. 添加缓存容器, 统计所有在渲染 pickBuffer 前可见并未注册的 mesh, 渲染完 pickBuffer 恢复之
2. Sprite2D 的 fragmentShader 简单的透明度不合格 discard 片元, 效果不是很好
   1. 渲染透明度, 用 threejs Opaqueue 特性设置 renderOrder 代替 gl_FragDepth 写入
3. Shader中定义偏移量导致的 boundingbox 错位问题
   1. 放弃在 shader 中做偏移的想法, 在生成几何时做
4. threejs 渲染到 canvas 后, 再用 readPixel 拾取, 发现 rgba(0, 0, 0, x), 被读取成数字时变成灰色
   1. 开启混合后导致的问题
   2. Sprite2DShaderMaterial 替换材质 过程优化, 即便物体透明, 在上层的点击事件也不应该穿透下去

**TODO LIST:**
1. 底图画面
2. 数字文字标号能否有更好的效果, 缓存检查
3. 设备Map管理方式
4. layers 渲染次序原理
5. 底图几何, 在绘制阶段压缩
