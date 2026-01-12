# NDC空间定义

**User:** hy Niu (l1ian1998hyhy@gmail.com)  
**Created:** 10/13/2025 15:42:47  
**Updated:** 10/13/2025 15:46:21  
**Exported:** 10/13/2025 15:51:29  
**Link:** [https://chatgpt.com/c/68ecad30-f768-8324-b2ad-185eee167d74](https://chatgpt.com/c/68ecad30-f768-8324-b2ad-185eee167d74)  

## Prompt:
图形学在将cameraProjection计算在内后, 将视区压缩成的完美矩阵(-1, 1), 这个矩阵名字叫什么?

## Response:
在图形学渲染管线中，**经过 `camera projection`（投影矩阵）变换后，把视锥体（view frustum）压缩成标准立方体范围 (-1, 1)** 的那个空间，叫做：

> 🟦 **NDC（Normalized Device Coordinates）空间**  
> 中文通常译作：**标准化设备坐标系** 或 **归一化设备坐标系**。

* * *

### 📘 详细说明

1.  **过程：**
    ```
    Object Space
       ↓ (Model Matrix)
    World Space
       ↓ (View Matrix)
    View/Camera Space
       ↓ (Projection Matrix)
    Clip Space
       ↓ (Divide by w)
    NDC (Normalized Device Coordinates)
    ```
    其中最后一步：
    $$
    x_{ndc} = \frac{x_{clip}}{w_{clip}}, \quad y_{ndc} = \frac{y_{clip}}{w_{clip}}, \quad z_{ndc} = \frac{z_{clip}}{w_{clip}}
    $$
    得到的结果范围是：
    ```
    x, y, z ∈ [-1, 1]
    ```
2.  **简称对比：**
    | 缩写 | 全称 | 含义 |
    | --- | --- | --- |
    | NDC | Normalized Device Coordinates | 归一化设备坐标空间 |
    | NDC space | 经过透视除法后的标准化坐标空间 |  |
    | NDF | 通常表示 Normal Distribution Function（在 PBR 中的法线分布函数） |  |
    | NDT | 图形学中没有通用含义，可能是记忆混淆 |  |

* * *

### ✅ 结论

你说的“将视区压缩成 (-1, 1) 的完美矩阵空间”确实是：

> **NDC 空间 (Normalized Device Coordinates)**

简称 **NDC**，不是 NDT 或 NDF。

## Prompt:
在fragmentShader中, gl_FragDepth写入的深度坐标是直接写入到深度buffer里吗, 其取值上限也是-1.0~1.0吗?

## Response:
非常好的问题，这里涉及到 **gl\_FragDepth 的坐标空间与深度缓冲（Depth Buffer）的映射关系**。我们一点一点讲清楚 👇

* * *

🧭 结论先讲
-------

> ✅ **`gl_FragDepth` 写入的值是**：  
> **在 NDC（Normalized Device Coordinates）经过映射之后的值，范围是 \[0.0, 1.0\]**  
> 而不是 \[-1.0, 1.0\]。

换句话说：

*   如果你在 fragment shader 中写 `gl_FragDepth = 0.0;` → 像素会被认为在**最前面（近裁剪面）**
*   如果写 `gl_FragDepth = 1.0;` → 像素在**最远处（远裁剪面）**

* * *

📘 详细过程（渲染管线中的深度）
-----------------

1.  **顶点经过投影矩阵后：**  
    得到的是 clip-space 坐标：
    $$
    (x_c, y_c, z_c, w_c)
    $$
2.  **透视除法（Perspective Divide）：**
    $$
    (x_{ndc}, y_{ndc}, z_{ndc}) = \frac{(x_c, y_c, z_c)}{w_c}
    $$
    得到的范围：
    ```
    x, y, z ∈ [-1, 1]
    ```
3.  **视口变换 (Viewport Transform)：**  
    图形硬件会把 NDC 的 z 分量从 \[-1, 1\] 映射到 \[0, 1\]：
    $$
    z_{window} = \frac{z_{ndc}}{2} + \frac{1}{2}
    $$
    这就是 **深度缓冲（Depth Buffer）** 实际存储的值范围。

* * *

💡 gl\_FragDepth 的特殊性
---------------------

*   默认情况下，**fragment shader 不需要显式写 gl\_FragDepth**，系统会自动用插值后的 `gl_FragCoord.z` 写入深度缓冲。
*   但是你也可以手动修改：
    ```glsl
    void main() {
      gl_FragDepth = some_value;
    }
    ```
    这时：
    *   `gl_FragDepth` 期望的范围是 **\[0.0, 1.0\]**。
    *   如果写入范围外的值（比如 -0.2 或 1.3），OpenGL 会自动裁剪（clamp）到 \[0,1\]。

* * *

🧩 对应关系总结表
----------

| 阶段 | 坐标名 | 范围 | 说明 |
| --- | --- | --- | --- |
| Clip Space | `z_c` | 任意（取决于投影矩阵） | 透视前 |
| NDC | `z_ndc` | \[-1, 1\] | 透视除法后 |
| Window/Depth Buffer | `gl_FragDepth` | \[0, 1\] | 写入深度缓冲区的最终值 |

* * *

🔍 补充：WebGL vs OpenGL 差异
------------------------

在 WebGL（以及 OpenGL 默认）中，NDC z 范围是 `[-1, 1]`，映射到深度缓冲 `[0, 1]`。  
但在 **DirectX / Vulkan / Metal** 中，NDC z 的范围是 `[0, 1]`，这点经常让跨平台移植的开发者出 bug 😅。

* * *

### ✅ 小结

| 变量 | 坐标空间 | 值域 | 是否线性 |
| --- | --- | --- | --- |
| `gl_Position.z` | Clip Space | 任意 | 投影前 |
| `gl_FragCoord.z` | Window Space | \[0, 1\] | **非线性**（透视） |
| `gl_FragDepth` | 写入到 Depth Buffer | \[0, 1\] | 你可以手动写 |

* * *

是否要我帮你写一个简单的 shader 对比例子（比如可视化 `gl_FragDepth` vs `gl_FragCoord.z`）？这样能更直观看到两者区别。



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)