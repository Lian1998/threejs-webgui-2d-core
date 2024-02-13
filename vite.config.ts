import { defineConfig } from "vite";
import { loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
    
    const env = loadEnv(mode, path.resolve(__dirname, "./.env/"), ""); // 加载额外的env环境文件

    return {
        appType: "mpa",
        root: path.resolve(__dirname, "./multi-pages/"), // 多页面打包模式更改入口
        envDir: path.resolve(__dirname, "./.env/"),
        envPrefix: "CLIENT_",
        publicDir: path.resolve(__dirname, "./public/"),
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
                "@source": path.resolve(__dirname, "./source"),
                "@assets": path.resolve(__dirname, "./assets"),
                "@libs": path.resolve(__dirname, "./libs"),
            }
        },
        
        plugins: [
            vue(),                      // Vue3 SFC(Single-File Component) 解析器
            vueJsx(),                   // Vue3 SFC 支持 JSX/TSX 解析器
        ],
    
        server: {
            host: "0.0.0.0",            // 广播ip地址
            port: 5173,
            strictPort: true,           // 固定端口(不会由于占用而自动顺延端口)
            open: false,                // 不自动打开页面
            cors: true,                 // 打开跨域请求
            proxy: {                    // 代理配置
                "/test_server1": {
                    target: "http://test.server1.com",
                    changeOrigin: true,
                    rewrite: (path) => { return path.replace(/^\/test_server1/, "/apis"); }
                }
            }
        },
    
        build: {
            target: "modules", //  native ES Modules, native ESM dynamic import, import.meta
            minify: "esbuild",
            sourcemap: true,
            modulePreload: {
                polyfill: true, // 自动注入pollyfill
            },
            chunkSizeWarningLimit: 1024,                        // 块大小(单位kB)(主要影响javascript包下载/CPU执行时间)
            assetsDir: "assets",                                // 静态的资产(打包模式作为静态资产处理, 并将结果直接输出到public/assets)
            assetsInlineLimit: 10240,                           // 静态资源如果小于 10mB 会被解析成 base64
            outDir: path.resolve(__dirname, "./dist/"),         // 打包输出路径
            emptyOutDir: true,                                  // 打包清空目录
            rollupOptions: {
                // https://vitejs.dev/guide/build.html#multi-page-app
                input: {
                    index: path.resolve(__dirname, "./multi-pages/index.html"),
                    hello: path.resolve(__dirname, "./multi-pages/hello/index.html")
                },
                output: {
                    // https://vitejs.dev/config/build-options.html#build-rollupoptions
                    // https://rollupjs.org/configuration-options/#output-manualchunks
                    manualChunks: { lodash: ["@libs/lodash"] }
                }
            },
        },
    }
});
