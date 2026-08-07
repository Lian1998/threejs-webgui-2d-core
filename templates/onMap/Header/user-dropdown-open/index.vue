<script lang="ts" setup>
import "./index.scss";
import { Avatar, Dropdown, Menu } from "ant-design-vue";
import { UserOutlined } from "@ant-design/icons-vue";
import type { MenuInfo } from "ant-design-vue/lib/menu/src/interface";
import { computed } from "vue";
import { useUserStoreWithOut } from "@/store/modules/user";
import { useI18n } from "@/hooks/web/useI18n";
import headerImg from "@/assets/images/header.jpg";
import MenuItem from "./DropMenuItem.vue";

type MenuEvent = "profile" | "logout" | "doc" | "lock";

const { t } = useI18n();
const userStore = useUserStoreWithOut();

const getUserInfo = computed(() => {
  const { nickname = "", avatar } = userStore.getUserInfo.user || {};
  return { nickname, avatar: avatar || headerImg };
});

//  login out
function handleLoginOut() {
  userStore.confirmLoginOut();
}

function openProfile() {
  window.open("/#/profile/index");
}

function handleMenuClick(e: MenuInfo) {
  switch (e.key as MenuEvent) {
    case "profile":
      openProfile();
      break;
    case "logout":
      handleLoginOut();
      break;
  }
}
</script>

<template>
  <Dropdown placement="bottomLeft" :overlay-class-name="'user-dropdown-overlay'">
    <span>
      <Avatar :src="getUserInfo.avatar" size="small">
        <template #icon>
          <UserOutlined />
        </template>
      </Avatar>
      <span>
        <span class="truncate">
          {{ getUserInfo.nickname }}
        </span>
      </span>
    </span>

    <template #overlay>
      <Menu @click="handleMenuClick">
        <MenuItem key="profile" :text="t('layout.header.accountCenter')" icon="ion:person-outline" />
        <MenuItem key="logout" :text="t('layout.header.dropdownItemLoginOut')" icon="ion:power-outline" />
      </Menu>
    </template>
  </Dropdown>
</template>
