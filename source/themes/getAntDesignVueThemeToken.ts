import { theme } from "ant-design-vue";

/**
 * 获取ant-design-vue默认的ThemeToken内容
 * @returns
 */
export const getAntDesignVueDefaultToken = () => {
  const { defaultAlgorithm, defaultSeed } = theme;
  const mapToken = defaultAlgorithm(defaultSeed);

  const result = new Map<string, string>();
  Object.entries(mapToken).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      result.set(`--ant-${kebabCase(key)}`, String(value));
    }
  });
  return result;
};

/**
 * 获取ant-design-vue当前使用的ThemeToken内容
 * @returns
 */
export const getAntDesignVueCurrentToken = () => {
  const { useToken } = theme;
  const { token } = useToken();

  const result = new Map<string, string>();
  Object.entries(token.value as Record<string, any>).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      result.set(`--ant-${kebabCase(key)}`, String(value));
    }
  });
  return result;
};

const kebabCase = (str: string) => {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
};
