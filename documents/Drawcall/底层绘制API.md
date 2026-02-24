
# 基础的绘制API
1. `drawArrays` 按顺序绘制顶点
2. `drawElements` 可以使用indicesBuffer
threejs 在选择启用`drawArrays|drawElements` 哪种底层API来绘制图形时, 是根据 是否存在 `indexBuffer` 来判断的
**注意:** 在使用 `drawElements` 时会预定为 `smoothShading` (如法线这样的面向量会由三个顶点来决定); 而 `drawArrays` 则由于重复了一份顶点数据的缘故(法线跟着顶点一起重复了一份), 会完全保留面向量的能力(这里的理解可以画一个素描的棱柱想象一下);


# Instanced 相关API

**BatchedMesh**, 一个geometryBundle, 相同的material 
[multiDrawElementsWEBGL](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_multi_draw/multiDrawElementsWEBGL)

工作原理其实很简单:
1. 在cpu端整理一个很大的geometryBundleBuffer, 里面包含了需要合批渲染的所有geometryInstance
2. 在cpu端根据材质整理好渲染状态(固定好渲染状态)
3. 根据`multiDrawElementsWEBGL`api设计提交参数, 这些参数说明了怎么从这个bundle中取几何进行这次多次渲染
   1. `mode`
   2. `countsList`(数组) 每次调用指令时取用几个indices
   3. `countsOffset` count在countsList的偏移
   4. `type`
   5. `offsetsList`(数组) 每次调用指令时在indicesBuffer中的偏移
   6. `offsetsOffset` offset在offsetsList的偏移
   7. `drawcount` 显卡内部画几次

```javascript
// 如 `countsList([36, 24, 60])`, `offsetsList([0, 72, 120, 192])`:
// 调用 multiDrawElementsWEBGL(gl.TRIANGLES, countsList, 0, type, offsetsList, 0, 3);
// 对应 `drawElements(mode, count, type, offset)`
gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0); // indices 0~36 draw 12 面
gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 72); // indices 72~96 draw 8 面
gl.drawElements(gl.TRIANGLES, 60, gl.UNSIGNED_SHORT, 120); // indices 120~180 draw 20 面

// multiDrawElementsWEBGL(gl.TRIANGLES, countsList, 1, type, offsetsList, 2, 2);
// 对应 `drawElements(mode, count, type, offset)`
gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 120); // indices 120~144 draw 8 面
gl.drawElements(gl.TRIANGLES, 60, gl.UNSIGNED_SHORT, 192); // indices 192~252 draw 20 面
```


**InstancedMesh**(需要WebGL2) 相同的geometry, 相同的material
[drawElementsInstanced](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawElementsInstanced)
这个工作原理就更简单了:
1. 在cpu端指定一个固定的geometryBuffer, 在cpu端指定attributesBuffers
2. 在cpu端根据材质整理好渲染状态(固定好渲染状态)
3. 根据`drawElementsInstanced`api设计提交参数
   1. `mode`
   2. `count` 每个实例取用几个indices
   3. `type`
   4. `offset` indicesBuffer偏移
   5. `instanceCount` 实例数量（要绘制多少个）
4. 根据`gl.vertexAttribDivisor(index, divisor);`api设计提交参数 指定的instance的attribute如何赋能
   1. 0: 每个顶点更新一次(默认)
   2. 1: 每个实例更新一次
   3. n: 每 n 个实例更新一次

```javascript
// 绑定 geometryBuffer vao 获得bufferIndex1
// 提交 gl.vertexAttribDivisor(bufferIndex1, 0);
// 绑定 indicesBuffer
// 绑定 attributes1Buffer 获得 bufferIndex2, instance偏移矩阵信息
// 提交 gl.vertexAttribDivisor(bufferIndex2, 1);
// 绑定 attributes2Buffer 获得 bufferIndex3, instance顶点颜色信息
// 提交 gl.vertexAttribDivisor(bufferIndex3, 0);
// 提交 gl.drawElementsInstanced(面, 15, 默认, 0, 10); 为绘制indicesBuffer取用0~15对应的顶点, 绘制10个instance
```

**注意** 只看shader片段是完全无法区分attributes为逐instance还是逐vertex的, 只能去看javascript代码中的Divisor是如何指定的