# gl.drawElementsInstanced简介

**User:** hy Niu (l1ian1998hyhy@gmail.com)  
**Created:** 2/23/2026 0:48:26  
**Updated:** 2/23/2026 1:07:21  
**Exported:** 2/23/2026 1:08:07  
**Link:** [https://chatgpt.com/c/699b3353-b000-8320-8393-c4bb2fcc7ac3](https://chatgpt.com/c/699b3353-b000-8320-8393-c4bb2fcc7ac3)  

## Prompt:
简单介绍一下 gl.drawElementsInstanced

## Response:
`gl.drawElementsInstanced` 是 WebGL 2 中用于 **实例化绘制（instanced rendering）** 的函数。它可以在一次调用中绘制多个“相同结构”的物体（实例），从而显著减少 draw call 次数，提高性能。

* * *

一、基本作用
------

普通的 `gl.drawElements()` 只能绘制一次模型。  
`gl.drawElementsInstanced()` 可以：

*   使用同一套顶点数据（VBO）
*   使用同一套索引数据（EBO）
*   一次性绘制多个实例
*   每个实例可以有不同的变换或属性

适合场景：

*   批量渲染树木
*   大量相同模型（草、石头、粒子）
*   UI 元素

* * *

二、函数签名
------

```js
gl.drawElementsInstanced(mode, count, type, offset, instanceCount);
```

### 参数说明

| 参数 | 含义 |
| --- | --- |
| `mode` | 绘制模式，如 `gl.TRIANGLES` |
| `count` | 每个实例要绘制的索引数量 |
| `type` | 索引类型，如 `gl.UNSIGNED_SHORT` |
| `offset` | 索引缓冲区偏移（字节） |
| `instanceCount` | 实例数量（要绘制多少个） |

* * *

三、与普通 drawElements 的区别
----------------------

### 普通绘制

```js
gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
```

绘制一次模型。

### 实例化绘制

```js
gl.drawElementsInstanced(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0, 100);
```

一次绘制 100 个模型实例。

* * *

四、关键机制：实例属性
-----------

实例化绘制通常需要配合：

```js
gl.vertexAttribDivisor(index, divisor);
```

### divisor 含义：

*   `0` → 每个顶点更新一次（默认）
*   `1` → 每个实例更新一次
*   `n` → 每 n 个实例更新一次

例如：

```js
gl.vertexAttribDivisor(2, 1);
```

表示 attribute 2 是实例属性（如模型矩阵、偏移量等）。

* * *

五、顶点着色器中的实例 ID
--------------

在 GLSL 中可以使用：

```glsl
gl_InstanceID
```

它表示当前实例编号（从 0 开始）。

可以用来：

*   查找实例变换矩阵
*   计算不同位置
*   控制颜色

* * *

六、性能优势
------

不使用实例化：

```js
for (let i = 0; i < 1000; i++) {
  gl.drawElements(...);
}
```

会产生 1000 次 draw call。

使用实例化：

```js
gl.drawElementsInstanced(..., 1000);
```

只有 1 次 draw call。

减少 CPU → GPU 调用开销，是实例化最大的优势。

* * *

七、WebGL 版本注意
------------

*   WebGL 2：原生支持 `drawElementsInstanced`
*   WebGL 1：需要扩展  
    `ANGLE_instanced_arrays`

* * *

八、总结
----

`gl.drawElementsInstanced` 本质上是：

> 用一套几何数据，在一次调用中绘制多个实例

它解决的是 **批量绘制性能问题**，在现代 WebGL 渲染中非常常用。

如果需要，我可以进一步讲解：

*   实例矩阵如何传入
*   mat4 如何拆成 4 个 attribute
*   或完整示例代码

## Prompt:
如果这个颜色是每个实例一份的, 和每个顶点一份的, 在shader中应该如何读取和使用呢? 请分别给出示例

## Response:
下面分别说明两种情况：

1.  **每个实例一份颜色（per-instance color）**
2.  **每个顶点一份颜色（per-vertex color）**

核心区别只在于：

*   JavaScript 端是否设置 `vertexAttribDivisor = 1`
*   shader 端写法其实几乎一样

* * *

一、每个实例一份颜色（Per-Instance Color）
==============================

JS 侧关键设置
--------

```js
gl.bindBuffer(gl.ARRAY_BUFFER, instanceColorBuffer);
gl.vertexAttribPointer(aInstanceColor, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aInstanceColor);

// 每个实例更新一次
gl.vertexAttribDivisor(aInstanceColor, 1);
```

这里表示：

*   一个 vec4 对应一个实例
*   所有顶点共享同一个实例颜色

* * *

Vertex Shader 示例
----------------

```glsl
#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec4 aInstanceColor;  // 每个实例一份

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

out vec4 vColor;

void main() {
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);

    // 直接传给 fragment
    vColor = aInstanceColor;
}
```

* * *

Fragment Shader
---------------

```glsl
#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
```

* * *

运行效果
----

*   每个实例一个固定颜色
*   整个模型保持统一颜色
*   不会在三角形内部产生插值差异

* * *

二、每个顶点一份颜色（Per-Vertex Color）
============================

JS 侧关键设置
--------

```js
gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
gl.vertexAttribPointer(aVertexColor, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aVertexColor);

// 每个顶点更新一次（默认就是 0）
gl.vertexAttribDivisor(aVertexColor, 0);
```

或者不写 divisor，因为默认就是 0。

* * *

Vertex Shader 示例
----------------

```glsl
#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec4 aVertexColor;  // 每个顶点一份

uniform mat4 uMVP;

out vec4 vColor;

void main() {
    gl_Position = uMVP * vec4(aPosition, 1.0);

    vColor = aVertexColor;
}
```

* * *

Fragment Shader（相同）
-------------------

```glsl
#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
```

* * *

运行效果
----

*   每个顶点有自己的颜色
*   三角形内部会进行插值
*   产生渐变效果

* * *

三、两种方式的本质区别
===========

| 类型 | divisor | 数据更新频率 | 插值效果 |
| --- | --- | --- | --- |
| per-instance | 1 | 每个实例 | 整个模型统一 |
| per-vertex | 0 | 每个顶点 | 三角形内部渐变 |

* * *

四、一个重要理解
========

在 shader 中：

> 你无法区分 attribute 是 per-instance 还是 per-vertex

shader 只看到 attribute 值。  
是否按实例更新，完全由 JavaScript 端的 divisor 决定。

* * *

五、额外说明：使用 gl\_InstanceID 的替代方式
==============================

如果你不想传颜色 buffer，也可以：

```glsl
vec4 color = vec4(
    fract(float(gl_InstanceID) * 0.37),
    fract(float(gl_InstanceID) * 0.57),
    fract(float(gl_InstanceID) * 0.77),
    1.0
);
```

这种方式是程序生成实例颜色，而不是从 attribute 读取。

* * *

总结
==

*   每个实例一份颜色 → `divisor = 1`
*   每个顶点一份颜色 → `divisor = 0`
*   shader 代码基本一致
*   插值行为由“是否 per-vertex”决定

如果你希望，我可以画一个“GPU 如何展开实例循环”的执行流程图式解释。



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)