# Threejs InstancedMesh 示例

**User:** hy Niu (l1ian1998hyhy@gmail.com)  
**Created:** 2/11/2026 22:25:16  
**Updated:** 2/11/2026 22:25:51  
**Exported:** 2/12/2026 0:39:02  
**Link:** [https://chatgpt.com/c/698c9141-30b4-8322-8c68-d07a810f111d](https://chatgpt.com/c/698c9141-30b4-8322-8c68-d07a810f111d)  

## Prompt:
Threejs InstancedMesh怎么用 给点示例学习一下

## Response:
`THREE.InstancedMesh` 用于**高效渲染大量相同几何体和材质的对象**。相比创建成百上千个 `Mesh`，它通过 GPU 实例化（instancing）方式只发送一次几何数据，大幅提升性能。

下面给你几个循序渐进的示例。

* * *

一、最基础用法
=======

场景：创建 1000 个立方体，每个位置不同。

```js
import * as THREE from 'three'

// 基础三要素
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.z = 20

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// 1. 创建几何体和材质（只创建一次）
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })

// 2. 创建 InstancedMesh
const count = 1000
const instancedMesh = new THREE.InstancedMesh(geometry, material, count)
scene.add(instancedMesh)

// 3. 设置每个实例的矩阵
const dummy = new THREE.Object3D()

for (let i = 0; i < count; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 50
  )
  dummy.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  )
  dummy.updateMatrix()
  instancedMesh.setMatrixAt(i, dummy.matrix)
}

// 4. 渲染
function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

animate()
```

* * *

二、给每个实例设置不同颜色
=============

默认材质是统一颜色的。如果想让每个实例颜色不同：

### 1️⃣ 材质必须开启 vertexColors

```js
const material = new THREE.MeshBasicMaterial({ vertexColors: true })
```

### 2️⃣ 设置实例颜色

```js
const color = new THREE.Color()

for (let i = 0; i < count; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20
  )
  dummy.updateMatrix()
  instancedMesh.setMatrixAt(i, dummy.matrix)

  color.setHex(Math.random() * 0xffffff)
  instancedMesh.setColorAt(i, color)
}

// 关键：更新标记
instancedMesh.instanceColor.needsUpdate = true
```

* * *

三、动态更新实例（动画）
============

如果想让实例动起来：

```js
function animate() {
  requestAnimationFrame(animate)

  for (let i = 0; i < count; i++) {
    instancedMesh.getMatrixAt(i, dummy.matrix)
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)

    dummy.rotation.y += 0.01
    dummy.updateMatrix()

    instancedMesh.setMatrixAt(i, dummy.matrix)
  }

  instancedMesh.instanceMatrix.needsUpdate = true

  renderer.render(scene, camera)
}
```

⚠ 注意：  
每次修改后必须：

```js
instancedMesh.instanceMatrix.needsUpdate = true
```

否则不会更新。

* * *

四、常用 API 总结
===========

### 创建

```js
new THREE.InstancedMesh(geometry, material, count)
```

### 设置矩阵

```js
setMatrixAt(index, matrix)
getMatrixAt(index, matrix)
```

### 设置颜色

```js
setColorAt(index, color)
```

### 更新标记

```js
instanceMatrix.needsUpdate = true
instanceColor.needsUpdate = true
```

* * *

五、适用场景
======

*   大量树木
*   粒子
*   草地
*   城市建筑
*   重复模型

* * *

六、性能对比理解
========

| 普通 Mesh | InstancedMesh |
| --- | --- |
| 每个对象 1 次 draw call | 所有实例 1 次 draw call |
| CPU 负担大 | GPU 批量渲染 |
| 适合少量对象 | 适合成百上千 |

当数量 > 100 时差距明显。

* * *

七、进阶方向（建议学习）
============

*   InstancedBufferGeometry（自定义 attribute）
*   ShaderMaterial + instancing
*   GPU 粒子系统
*   使用 Raycaster 选中某个实例

* * *

如果你愿意，我可以给你：

*   做一个“草地系统”实例
*   做一个“城市网格”实例
*   或讲讲 instancing 的底层原理（WebGL drawArraysInstanced）

你现在主要是做什么类型项目？



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)