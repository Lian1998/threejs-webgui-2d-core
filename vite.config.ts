import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const resolveProject = (relativePath: string) => path.resolve(projectRoot, relativePath);
const pagesRoot = resolveProject("multi-pages");

/** 调试页可嵌套且不必叫 index.html, 构建入口与开发服务器可访问的页面保持一致. */
function collectHtmlEntries(directory: string): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const item of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) Object.assign(entries, collectHtmlEntries(filename));
    else if (item.isFile() && item.name.endsWith(".html")) {
      const key = path.relative(pagesRoot, filename).split(path.sep).join("/").replace(/\.html$/, "");
      entries[key] = filename;
    }
  }
  return entries;
}

export default defineConfig(({ command, mode }) => ({
  root: pagesRoot,
  envDir: resolveProject(".env"),
  publicDir: resolveProject("public"),
  clearScreen: true,
  // 自定义 mode 不改变 import.meta.env.DEV, 显式 debug 构建使用同一编译期开关.
  define: { __WEBGUI_DEBUG__: JSON.stringify(command === "serve" || mode === "debug" || mode === "debug-units") },
  assetsInclude: [/\.(vs|fs|vert|frag|glsl|shader)$/i],
  resolve: {
    alias: [
      { find: "@source", replacement: resolveProject("source") },
      { find: "@core", replacement: resolveProject("core") },
      { find: "@libs", replacement: resolveProject("libs") },
      { find: /^three\/addons\//, replacement: resolveProject("libs/three.js-r170/examples/jsm") + "/" },
      { find: /^three\/examples\/jsm\//, replacement: resolveProject("libs/three.js-r170/examples/jsm") + "/" },
      { find: /^three\/src\//, replacement: resolveProject("libs/three.js-r170/src") + "/" },
      { find: /^three$/, replacement: resolveProject("libs/three.js-r170/src/Three.js") },
      { find: /^earcut$/, replacement: resolveProject("libs/earcut-3.0.2/src/earcut.js") },
      { find: /^tiny-sdf$/, replacement: resolveProject("libs/tiny-sdf-2.0.7/index.js") },
    ],
  },
  optimizeDeps: { include: ["three"] },
  plugins: [vue(), vueJsx()],
  server: {
    port: 8056,
    host: true,
    strictPort: true,
    watch: { ignored: ["!**/libs/**"] },
  },
  build: {
    target: mode.startsWith("debug") ? "esnext" : "es2020",
    minify: "esbuild",
    sourcemap: true,
    chunkSizeWarningLimit: 1024,
    assetsDir: "assets",
    assetsInlineLimit: 10240,
    outDir: resolveProject(mode === "debug-units" ? "dist-debug-units" : mode === "debug" ? "dist-debug" : mode === "core" ? "dist-core" : "dist"),
    emptyOutDir: true,
    copyPublicDir: mode !== "core",
    lib: mode === "core" ? { entry: resolveProject("core/public.ts"), formats: ["es"], fileName: "webgui-2d" } : undefined,
    // 常规构建保留旧 source 页面, 调试产物只在显式 build:debug 中生成.
    rollupOptions: mode === "core" ? undefined : {
      // 独立单元产物只包含新 refactor 页面和索引, 遗留示例仍保留原构建入口.
      input: mode === "debug-units" ? {
        "debug/index": resolveProject("multi-pages/debug/index.html"),
        ...collectHtmlEntries(resolveProject("multi-pages/debug/refactor")),
      } : mode === "debug" ? collectHtmlEntries(resolveProject("multi-pages/debug")) : resolveProject("multi-pages/index.html"),
    },
  },
}));
