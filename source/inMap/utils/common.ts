import WebGL from "three_addons/capabilities/WebGL";

export const isWebGL2Available = () => {
  if (!WebGL.isWebGL2Available()) throw new Error("浏览器不支持WebGL2");
};
