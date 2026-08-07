import { usePermissionStoreWithOut } from "@/store/modules/permission";

export const isAuth = (el: Element, binding: any) => {
  if (!binding.value) return;

  // 如果是个字符串
  if (typeof binding.value === "string") {
    const permissionStore = usePermissionStoreWithOut();
    const allCodeList = permissionStore.getPermCodeList as string[];
    const permissionPoint = binding.value as string;
    if (!allCodeList.includes(permissionPoint as string)) (el as HTMLElement).parentNode?.removeChild(el);
  }

  // 如果是个数组
  else if (Array.isArray(binding.value)) {
    const show = conbinedAuthJudgement(binding.value);
    if (!show) (el as HTMLElement).parentNode?.removeChild(el);
  }
};

/**
 * Auth权限点组合条件判断: 假设数组传入的第一个字符串为组合条件, 其余元素为权限点
 * @param configArray 传入的字符串数组, 第一个元素为 || 或 &&
 * @returns 是否通过权限校验
 */
export const conbinedAuthJudgement = (configArray: string[]): boolean => {
  const permissionStore = usePermissionStoreWithOut();
  const allCodeList = permissionStore.getPermCodeList as string[];
  const operator = configArray[0]; // 那么数组的第一个值必须配置操作符
  const permissionInput = configArray as string[];
  const permissionPoints = permissionInput.slice(1);
  switch (operator) {
    // 只要存在权限点就显示
    case "||":
      let hit = false;
      for (let i = 0; i < permissionPoints.length; i++) {
        const permissionPoint = permissionPoints[i];
        if (allCodeList.includes(permissionPoint as string)) hit = true;
      }
      if (!hit) return false;
      return true;

    // 必须存在所有权限点才显示
    case "&&":
      for (let i = 0; i < permissionPoints.length; i++) {
        const permissionPoint = permissionPoints[i];
        if (!allCodeList.includes(permissionPoint as string)) return false;
      }
      return true;

    default:
      console.error("@2dmapv2/onMap/directives.ts - 在2dmapv2使用v-auth时请将数组内第一个字符串置为操作符");
      break;
  }
};
