import { openTabsLoading } from "../index";
import { closeTabsLoading } from "../index";

import { createAxios } from "@/utils/http/axios";
import { transform } from "@/utils/http/axios";
import { message } from "ant-design-vue";

import { getAppEnvConfig } from "@/utils/env";
import { clone } from "lodash-es";

const customTransform = clone(transform);

const temp1 = customTransform.requestInterceptors;
customTransform.requestInterceptors = (config, options) => {
  openTabsLoading();
  return temp1(config, options);
};

const temp2 = customTransform.responseInterceptors;
customTransform.responseInterceptors = (res) => {
  closeTabsLoading();
  if (res.data.msg) message.success(res.data.msg);
  return temp2(res);
};

const temp3 = customTransform.responseInterceptorsCatch;
customTransform.responseInterceptorsCatch = (axiosInstance, error) => {
  closeTabsLoading();
  return temp3(axiosInstance, error);
};

const viteEnvs = getAppEnvConfig();
export const axiosInstance = createAxios({
  // authenticationScheme: undefined,
  requestOptions: {
    apiUrl: `${viteEnvs.VITE_GLOB_MAP_RESTFUL_BASE_URL}/app-api`,
    errorMessageMode: "message",
    withToken: false,
  },

  transform: customTransform,
});
