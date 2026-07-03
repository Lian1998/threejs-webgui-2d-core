# 需求分析
**公司使用Openlayers做GUI在图形功能方面的欠缺:**
1. 性能瓶颈 **canvas2D API是实打实的不停用cpu去访问和操作buffer**
  以钦州项目为例, 当做一个港口项目体量做的比较大的时候会存在渲染压力, 仅以三大设备使用cpu贴图的计算量(不包含复杂的填充变色对cpu计算的影响)来看:
  1. QC `号码,大车,主小车,门架小车,平台,集装箱槽4,循环方向,任务计时器,状态栏` 11 * 12
  2. IGV `标签,号码,车头,车身,集装箱槽1,电池,状态栏` 7 * 72
  3. YC `号码,大车,小车,集装箱槽1,状态栏` 7 * 43

> 这意味着(如果所有设备都在动的话), 在假设点位采样率在每300ms时, 把所有图元变化渲染出来需要每秒使用cpu调用canvas2DAPI刷新图形937次(理论最低)
> 在做钦州的历史回放时尝试显示所有细节帧的策略, 结果出现明显的性能瓶颈; (openlayers会出现渲染机来不及解析渲染指令造成渲染延迟的问题)
> 历史回放需求最终是在cpu端循环按x毫秒段(取决于回放速率倍数)合并报文帧的方法完成的

[各图形技术性能测试(仅供参考)](https://benchmarks.slaylines.io/webgl.html), 它这里参考webgl即可 [threejs的代码](https://github.com/slaylines/canvas-engines-comparison/blob/master/src/scripts/three.js) 写的有点糟糕, 它应该只是算没有人工优化的代码效率

2. 性能优化能力受限, openlayers在架构上封装了渲染机(指令执行器), 用户调应用层api本质上最终生成渲染机解析的指令, 渲染机再去真正的调用canvas2DAPI, 这个渲染机的概念形成了一个黑盒, 导致有点难以阅读代码和调优

> 绘制指令准备, 一旦有dirty数据就整理feature
> `VectorLayer<BaseLayer<Layer<BaseLayer>>>.prepareFrame` 这里主要就是算视口, 创建一个内部闭包的render函数 和 replayGroup(CanvasBuilderGroup), 通过所有的 `vectorSource.getFeaturesInExtent` 裁切一遍所有的feature, 最终都打成图元信息都存储在 `executorGroup`

> 地图(Map)组合(Composite)了很多图层(Layer)每个图层上有很多特征(Feature)需要渲染, Map调用Render流程
> `Map.renderSync/render(requestAnimationFrame)` `animationDelay_` `renderFrame_`(这里整理出frameState)
> => `CompositeMapRenderer<MapRenderer>.renderFrame`(这里遍历frameState中的layers调用它们的render函数)
> => `VectorLayer<BaseLayer<Layer<BaseLayer>>>.render` VectorLayer的renderer是CanvasVectorLayerRenderer
> => `CanvasVectorLayerRenderer<CanvasLayerRenderer<LayerRenderer>>.renderFrame` => renderWorlds(这里的 `executorGroup` 按 `图元zIndex` 和 `图元类型` 来调度绘制)

3. openlayers 本身在项目定位上不像`cesium`, `mapbox`, 完全没有三维渲染能力, 无法让项目平滑过渡到web轻三维阶段
4. openlayers 的GIS倾向API封装导致了很多, 我们专业(大场景工控WebGUI)的需求实现困难, 比如:
   1. 拾取管线(我做了一些上层封装优化了业务端的拾取管线API使用模式), 但是其核心拾取逻辑是依赖于openlayers的buffer优化后的extent的, 代码很深, 不太好优化
   2. 对于贴图的缩放比例对齐(我封装额外的管线, 但是只能做到懒对齐并且性能较差无法平滑缩放设备贴图)
   4. 在设备旁显示设备状态时逻辑比较复杂, 且当支持设备状态等细小图元支持拾取时非常复杂
