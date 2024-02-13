<script setup lang="ts">
// import { HelloWorld } from "./components/HelloWorld";
import { HelloWorld } from "./components/HelloWorld.tsx";
import VueLogoUrl from "@assets/vue.svg"; // 测试`import语法`导入`assets静态资源`(以url方式解析)

console.warn("import.meta.env 抛出前缀为 `CLIENT_` 配置项", import.meta.env.CLIENT_VERSION);
</script>

<template>
    <div>
        <a href="https://vitejs.dev" target="_blank">
            <img src="/vite.svg" class="logo" alt="Vite logo" />
        </a>
        <a href="https://vuejs.org/" target="_blank">
            <img :src="VueLogoUrl" class="logo vue" alt="Vue logo" />
        </a>
    </div>
    <HelloWorld msg="Vite + Vue" info="(in TSX)" />
</template>

<style scoped>
.logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
}

.logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
    filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
