# 此项目的初衷
1. 以钦州项目为例
   1. QC(11*12) 号码,大车,主小车,门架小车,平台,集装箱槽4,循环方向,任务计时器,状态栏
   2. IGV(7*72) 标签,号码,车头,车身,集装箱槽1,电池,状态栏
   3. YC(7*43) 号码,大车,小车,集装箱槽1,状态栏
   4. 所以如果设备都参与行动的话, 大概每300ms要使用canvas2DAPI刷起码不止937次(第三方框架的封装不是人为可控的)
   5. 在制作历史回放时4倍速(300ms/4)下每一帧都放设备的运动轨迹会有明显绘制效率更不上实际运动的情况(13hz)
2. openlayers的一些遗憾
   1. 港口项目和GIS其实关系不大, 之前选用openlayers确实能迅速出效果完成产品, 但是后续各个维度上的功能都很难精进了
   2. 研究文档后发现 openlayers 在项目定位上不像cesium/mapbox对webgl基本没有支持, 当然即便是使用cesium/mapbox也不太好, 因为说到底都是gis框架
   3. 遭遇性能瓶颈
   4. openlayers并没有在渲染环节类似场景图各个渲染物互相父子关系的封装(矩阵运算), feature甚至没有visiable设置
   5. 很多美观需求在openlayers的API下实现困难
   6. 选择和缩放管线问题

# 性能
https://benchmarks.slaylines.io/webgl.html?utm_source=chatgpt.com

这是一个用于比较不同 Canvas 渲染引擎性能的项目


# 新核心路线选择
1. 完全自己封装的webgl
2. Threejs仅XZ平面, 便于后续拓展伪3D


功能要求
1. 稳定的测试环境
2. Layer  
   1. SceneGraph 场景树
   2. 缓存
3. Camera 提交渲染
4. 