import { defineConfig } from "vite";
import { loadEnv } from "vite";
import path from "path";
import { fileURLToPath } from "url";

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _p = (relativePath: string) => path.resolve(__dirname, relativePath)

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, _p("./.env/"), ""); // 加载额外的env环境文件

  return {
    root: _p("./multi-pages/"), // 多页面打包模式更改入口
    envDir: _p( "./.env/"),
    publicDir: _p("./public/"),
    clearScreen: true,

    // 以 `micromatch/picomatch` 规则匹配到的`import`语句 https://github.com/micromatch/picomatch#globbing-features
    // 在资源请求时将会被标记有`enforce: "pre"`的插件提前处理掉 https://vitejs.dev/guide/api-plugin.html#plugin-ordering
    // 通常指的是 运行/打包时匹配到的资源会被直接复制到public目录, 而不会被解析和转换
    // https://vitejs.dev/config/shared-options.html#assetsinclude
    // https://vitejs.dev/guide/assets.html
    // https://github.com/vitejs/vite/blob/65ef38375045935d12ad3f4dd6da90ab5860b5cd/packages/vite/src/node/constants.ts#L98
    assetsInclude: [
      /\.(vs|fs|vert|frag|glsl|shader)$/i, // 使得shader程序可以?raw支持以原生字符串导入
    ],

    resolve: {
      alias: {
        "@source": _p("./source"),
        "@core": _p("./core"),
        "@assets": _p("./assets"),
        "@libs": _p("./libs"),
        "three": _p("./libs/three.js-r170/src/Three.js"),
        "three_addons": _p("./libs/three.js-r170/examples/jsm"),
        "earcut":  _p("./libs/earcut-3.0.2/src/earcut.js"),
        "tiny-sdf": _p("./libs/tiny-sdf-2.0.7/index.js"),
      },
    },
    
    optimizeDeps: {
      include: ["three", "three_addons"],
    },

    plugins: [vue(), vueJsx()],

    server: {
      port: 5173,
      host: true,
      strictPort: true,           // 固定端口(不会由于占用而自动顺延端口)

      watch: {
        ignored: ['!**/libs/**']
      },

      build: {
        target: "modules", //  native ES Modules, native ESM dynamic import, import.meta
        minify: "esbuild",
        sourcemap: true,
        chunkSizeWarningLimit: 1024, // 块大小(单位kB)(主要影响javascript包下载/CPU执行时间)
        assetsDir: "assets", // 静态的资产(打包模式作为静态资产处理, 并将结果直接输出到public/assets)
        assetsInlineLimit: 10240, // 静态资源如果小于 10mB 会被解析成 base64
        outDir: _p("./dist/"), // 打包输出路径
        emptyOutDir: true, // 打包清空目录
        rollupOptions: { external: [], output: {}, },
        // lib: {
        //   entry: _p("./source/main.ts"),
        //   name: "webgui2d",
        //   formats: ["es", "cjs", "iife"], // 输出格式
        // }
      },
    },
  };
});
