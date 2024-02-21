<script setup lang="ts">
// 测试 import assets
import VueLogoUrl from "@assets/vue.svg";
console.log(VueLogoUrl);

// 测试 import.meta.env
console.log(import.meta.env.CLIENT_VERSION);

import { ref, onMounted } from "vue";
import HelloWorld from "./components/HelloWorld.vue";
import { HelloWorld as HalloWorldTsx } from "./components/HelloWorld.tsx";

const props = defineProps(["applicationName"]);

const helloWorldComponent = ref<typeof HelloWorld | typeof HalloWorldTsx>(null);
onMounted(() => {
    window.addEventListener("keydown", (e) => {
        console.log(helloWorldComponent.value.getCounterValue());
    });
});
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
    <HalloWorldTsx v-if="props.applicationName === 'vue-tsx'" ref="helloWorldComponent" msg="Vite + Vue" info="(in TSX)" />
    <HelloWorld v-else ref="helloWorldComponent" msg="Vite + Vue" />
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
