<template>
  <div id="gui-footer">
    <div id="mouseposition-listen">
      <SvgIcon size="20" name="mapui-maplocation" color="#fff" />
    </div>

    <div class="legends">
      <div class="classes">
        <span class="class-name">任务类型:</span>
        <template v-for="item of containerStatus">
          <SvgIcon size="20" name="mapui-rect" :color="item.value" />
          <span>{{ item.name }}</span>
        </template>
      </div>

      <div class="classes">
        <span class="class-name">{{ t("2dmapv2.CommonUI.footer.tilelayer.title") }}:</span>
        <template v-for="item of tiers">
          <SvgIcon size="20" name="mapui-rect" :color="item.value" />
          <span>{{ item.name }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import "./index.scss";
import SvgIcon from "@/components/Icon/src/SvgIcon.vue";
import { getColorString } from "@2dmapv2/classes/colorConfig";
import { useI18n } from "@/hooks/web/useI18n";
const { t } = useI18n();

const tiers = [];
for (let i = 1; i <= 6; i++) {
  tiers.push({
    name: `${i}层`,
    value: getColorString(`VARS.YARD_TIER.TIER${i}`),
  });
}

const moveKinds = ["LOAD", "DSCH", "YARD", "DLVR", "RECV", "UNKNOWN"];
const trans_moveKinds = ["装船", "卸船", "移箱", "提箱", "收箱", "未知"];
const containerStatus = [];
for (let i = 0; i < moveKinds.length; i++) {
  containerStatus.push({
    name: trans_moveKinds[i],
    value: getColorString(`VARS.CONTAINER_STATUS.${moveKinds[i]}`),
  });
}
</script>
