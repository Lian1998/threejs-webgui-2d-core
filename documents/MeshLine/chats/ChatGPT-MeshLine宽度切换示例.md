# MeshLine宽度切换示例

**User:** hy Niu (l1ian1998hyhy@gmail.com)  
**Created:** 12/31/2025 15:40:17  
**Updated:** 12/31/2025 15:40:55  
**Exported:** 12/31/2025 16:52:45  
**Link:** [https://chatgpt.com/c/6954d2df-9bd8-8324-b8c9-3c9b64135803](https://chatgpt.com/c/6954d2df-9bd8-8324-b8c9-3c9b64135803)  

## Prompt:
用meshline技术(线条6顶点扩充面片)实现画线时, 如何使得 vertexShader中支持两种宽度方式(传入的宽度解析为朝线切线扩充世界坐标长度, 传入的宽度解析为投影到ndc然后根据屏幕分辨率计算线宽度) 请给出threejs(glsl) shader示例代码

## Response:
下面给你一个\*\*MeshLine（线条 6 顶点扩展成面片）\*\*的 **Three.js GLSL VertexShader 示例**，核心目标是：

👉 **同一套 shader 同时支持两种线宽语义**

*   **World-space 宽度**：宽度表示沿“法线方向”在**世界坐标中的真实长度**
*   **Screen-space 宽度**：宽度表示**屏幕像素宽度**（常见 UI / 地图线条）

通过 `uniform int uWidthMode` 或 `#define` 切换。

* * *

一、核心思想（非常重要）
------------

### 1️⃣ MeshLine 的顶点数据假设

典型 MeshLine 顶点属性（你现在大概率就是这样）：

```glsl
attribute vec3 position;        // 当前点
attribute vec3 previous;        // 前一个点
attribute vec3 next;            // 后一个点
attribute float side;           // +1 / -1 (线条两侧)
attribute float lineWidth;      // 每段线宽（可选）
```

* * *

### 2️⃣ 两种宽度计算本质差异

| 模式 | 偏移计算发生在哪 |
| --- | --- |
| **World-space** | 世界坐标中直接扩展 |
| **Screen-space** | NDC 中扩展（与分辨率相关） |

* * *

二、关键 Uniform 定义
---------------

```glsl
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec2 uResolution;   // 屏幕分辨率 (px)
uniform float uPixelRatio;  // devicePixelRatio
uniform int uWidthMode;     // 0 = world, 1 = screen
```

* * *

三、完整 Vertex Shader 示例（Three.js 可直接用）
------------------------------------

```glsl
attribute vec3 position;
attribute vec3 previous;
attribute vec3 next;
attribute float side;
attribute float lineWidth;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform int uWidthMode; // 0 = world, 1 = screen

varying vec2 vUv;

vec2 getScreenDirection(vec4 prevClip, vec4 nextClip) {
    vec2 prevNDC = prevClip.xy / prevClip.w;
    vec2 nextNDC = nextClip.xy / nextClip.w;
    vec2 dir = normalize(nextNDC - prevNDC);
    return vec2(-dir.y, dir.x); // 垂直方向
}

void main() {

    // --- 1. 世界空间坐标 ---
    vec4 currentMV = modelViewMatrix * vec4(position, 1.0);
    vec4 prevMV    = modelViewMatrix * vec4(previous, 1.0);
    vec4 nextMV    = modelViewMatrix * vec4(next, 1.0);

    // --- 2. 计算线段切线 ---
    vec3 dir;
    if (length(nextMV.xyz - currentMV.xyz) > 0.0001) {
        dir = normalize(nextMV.xyz - currentMV.xyz);
    } else {
        dir = normalize(currentMV.xyz - prevMV.xyz);
    }

    // --- 3. 世界空间法线 ---
    vec3 normalWorld = normalize(vec3(-dir.y, dir.x, 0.0));

    vec4 finalPos = currentMV;

    // =========================================================
    // 模式 A：World-space 线宽
    // =========================================================
    if (uWidthMode == 0) {

        float halfWidth = lineWidth * 0.5;
        vec3 offset = normalWorld * side * halfWidth;
        finalPos.xyz += offset;
    }

    // =========================================================
    // 模式 B：Screen-space 线宽
    // =========================================================
    else {

        vec4 prevClip = projectionMatrix * prevMV;
        vec4 nextClip = projectionMatrix * nextMV;
        vec4 currClip = projectionMatrix * currentMV;

        vec2 normalNDC = getScreenDirection(prevClip, nextClip);

        // 像素 → NDC
        float pixelWidth = lineWidth * uPixelRatio;
        vec2 pixelToNDC = vec2(
            2.0 / uResolution.x,
            2.0 / uResolution.y
        );

        vec2 offsetNDC = normalNDC * side * pixelWidth * pixelToNDC;

        // 转回 clip space
        currClip.xy += offsetNDC * currClip.w;
        gl_Position = currClip;
        return;
    }

    // --- 默认 world-space 输出 ---
    gl_Position = projectionMatrix * finalPos;
}
```

* * *

四、Three.js 侧如何传参
----------------

```ts
material.uniforms = {
  uResolution: { value: new THREE.Vector2(width, height) },
  uPixelRatio: { value: window.devicePixelRatio },
  uWidthMode: { value: 0 }, // 0 world, 1 screen
};
```

切换模式：

```ts
material.uniforms.uWidthMode.value = 1;
```

* * *

五、设计建议（非常实战）
------------

### ✅ 推荐 API 设计

```ts
line.setLineWidth({
  value: 2,
  mode: 'screen', // or 'world'
});
```

### ✅ 为什么不用两个 Shader？

*   少一次 program 切换
*   动态切换线宽语义（地图 / CAD / GIS 非常常见）
*   方便做 **LOD：远处 screen，近处 world**

* * *

六、常见坑位提醒 ⚠️
-----------

1.  **透视畸变**
    *   screen-space 模式下宽度永远不随深度变化（这是特性，不是 bug）
2.  **世界法线计算**
    *   简化版假设 Z=0
    *   若是 3D 曲线，建议用 `cross(dir, viewDir)`
3.  **Join / Cap**
    *   本示例只关注宽度，不含 miter / bevel

* * *

如果你愿意，我可以继续帮你补：

*   ✅ **Miter Join / Round Join**
*   ✅ **World + Screen 混合模式（根据 depth）**
*   ✅ **抗锯齿 SDF 线条**
*   ✅ **three.js + InstancedMesh 优化版 MeshLine**

直接说你现在用的是 **MeshLine / Troika / 自写几何** 哪种 👍



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)