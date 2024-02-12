# 包含功能
1. `pnpm install` 自动调用 `pnpm run prepare`, 生成本地 `husky工作目录`
2. `pnpm run format` 使用 `prettier` 进行 `代码格式化`
3. `git->pre-commit` 使用 `npx lint-staged` 对 `Staged Changes` 使用 `.lintstagedrc.cjs` 脚本
4. `git->commit-msg` 使用 `commitlint` 继承 `config-conventional`配置包 对 `Commit Message` 进行格式化校验
5. `.vscode/extensions.json` 提供 `vscode extensions` 推荐
6. `.vscode/settings.json` 提供 `vscode worksapce settings`


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