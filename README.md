# Three.js 2D WebGUI

新框架使用本地 Three.js r170/WebGL2, 提供正交2D视口, 四类图元, 自动批次, 可见像素拾取, 组合设备和实时插帧. 新接口从 `core/public.ts` 导出; `core/index.ts` 同时保留旧接口, `core/legacy.ts` 收拢历史实现.

## 启动与检查

```bash
npm install --ignore-scripts --package-lock=false
npm run dev
npm run typecheck:core
npm run build:core
npm run build:debug
npm run preview:debug
```

开发服务默认为8056. 打开 [/debug/index.html](http://localhost:8056/debug/index.html) 查看模块索引, [/debug/refactor/delivery.html](http://localhost:8056/debug/refactor/delivery.html) 查看组合设备示例, [/debug/refactor/performance.html](http://localhost:8056/debug/refactor/performance.html) 调节负载.19个新页面共用真实框架场景, 离线页独立检查GLSL3, 本地lil-gui和基础生命周期.

`build:core` 输出独立ES库到 `dist-core`, 不包含GUI, debug页面或业务图片/字体. `build:debug` 输出完整调试站点到 `dist-debug`, 显式保留调试功能. 默认 `npm run build` 仍检查原source页面, 其4个历史错误见[验证记录](./docs/verification.md), 本轮未改写该业务入口.

浏览器需支持WebGL2. Canvas容器需要实际宽高. 图片/字体运行时使用本地URL; 首次npm安装是否能离线取决于开发依赖缓存.

## 最小使用

```html
<div id="viewer" style="width:100%;height:480px"></div>
```

```ts
import { Viewer2D } from "@core/public";

const view = new Viewer2D({ container: document.querySelector<HTMLElement>("#viewer")!, debug: { gui: true } });
view.layers.add({ id: "devices", order: 20 });
await view.resources.sprites.register({ id: "body", url: "/debug/body.svg" });
const body = view.primitives.addSprite({
  layer: "devices", ownerId: "igv-1", partId: "body", image: "body",
  size: [3, 5], sizeMode: "world", transform: { position: [12, 24] },
});
await body.ready();
view.viewport.setView({ center: [12, 24], scale: 20 });
view.interaction.onSelectionChange(change => console.log(change.current?.ownerId, change.current?.partId));
const movement = view.motion.bind(body, { durationMs: 160 });
movement.push({ position: [12, 24], rotation: 0 });
movement.push({ position: [13, 24], rotation: Math.PI / 2 });
// 页面卸载时释放整个实例, 应用内切页可放进组件卸载钩子.
window.addEventListener("pagehide", () => view.dispose(), { once: true });
```

坐标为局部米, 角度为弧度. setter/update自动产生脏标记和下一帧, 业务无需操作GPU槽位或手动render.

中文文字先通过 `view.resources.fonts.register` 注册本地字体, 再用 `addText({font,text,fontSize})`. 仓库的Noto Sans SC仅包含 `public/fonts/demo-coverage.txt` 中的示例字符, 来源和OFL许可同目录保存. 实际项目需自备完整离线字体或明确的本地coverage/fallback.

```ts
const coverage = [...new Set([...(await fetch("/fonts/demo-coverage.txt").then(r => r.text()))]
  .filter(ch => ch !== "\n" && ch !== "\r"))];
await view.resources.fonts.register({
  id: "demo", family: "Noto Sans SC Demo", weight: "400",
  url: "/fonts/NotoSansSC-demo.woff2", coverage,
});
const label = view.primitives.addText({
  layer: "default", font: "demo", text: "设备 001", fontSize: 18,
  sizeMode: "screen", transform: { position: [12, 27] },
});
await label.ready();
```

[完整API](./docs/api.md)描述图元, 尺寸, 图层, 资源, 设备组合, 拾取与销毁. [验证记录](./docs/verification.md)记录已运行检查与具体限制. [分批任务](./prompts/README.md)保留00-20实现依据. 可读业务设备示例在 `core/examples/SimulatedDevice.ts`, 使用车身, 车头, 箱体, 标签与独立世界路线, 不操作内部Mesh或批次.

## 性能与浏览器复验

性能页面可调移动比例, 消息频率, 独立标签变化频率, 管线数量/点数, DPR上限与seed. CPU帧median/p95, draw calls, buffer/texture提交量, 字形/布局数和平均批次利用率用于比较同机器同配置, 不承诺固定FPS. 静止时不续RAF. "复制摘要"保留配置, 相机, 分辨率, 预热和热机标记.

可选的轻量浏览器检查不作为项目运行依赖. 安装Playwright及Chromium后, 启动dev服务并执行:

```bash
node .scripts/debug/browser-smoke.mjs http://127.0.0.1:8056
```

脚本优先使用项目可解析的Playwright, 也支持 `WEBGUI_PLAYWRIGHT_PACKAGE` 指定独立安装目录的package.json与标准 `PLAYWRIGHT_BROWSERS_PATH`. 本轮将它们安装在/tmp, 不给package.json添加依赖. Linux运行Chromium需要其系统共享库. 检查结果写入 `/tmp/webgui-browser-results.json`.

---

以下保留原始需求与目录说明.

# 需求
个人会承接一些提供实时监控工业化设备的WebGUI项目;
老项目使用OpenLayers完成视图部分的编程(我放了示例代码在`templates`下, 请参考);
此项目用于编写其中的Canvas视图部分的新框架; 新框架以离线Three.js源码为基础, 为了解决OpenLayers以下的痛点:
1. OpenLayers在多种图元视图叠加时, 选择管线选择不精准, 不可控
2. OpenLayers在图元数量多时, 渲染效率低跟不上实时达不到预期效果, 尤其是设备多插帧多时(包括滚轮缩放时也存在这个问题)
3. 客户机性能不错, OpenLayers在我这个需求下没有办法很好的用GPU加速
4. 无法在项目内过渡到三维画面(OpenLayers本质还是Cpu操作Canvas)

## 包含的必要功能
1. 图元的精准拾取
   1. 默认命中可见像素, 可配置管线容差和业务优先级, 部件返回所属设备
2. 多边形
3. 线
4. 精灵贴图
5. 文字
6. 图元的批量渲染(要支持图元必要的属性可变, API简洁)
7. 图层或是什么图元分组之类的办法(便于`Three.js`实现即可, 我还没想好)
8. 用 `typescript反射` `Three.js` `lil-gui` 生成在dev下方便进行图元类实例属性调试的工具(每个实例可调)
   1. 显式装饰器登记属性类型、范围和选项, 自动生成面板

## 项目目录介绍
1. `libs` 存放必要的离线框架, 使用离线框架也可以便于源码调试
2. `multi-pages\debug` 针对重要模块必要的测试用例
3. `core` 包含新生成框架的代码(已经完成了一部分, 但不要以我的代码为准, 请以这次新的需求规划为准)
4. `source` 模拟业务逻辑实现(在生成新框架时先不管)
5. `templates` 老项目示例代码

---------------------------

**阅读完成这些以后, 如果我的想法有明显逻辑漏洞或是不合理的地方, 给我一些思路上的建议和选择, 我决策完毕后再进行下面的内容**

请阅读完需求按照实现需求的要求尽可能的拆分功能点, 并且将拆分任务的实现细节按照多个md文件的形式放置于`prompts`中, 便于我分批执行
1. 先完成2D, 预留高度 相机和渲染后端扩展点
3. 注意功能点和功能点之间可能会有联动和嵌套
4. md文件内容中描述的实现细节尽可能简洁, 类和接口可以用伪代码或是typescript类型先写好
5. 要求新生成的框架在完成业务需求时的编程复杂度不要超过老框架太多
6. 涉及到需要使用到typescript的多重继承问题, 倾向使用 `对象组合` 去实现多重继承

# AGENTS.md
1. 在生成代码时, 在重要模块和核心处理过程或是难于理解的地方添加中文注释
2. 生成中文内容请使用英文标点符号
3. 优先代码的易读性与可拓展性
4. 不需要做比较重的测试, 先保证单模块可用, 我自己会集成来测
