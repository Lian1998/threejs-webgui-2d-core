# 需求分析

**当前的不满足:**
1. 以钦州项目为例
   1. QC `号码,大车,主小车,门架小车,平台,集装箱槽4,循环方向,任务计时器,状态栏` 11*12
   2. IGV `标签,号码,车头,车身,集装箱槽1,电池,状态栏` 7*72
   3. YC `号码,大车,小车,集装箱槽1,状态栏` 7*43
   4. 如果所有设备都在动的话, 每300ms要使用canvas2DAPI刷新图形937次 (理论最低)
2. openlayers的一些其他问题
   1. openlayers 在项目定位上不像cesium/mapbox对webgl基本没有支持 无法过渡到三维/轻三维阶段
   2. 在钦州项目上制作历史回放功能时, 在调试4倍速(300ms/4)情况下设备的运动轨迹会有明显绘制效率更不上实际运动的情况(13hz)
      1. 我在项目中手动压缩报文才解决了这一问题
   3. openlayers 的GIS封装API导致了很多需求实现困难 
   4. 选择和缩放管线无法自控的问题

[性能测试](https://benchmarks.slaylines.io/webgl.html)

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

# 框架建设步骤思路
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
   3. SDF
   4. FontLoader => Geometry
   5. BitMap GPU取块
5. 支持按钮后从二维升级成三维
   1. 简易集装箱优化 https://threejs.org/manual/?q=Geometry#en/voxel-geometry
6. GoeJson解析与底图绘制
   1. 实线
   2. 虚线
   3. 实心/挖心


# GPUPick相关UserData字段设计(可能)
```javascript
Object3D.userData = {
  __pickBaseId: Math.max(1, this.maxId + 1), // 注册了就会被分配pickId
  __origVisible: boolean, // 遍历过程中记录object3D传入时的显示状态
  __origMaterial: THREE.Material, // object3D传入时的材质
  __shaderPickMaterial: THREE.Material, // 第一次遍历时 创建新的用于渲染pickBuffer的材质 (这个材质注册onBeforeCompile以完成编译前shader程序字符串替换)
  uPickColor: THREE.Color
}
```


# 关于SDF文字的文档和库
```javascript
// https://github.com/dy/bitmap-sdf/tree/master
// https://github.com/dy/bitmap-sdf/blob/master/index.js

// https://github.com/mapbox/tiny-sdf
// https://github.com/mapbox/tiny-sdf/blob/main/index.js
// https://blog.csdn.net/qq_21476953/article/details/112991864

// https://github.com/protectwise/troika/blob/main/packages/troika-three-text/README.md

// https://github.com/Experience-Monks/three-bmfont-text
// https://github.com/soadzoor/MSDF-text
```

# BUG历史
1. 如果不是注册到 GpuPickManager 里的mesh, 那么不加入 pickBuffer 渲染
2. threejs 渲染到 canvas 后, 再用 readPixel 拾取, 发现黑色+透明度, 被读取成数字时变成灰色
3. Sprite2D 的 fragmentShader 简单的透明度不合格 discard 片元, 效果不是很好

> threejs 透明物渲染 先走constructor的order在先 (而非先加入场景的)
> 关闭 depthWrite, 保留 depthTest + gl_FragDepth, 依靠渲染顺序
> 或者分两次渲染: 先写 depth, 再写颜色
> 必要时使用 premultipliedAlpha 并乘 alpha 修复 blending

transparent: true,
depthWrite: false,
depthTest: true,
全用renderOrder控制

layer
zIndex => renderOrder


