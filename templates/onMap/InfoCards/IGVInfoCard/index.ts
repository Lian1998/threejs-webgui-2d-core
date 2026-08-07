import IGVInfoCard from "./index.vue";

import { ref } from "vue";

export const tabsLoading = ref<boolean>(false);

export const openTabsLoading = () => {
  tabsLoading.value = true;
};

export const closeTabsLoading = () => {
  setTimeout(() => {
    tabsLoading.value = false;
  }, 200);
};

export default IGVInfoCard;
