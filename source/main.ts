import { createApp } from "vue";
import "./style.css";

import App from "./App.vue";

window.addEventListener("load", () => {
    createApp(App, {
        applicationName: window["applicationName"],
    }).mount("#app");
});
