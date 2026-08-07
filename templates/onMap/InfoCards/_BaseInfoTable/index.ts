import BaseInfoTable from "./index.vue";
import ClipboardJS from "clipboard";

import { message } from "ant-design-vue";

export const copy = (text: any) => {
  try {
    let needCopy = text;
    if (typeof text !== "string") needCopy = text.toString();
    const copyResult = ClipboardJS.copy(needCopy);
    if (copyResult) message.success("复制成功! 复制内容为 " + copyResult);
  } catch (error) {
    console.error(error);
    message.error("复制失败! 您使用的浏览器不支持复制功能");
  }
};

export default BaseInfoTable;
export { ClipboardJS };
