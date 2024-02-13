# 模板包含功能

nodejs工作管线:
1. `pnpm install` 自动调用 `pnpm run prepare`, 生成本地 `husky工作目录`
2. `pnpm run format` 使用 `prettier` 进行 `代码格式化`
3. `git->pre-commit` 使用 `npx lint-staged` 对 `Staged Changes` 使用 `.lintstagedrc.cjs` 脚本
4. `git->commit-msg` 使用 `commitlint` 继承 `config-conventional`配置包 对 `Commit Message` 进行格式化校验
5. `.vscode/extensions.json` 提供 `vscode extensions` 推荐
6. `.vscode/settings.json` 提供 `vscode worksapce settings` 常规设置
7. `.vscode/typescriptreact.code-snippets` 提供 `typescriptreact`语言环境下的Vue3组件快速创建模板
8. 工具脚本目录

Vite特性:
1. Vue3的jsx/tsx单文件组件 与 jsx/tsx单文件组件解析器
2. WebGL的Shader(glsl)作为静态文件的支持
3. Vite的环境变量(基于模块化源属性), 开发服务器(nodejs)读取 与 端(browser)读取
4. 多页面构建模式
5. 下载库本地构建(方便调整库的源码)

**1:**  
`./source/components/HelloWorld.tsx` 基于tsx的sfc编写的组件(需要插件`@vitejs/plugin-vue-jsx`)  
`./source/components/HelloWorld.vue` 基于vue的sfc编写的组件 

**3:**  
在 `vite.config.ts` 中使用 `loadEnv` 函数读取和使用环境变量  
`CLINET_` 开头的抛出到客户端  

**4, 5:**  
[多页面构建模式](https://vitejs.dev/guide/build.html#multi-page-app)
打包构建出两个页面 `主页` 和 `hello页面`,  
这两个页面导入的javascript入口模块都依赖 lodash 包(该lodash包于本地构建) [多入口同依赖, manualChunks手动封包](https://rollupjs.org/configuration-options/#output-manualchunks)  
配置 `rolllup.output.manualChunks` 只会生成一个 `lodash chunk`  
因为 [rollup 的 Tree Shaking 特性](https://rollupjs.org/introduction/#tree-shaking), `lodash chunk` 中只包含了 `add` `ceil` 函数代码以及它们共同的依赖代码  


# 链接
husky:  
[page](https://typicode.github.io/husky/)
[github](https://github.com/typicode/husky)

lint-stage:  
[page/github](https://github.com/lint-staged/lint-staged#readme)

prettier:  
[page](https://github.com/prettier/prettier)
[github](https://prettier.io/)

commitlint:  
[page](https://github.com/conventional-changelog/commitlint)
[github](https://commitlint.js.org/#/)