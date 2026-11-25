# Vite 2到8演进

**User:** Anonymous  
**Created:** 7/8/2026 14:30:06  
**Updated:** 7/8/2026 14:31:01  
**Exported:** 7/8/2026 15:43:41  
**Link:** [https://chatgpt.com/c/6a4dee6c-4aac-83e8-b165-1262cc00b4b5](https://chatgpt.com/c/6a4dee6c-4aac-83e8-b165-1262cc00b4b5)  

## Prompt:
2026/7/8 14:30:04

vite2~8有什么新增的东西, 比较粗略的和我讲一下就行

## Response:
2026/7/8 14:30:06

我会按大版本梳理 Vite 2 到 Vite 8 的主要变化，只抓“迁移时需要知道”和“能力上有什么新增”的层面，不展开细节。

> **浏览 Vite 8 发布情况与更新**
>
> [Releases](https://vite.dev/releases)
> [vite/packages/vite/CHANGELOG.md at main · vitejs/vite](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md)
> [Vite ってよく聞くけど何なんですか？ あれは](https://zenn.dev/comm_vue_nuxt/articles/what-is-vite)
> [Vite 7.0 Released](https://medium.com/%40onix_react/vite-7-0-released-00b6ecaf914c)
> [Why Vite 6 is a groundbreaking release](https://vike.dev/blog/vite-6)
> [リリース](https://ja.vite.dev/releases)
> [The Radial Velocity Experiment (RAVE): Fifth Data Release](https://arxiv.org/abs/1609.03210)
>
> **搜索Vite 2-4详细信息和相关引用**
>
> [Vite | Next Generation Frontend Tooling](https://vite.dev/)
> [vite/packages/vite/CHANGELOG.md at main · vitejs/vite](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md)
> [Getting Started](https://v3.vitejs.dev/guide/)
> [リリース](https://ja.vite.dev/releases)
> [Vite ってよく聞くけど何なんですか？ あれは](https://zenn.dev/comm_vue_nuxt/articles/what-is-vite)
> [Vite + React で新規プロジェクトの開発環境を作ろう](https://www.webcreatorbox.com/blog/vite-react)
> [Vite 3.0 の内容をおさらいする | サイボウズ フロントエンド ...](https://cybozu.github.io/frontend-expert/posts/vite-3.0)
> [Announcing Vite 2.0](https://dev.to/yyx990803/announcing-vite-2-0-2f0a)
> [Vite](https://en.wikipedia.org/wiki/Vite)
> [Here we go: just released Vite 2.0.0!](https://x.com/vite_js/status/1361811393683537922)
> [Robust Independent Validation of Experiment and Theory: Rivet version 4 release note](https://arxiv.org/abs/2404.15984)
>
> **访问官方发布页面获取详细信息**
>
> [Announcing Vite 2.0 - DEV Community](https://dev.to/yyx990803/announcing-vite-2-0-2f0a)
> [Vite 3.0 is out! | Vite](https://v3.vitejs.dev/blog/announcing-vite3.html?ref=trap.jp)
> [Vite 5.0 is out! | Vite](https://vite.dev/blog/announcing-vite5)
>
> **查找 Vite 4 公告信息**
>
> [Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8)
> [Announcing Vite 4! ⚡ : r/reactjs](https://www.reddit.com/r/reactjs/comments/zgz6u2/announcing_vite_4/)
> [Releases · vitejs/vite](https://github.com/vitejs/vite/releases)
> [Viteのフィード｜JSer.info Watch List RSS](https://jser.info/watch-list-rss/blogs/53c2f1fcf701becb83a80e5e6e24ffa4/)
> [Vite ⚡ (@vite_js) / Posts / X](https://x.com/vite_js?lang=en)
> [vite](https://www.npmjs.com/package/vite?activeTab=versions)
> [Robust Independent Validation of Experiment and Theory: Rivet version 4 release note](https://arxiv.org/abs/2404.15984)
> [Vite](https://zh.wikipedia.org/wiki/Vite)
> [Vite](https://en.wikipedia.org/wiki/Vite)
>
> **搜索Vite4相关信息**
>
> [Vite 4.0 is out! | Vite](https://vite.dev/blog/announcing-vite4)
>
> **探索Vite3功能与更多代码行**
>
> [Vite 3.0 is out! | Vite](https://v3.vitejs.dev/blog/announcing-vite3.html?ref=trap.jp)
>
> **查找Vite2官方特性**
>
> [Announcing Vite 2.0 - DEV Community](https://dev.to/yyx990803/announcing-vite-2-0-2f0a)
>
> **整理 Vite 支持信息**
>
> 用户询问 Vite 版本支持的情况，目前最新版本是 8.1.2/8.1.3（通过 npm 查找）。Vite 8.1 正式发布于 2026年6月，最新补丁是 8.1。可以简洁列出各主要版本，如：Vite 8.1 在 2026年3月后发布。所有信息需要确保准确并引用相关来源。
>
> 已思考 37s

粗略看，Vite 2 → 8 的主线是：**从“快的 dev server + Rollup build”逐步变成一个更完整的前端工具链入口**，中间主要围绕性能、SSR、插件生态、Node/ESM 现代化、最后到 Vite 8 的 Rolldown 统一打包器。

### 按大版本看

**Vite 2：奠基版**  
基本确立今天 Vite 的形态：框架无关核心、Rollup 风格插件 API、esbuild 依赖预构建、一等 CSS 支持、实验性 SSR、legacy browser 插件支持。可以理解为“现代 Vite 的第一个稳定形态”。([DEV Community](https://dev.to/yyx990803/announcing-vite-2-0-2f0a))

**Vite 3：开发体验和 SSR 打磨**  
改了默认端口，dev server/preview server 更不容易和其他工具冲突；`import.meta.glob` 功能增强，支持多 pattern、negative pattern、named import、eager 等；WASM import API 调整；SSR build 默认转向 ESM；相对 `base` 支持更好，包体也变小。([Vite](https://v3.vitejs.dev/blog/announcing-vite3.html?ref=trap.jp))

**Vite 4：Rollup 3 + React SWC**  
构建阶段升级到 Rollup 3，内部资源处理更简化；新增 `@vitejs/plugin-react-swc`，开发时用 SWC 替代 Babel，React 大项目冷启动和 HMR 会更快；现代浏览器 target 调整到 `safari14`；CSS 字符串导入改为推荐 `?inline`；官方 Vue/React 插件从 core monorepo 拆出去。([vitejs](https://vite.dev/blog/announcing-vite4))

**Vite 5：清 API + 性能继续推进**  
升级到 Rollup 4，带来构建性能提升；重点是清理废弃 API、减少历史包袱；Node.js 要求提高到 18+；CJS Node API 被标为 deprecated；新增 `server.warmup`，可以在 dev server 启动时预转换一些模块，改善启动/打开页面时的体感。([vitejs](https://vite.dev/blog/announcing-vite5))

**Vite 6：Environment API**  
这是偏框架作者/工具作者的一版。新增实验性的 **Environment API**，目标是让框架更好地描述 client、SSR、worker、edge runtime 等不同运行环境，使 dev 更接近 production。普通 SPA 用户体感变化不大。其他变化包括 JSON stringify、HTML asset reference 扩展、Sass 默认使用 modern API、library mode 可定制 CSS 输出文件名等。([vitejs](https://vite.dev/blog/announcing-vite6))

**Vite 7：ESM-only 方向 + Baseline target**  
Node 要求提高到 20.19+ / 22.12+，Vite 7 以 ESM-only 分发，同时依赖 Node 的 `require(esm)` 能力兼容 CJS 调用；默认浏览器 target 从 `'modules'` 改成 `'baseline-widely-available'`；继续推进 Environment API，并加了 `buildApp` hook；同时开始让大家试 `rolldown-vite`，为 Vite 8 铺路。([vitejs](https://vite.dev/blog/announcing-vite7))

**Vite 8：最大变化，Rolldown 统一打包器**  
Vite 8 把过去的“双打包器/双管线”思路改掉了：以前 dev 主要靠 esbuild，production build 靠 Rollup；Vite 8 改成 **Rolldown** 作为统一的 Rust-based bundler。官方说 Rolldown benchmark 下比 Rollup 快 10-30 倍，并保持 Rollup/Vite 插件 API 兼容。这个是从 Vite 2 以来最大架构变化。([vitejs](https://vite.dev/blog/announcing-vite8))

Vite 8 还加了内置 Devtools 开关、内置 `tsconfig paths` 支持、TypeScript `emitDecoratorMetadata` 支持、SSR 里的 `.wasm?init` 支持、浏览器 console 转发到 dev server terminal、`@vitejs/plugin-react` v6 改用 Oxc 做 React Refresh transform。([vitejs](https://vite.dev/blog/announcing-vite8))

**Vite 8.1：继续吃 Rolldown 红利**  
8.1 开始实验性提供 bundled dev mode，也就是开发阶段也可以 bundle，一些大型应用启动和整页 reload 会更快；还引入实验性 chunk import map，改善 chunk hash 级联导致的缓存失效；并支持 Wasm ESM integration，可以直接从 `.wasm` import 导出函数。([vitejs](https://vite.dev/blog/announcing-vite8-1))

### 一句话总结

从 Vite 2 到 5，主要是**把 dev/build 体验做稳、做快、清历史包袱**；Vite 6/7 主要是**为框架生态和多运行环境铺底层 API**；Vite 8 则是**架构级切换到 Rolldown，统一 dev/build 工具链**。

目前官方支持策略里，常规 patch 在 `vite@8.1`，`vite@7.3` 和 `vite@8.0` 回补重要修复和安全修复，`vite@6.4` 只回补安全修复，更老版本不再支持。([vitejs](https://vite.dev/releases))

---

**Sources:**

- [Announcing Vite 2.0 - DEV Community](https://dev.to/yyx990803/announcing-vite-2-0-2f0a)
- [Vite 3.0 is out! | Vite](https://v3.vitejs.dev/blog/announcing-vite3.html?ref=trap.jp)
- [Vite 4.0 is out! | Vite](https://vite.dev/blog/announcing-vite4)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)