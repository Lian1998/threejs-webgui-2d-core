# 需求分析
**当前Openlayers对于图形功能的欠缺功能**
1. 性能瓶颈
  以钦州项目为例, 当做一个港口项目体量做的比较大的时候会存在渲染压力, 仅以三大设备使用cpu贴图的计算量来看(不包含复杂的填充变色对cpu计算的影响):
  1. QC `号码,大车,主小车,门架小车,平台,集装箱槽4,循环方向,任务计时器,状态栏` 11 * 12
  2. IGV `标签,号码,车头,车身,集装箱槽1,电池,状态栏` 7 * 72
  3. YC `号码,大车,小车,集装箱槽1,状态栏` 7 * 43
  这意味着(如果所有设备都在动的话), 在假设点位采样率在每300ms时, 把所有图元变化渲染出来需要每秒使用cpu调用canvas2DAPI刷新图形937次(理论最低)
  > 在做钦州的历史回访时已经尝试过显示所有细节帧的策略, openlayers会出现渲染机来不及解析渲染指令造成渲染延迟的问题, 最终是在cpu循环按x毫秒段(取决于倍数)合并报文帧的方法做的
  > **canvas2DAPI是实打实的不停用cpu去访问和操作buffer**
  > [各图形技术性能测试(仅供参考)](https://benchmarks.slaylines.io/webgl.html)

2. 优化受限, openlayers在架构上封装了渲染机, 用户调用应用层api本质上是生成渲染机解析的指令, 渲染机真正的去调用canvas2DAPI, 这个渲染机本质是一个黑盒难以阅读代码和调优
3. openlayers 本身在项目定位上不像cesium, mapbox, 其对三位坐标系和webgl没有支持, 无法平滑过渡到三维/轻三维阶段
4. openlayers 的GIS封装API导致了很多我们专业(我的理解是WebGUI定位给技术人员用的简洁明了的AI, 后续可能支持车队/任务调度优化调优)的需求实现困难, 比如:
   1. 拾取管线, 需要我封装额外的管线以保证应用层代码简洁, 并且拾取api的逻辑无法优化(openlayers封装)
   2. 缩放比例对齐, 需要我封装额外的管线
   3. 平滑缩放设备贴图
   4. 在设备旁显示设备状态, 且设备状态等细小图元支持拾取

**(新框架)底层功能需求平行罗列:**
1. 稳定的图形测试架构
2. 保证渲染性能, 保证渲染图形时使用最优解
3. 保证业务层面的拓展性

**所有需要支持的图元类型:**
1. 四通道图片(设备贴图等)
2. 文字(堆场编号, 设备编号等)(SDF, TextGeometry, HTMLLabel)
3. 多边形区(禁行区, 工作区等)
4. 线(车道, 围网等)(MeshLine)
5. 面(车道标记, 斑马线等)(MeshPolygon)

**关于 Threejs 加载 geojson**
8. 在视口缩放和移动的时候需要每帧都刷新, 要高性能
9. 要支持 geojson 的几何体挖空
10. 请求文件, 获取几何, 提交渲染状态
11. 一个文件(单类型的 GeometryCollection)对应一个"层"概念, 一个"层"对应一个样式
   1. 可以设置一定的样式, 如两个线条A(2px)B(1px), 在同视角时要明显的能感觉出A线条比B粗一倍
   2. 样式还支持虚线, 填充色等
结合以上需求设计一下技术方案, 是用canvas2D画一个类似bitmap? 还是直接自己整理几何在threejs的封装下用webgl画(要不要将几何扩充成面片)?

# 框架建设步骤

## 二维范畴
1. TypeScript继承是如何编译的研究, 增加 Mixins 函数
2. 封装二维平面贴图精灵 Sprite2D
   1. mpp: (meter per pixel) 自动计算投影(实际)大小与生成几何面片
   2. depth: threejs Object3D renderOrder
   3. USE_CUSTOM_MULTICOLOR: 是否启用贴图混合色算法
3. 封装基于 GPUBuffer 的拾取类 GpuPickManager
   1. 注册: 将Object3D注册到类内部, 使用内部自定义的自增 pickBaseId 的分配Object3D的id
   2. 渲染阶段, 渲染一个场景的 pickBuffer
      1. 保存/恢复 Renderer的上下文环境
      2. 遍历场景, 获取被注册的 Object3D 其原来的材质, 在原来的材质基础上生成 pickShaderMaterial
      3. pickShaderMaterial保留透明度通道, 替换rgb通道为 userData.__pickBaseId 中通过数字ID转换出来的颜色
      4. 点击事件触发即刻渲染
      5. 通过点击触发时记录的点击位置, 从 pickBuffer 中按照定义的 threshold 取x个像素, 找到存储数字ID的颜色
   3. 将颜色反转为数字ID, 通过映射机制找到注册的 Object3D
4. 文字系统 这个找个第三方框架 并在改造的过程中兼容上面的 (或者我看源码后吸收)
   1. 封装基于距离场的文字框架 **SDF**
   2. 使用 HTML 在DOM结构上渲染
   3. FontLoader 直接计算文字的Geometry
   4. 三元额外距离场 与 字体管理缓存中从预计算的GPU贴图中取块
5. 针对mapshaper导出的GoeJson解析与底图绘制
   1. nodejs工具脚本读取项目geojson文件, 一键插值geojson文件中的点坐标
   2. MeshLine 支持自定义线条粗细, 颜色, 虚线? 盒线? 线条批处理drawcall优化
   3. MeshPolygon 支持自定义面颜色, 阴影线条面?
6. 针对Orthographic相机与底图缩放对齐的过程方法调优
7. 业务逻辑代发封装整合, 以岸桥项目为例, 支持批处理渲染
  
## 三维范畴
1. 一键点击, 从二维视角转化为三维视角
2. 一键点击, 从二维贴图模式切换到三维模型场景
3. 绘制集装箱列优化 https://threejs.org/manual/?q=Geometry#en/voxel-geometry

# 日志

## 问题修复日志(before 2026-02-06)
```log
GpuPickManager在渲染pickBuffer时判断遗漏;
解决措施:
  如果不是注册到GpuPickManager里的mesh, 那么不进行pickBuffer渲染

GpuPickManager在渲染完pickBuffer后, 准备恢复场景容器中被临时替换为pickBufferMaterial的Object3D阶段中缺少缓存机制; 
解决措施:
  添加缓存容器_originVisibleSet, 在遍历所有Object3D替换pickBufferMaterial时候顺便统计所有可见但并未注册到PickManager的Mesh, 渲染完pickBuffer后通过此容器恢复

Sprite2D的fragmentShader中对透明像素直接discard片元导致毛边效果; 
解决措施: 
  现在直接使用图片透明度输出

Sprite2D层叠时在shader中覆盖gl_FragDepth写入导致透明度叠加紊乱;
解决措施:  
  用threejs的Opaqueue物体渲染顺序, 设置renderOrder在CPU阶段决定渲染次序(代替GPU深度写入)

Sprite2D在Shader中定义偏移量导致的boundingbox错位问题; 
解决措施: 
  同时设置的缩放和偏移会有bug, 放弃在shader中做偏移的想法, 在生成几何时就做这一过程

GpuPickManager的数值读取bug, threejs渲染到canvas后, 再用readPixel拾取canvas中像素点, 发现rgba(0,0,0,x)在读取rgb时变成类似 (64,64,64);
解决措施: 
  1. 开启blendMode的某种混合后导致的问题, 使用默认即可
  2. Sprite2DShaderMaterial 替换材质过程优化, 即便物体透明, 在上层的点击事件也不应该穿透下去, pickbuffer覆盖渲染即可

MeshLine虚线绘制问题, 通过x轴坐标加y轴坐标以计算line部分和dash部分效果很差, 在转弯处完全无法维持虚线观感;
解决措施: 
  在cpu整理线段阶段添加一道attribute(lineDistance)用于计算每段线条的累计长度, 在fragmentShader中通过当前顶点在线段中的累计长度来计算line部分和dash部分

MeshLine虚线绘制问题, 工程上MeshLine无法保证起始末尾都不存在dash, 仅能保证一头;
解决措施: 
  基于相机(threejs的CustomShaderMaterial内建unifroms的cameraPosition)在xz平面范畴移动视角时对虚线的line部分和dash部分计算时进行微微偏移, 至少代表着移动到某一视角可以完全掌握虚线线条的起始点终末点位置

MeshLine使用SpectorJs监视drawcall, 渲染效率存在问题;
解决措施:
  新增一种断点技术, 将多个段的数据融合成一段, 并将每段的起始点和结束点冗余处理, 并通过一位的attribute(lineBreakpoint)标记这些冗余顶点, 在fragmentShader中对存在标记的冗余顶点的面进行舍弃片元处理; 公网上对这种技术叫做 Degenerate Segment 我这里做了一点改进
```

## TODO-LIST(2026-02-06)
1. 以钦州项目位置为基准
   1. 堆场位置录入
   2. STS/AGV/ASC生成
2. AntDesignVueUI引入项目, 弹窗组件移植, 历史回放组件移植
3. 颜色配置管理器, 读取颜色配置管理器配置, 颜色动态切换
4. 号码绘制(更优质的文字渲染方案)
5. Sprite2D合批渲染
6. Sprite2D合批渲染拾取测试优化
7. 根据历史回放数据, 编写动画插值思路

## TODO-LIST(2026-02-12)
按照AI回答内容优化GpuPickManager
1. `samples: 4` 不安全
2. renderer 状态保存不完整
3. register 直接修改 object.userData 污染外部对象, 数据不会自动同步, 删除 object 时无清理逻辑 **并且由于双视口选中我自己也认为是不妥的???**, 使用 WeakMap 存储所有状态
4. pickScene 分离; 用 `Set` 或者 `Threejs.Layers` 或 `单独的Three.Scene` 统计所有注册进来的 Object3D