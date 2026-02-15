1. `tsconfig.json` 中 `compilerOptions.types` 配置默认会自动使用typescirpt的 `无极目录搜索@types功能` 自动搜索并包含所有 `@types` 下的类型声明; 如果手动覆盖了配置项目, 那么只有手动指定数组中的模块会使用搜索
2. `tsconfig.json` 中的 `include配置项`, 如果配置 `*.ts` 是不包括 `.d.ts` 文件的, 但是类似 `**/*.ts` 的写法会包含 `.d.ts` 文件
3. 下述内容中要自定义 types 的文件必须要被 `include配置项` 包括!
4. 一个 `.d.ts` 文件有两种加入到内存的模式: `模块模式 Module` 和 `全局模式 Script/Global`
5. 如果整个文件内容中只要出现 `顶层的import或export`, 那么就会被视为 `模块模式`, 必须通过 import 显式使用了
6. `模块增强 Module Augmentation` import进入 `模块模式` 可以对某个模块的类型进行补充
7. 模块的类型匹配优先级为 `paths配置项` -> `node_modules/index.d.ts` -> `node_modules/@types`
8. 如果这个文件是 `全局模式` 那么 `declare` 的就是全局变量