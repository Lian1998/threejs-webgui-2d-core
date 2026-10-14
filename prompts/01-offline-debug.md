# 01. 离线工程与 debug 入口

前置: 00. 后续: 02, 各模块 debug 页面, 20.

## 目标与边界

先建立能运行, 能检查类型, 能构建的模块调试入口. 首期使用仓库中的 Three.js r170/WebGL2, 不升级离线库, 不修改其源码来修补业务逻辑.

浏览器运行时的库, 字体和图片不依赖 CDN. npm 开发依赖的安装是独立条件, 不能由 `libs` 存在推断安装过程可离线完成. 当前仓库没有 `node_modules`, 执行前先确认依赖是否已备齐.

建议交付:

```text
vite.config.ts
tsconfig.json
.env/vite-env.d.ts
core/debug/offline/index.ts
multi-pages/debug/offline/index.html
multi-pages/debug/index.html
```

## 已发现的工程事项

- `vite.config.ts` 的 `build` 当前放在 `server` 内. 移到顶层, 保留必要输出配置, 核对路径是否仍相对项目根.
- Vite root 是 `multi-pages`, 已有多个 debug HTML, 当前没有逐页 `rollupOptions.input`. 开发可访问页面不代表构建会输出页面.
- `tsconfig.json` 已有 core 和 source 的 TS 范围, 缺少 `multi-pages/**/*.ts`. 新页面脚本应改成独立 TS 文件并纳入检查.
- `three`, `three/addons/*`, `three/src/*` 的运行时和类型声明分别来自 `libs/three.js-r170` 与 `libs/three-ts-types-r170`.
- 本地 lil-gui 在 `examples/jsm/libs/lil-gui.module.min.js`, 类型包内有对应声明. `earcut` 和 `tiny-sdf` 也有本地 JS 和声明.
- `optimizeDeps.include` 中的 `three/addons` 是目录别名, 不应当作确定的模块入口. 删除该项或仅登记已验证可解析的具体模块.

## 实现步骤

1. 核对 Three.js 的 `REVISION`, `version.md` 和声明版本均为 r170. 保留运行时源码映射, 防止运行时指向 npm 新版而类型仍指向 r170.
2. 用明确匹配表达别名: `three` 仅匹配包根, `three/addons/` 与 `three/src/` 匹配子路径. 需要兼容 `three/examples/jsm/` 时显式添加对应映射.
3. 同步 TS `paths`. earcut/tiny-sdf 的运行时指向本地 JS, 类型检查指向各自声明, 不用全局 `any` 绕过解析问题.
4. 保持着色器使用 `import shader from "./shader.vs?raw"`. 统一 `.vs/.fs/.vert/.frag/.glsl` 的原始文本声明, 不把资产 URL 误当成 shader 源码.
5. 示例采用 `RawShaderMaterial` 与 `THREE.GLSL3`. 明确 Three.js 注入版本行的职责, 避免源码与材质重复声明 `#version`.
6. 建立 debug HTML 清单或小型入口发现函数, 覆盖嵌套目录及现有非 `index.html` 页面. 入口名称稳定, 不意外收录缓存和构建产物.
7. 默认业务构建保留现有入口. 增加 `build:debug` 命令或独立 debug mode, 将 debug HTML 明确作为多页面输入. 调试入口不从业务入口静态导入.
   在 Vite define 中设置 `__WEBGUI_DEBUG__ = command === "serve" || mode === "debug"`, 并在环境声明中定义 boolean 类型. 普通 `vite build --mode debug` 的 DEV 仍可能为 false, 不能用 DEV 单独判断显式调试构建. 参考 [Vite 官方 mode 说明](https://vite.dev/guide/env-and-mode#node-env-and-modes).
8. 将新页面的 TS 纳入类型检查. 若已有 source 错误阻碍单模块推进, 增设聚焦 core/debug 的 tsconfig, 同时记录旧构建问题供 20 处理.
9. 创建 debug 索引页, 列出当前已存在的页面. 后续任务新增页面时追加链接, 不把尚未实现的任务显示为可用模块.
10. 页面建立容器, 统一 resize/DPR 处理入口和错误提示. WebGL2 不可用时清晰停止, 不承诺 r170 的 WebGL1 回退.

## 最小检查示例

```ts
import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import vertexShader from "./shaders/check.vs?raw";

interface OfflineCheckResult {
  revision: string;
  webgl2: boolean;
  guiAvailable: boolean;
  shaderCompiled: boolean;
}

// 独立 debug 页面可直接使用 Three.js, 无需等待 02-20.
const renderer = new THREE.WebGLRenderer({ antialias: false });
const gui = new GUI({ container: debugPanel });
// 用最小三角形确认 GLSL3 编译及本地模块加载.
```

检查脚本只记录版本, 能力和加载结果. 不在核心包导入 GUI, 不用真实业务, 网络接口或复杂场景验证工程基础.

## 联动约定

- 02 负责最终 Viewer 的相机, 尺寸与坐标, 此页面的临时 setup 不变成第二套公开 Viewer API.
- 06/10/12 的图片与字体通过本地资源接口加载, URL 可使用相对路径或本地部署路径.
- 18 使用同一 lil-gui 离线入口和 `__WEBGUI_DEBUG__` 编译开关, 沿用现有 `experimentalDecorators` 方案, 不额外启用完整运行时类型反射. 默认生产构建关闭开关, 显式 debug 构建允许调试代理, 元数据和 GUI.
- 后续模块的重要逻辑写中文注释, 中文内容使用英文标点. 不为此任务格式化整个仓库.
- 调试页面拥有自身销毁方法, 页面离开和 HMR 时清理 renderer, GUI, DOM 和监听器.

## 轻量验收

1. 先检查 `node_modules` 和锁文件. 依赖已存在时运行现有类型检查与 debug 构建; 缺失时记录需要安装的开发依赖, 不声称已通过构建.
2. 打开 `/debug/offline/index.html`, 确认 r170, 三角形和 GUI 可用, shader 编译没有重复版本行错误.
3. 构建后用本地 preview 打开该页及一个已有嵌套页面, 确认 JS, shader, 样式和本地资源路径正确.
4. 断开外网后刷新页面, 资源请求不指向 CDN. 这项验证不要求 npm 安装过程断网.
5. debug 页面不进入默认业务包入口. 修正后的顶层 build 配置实际生效, 新 TS 页面参与检查.

执行完成时列出配置变更, 已运行命令和仍存在的旧代码检查问题. 此任务不迁移 source, 不删除已有 debug 页面.
