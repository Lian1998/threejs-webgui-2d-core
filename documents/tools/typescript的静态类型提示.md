# 类型声明文件 .d.ts
> d.ts 是 declaration file，类型声明文件。它只描述类型和已有值的形状，不生成 JS 输出，只参与类型检查。TypeScript 官方也明确区分：.ts 是实现文件，会产出 JS；.d.ts 只含类型信息，不产出 JS。

**类型申明文件需要被 `include` 包进去**

**是否模块类型?**
TypeScript 判断一个文件是不是模块的核心规则是：顶层有 import 或 export 的文件是模块；没有顶层 import/export 的文件是 script，里面的声明进入共享全局作用域。官方文档也说明，非模块文件的内容会出现在 global scope 中，模块则有自己的作用域。


**全局扩展** 
扩展 Window、globalThis、内置对象：
```typescript
interface Window {
  __APP_CONFIG__: {
    apiBaseUrl: string;
  };
}
```
Node 或跨运行时：
```typescript
// 没有 import/export
// 顶层声明自动全局
type Foo = string;

// 有 import/export 必须包 declare global
export {};

// 一旦文件里用了 export {}，这个 .d.ts 就变成模块文件；模块文件里的声明默认不再污染全局，所以要用 declare global {} 显式声明全局扩展
declare global {
  type Foo = string;
}
```

**`.d.ts` 里进行模块声明：`declare module`**
```typescript
// src/types/untyped-lib.d.ts

declare module "untyped-lib" {
  export function parse(input: string): unknown;

  export interface Options {
    strict?: boolean;
  }
}
```

# tsconfig.json -> include
> 哪些文件会被加入 TypeScript 项目进行编译 / 类型检查。

默认主要包含 .ts .tsx .d.ts; 如果开启了 compilerOptions.allowJs 还会包含 .js .jsx

**如果配置 `*.ts` 是不包括 `.d.ts` 文件的, 但是类似 `**/*.ts` 的写法会包含 `.d.ts` 文件**

# tsconfig.json -> compilerOptions.types
> 用来限制 TypeScript 自动引入哪些全局类型声明包

默认情况下，TypeScript 会自动包含所有“可见”的 @types/* 包，例如：

node_modules/@types/node
node_modules/@types/jest
node_modules/@types/react
../node_modules/@types/...

也就是说，不配置 types 时，所有能找到的 @types 包都会参与类型检查。TypeScript 官方文档说明，node_modules/@types 以及上级目录中的 @types 包都算“visible”。

配置了 types 后，TypeScript 只会自动引入你列出的这些包
```json
{
  "compilerOptions": {
    "types": ["node", "jest"]
  }
}
```
这表示只自动引入：@types/node，@types/jest

# tsconfig.json -> compilerOptions.typeRoots
> typeRoots 是指定“去哪些目录找类型包”

```json
{
  "compilerOptions": {
    "typeRoots": ["./typings", "./node_modules/@types"]
  }
}
```

compilerOptions.typeRoots 默认不指定时，TypeScript 会自动查找所有“可见的” @types 目录。

# tsconfig.json -> compilerOptions.paths
> 模块导入路径别名

**paths 主要影响 TypeScript 的类型检查和模块解析，不一定会自动影响运行时或打包工具** 也就是说，TypeScript 可能认得 @/utils/foo，但 Vite、Webpack、Node.js、Jest 等工具未必认得，通常也需要在对应工具里配置 alias

**compilerOptions.paths 里，一个别名对应一个数组** 当这个别名匹配到某个 import 路径时，TypeScript 会按数组顺序尝试这些候选路径。