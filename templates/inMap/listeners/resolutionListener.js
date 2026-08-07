import { resizeFactor } from "@2dmapv2/inMap/index";
import { MAP_DEFAULT_ZOOM } from "@2dmapv2/inMap/viewport_projection";

import { debounce } from "lodash-es";

/**
 * 初始化对 openlayers "change:resolution" 事件监听
 * 当内存中的 View 对象属性变化时, 使用最新的投影矩阵更新视图
 *
 * 业务层封装占用的属性:
 * `layer.set("resizeable", true|false);`
 * `layer.set("resize", () => true|false);`
 * `feature.set("resize", () => void);`
 */
export const initResolutionListener = (map) => {
  const zoom = map.getView().getZoom();
  resizeFactor.value = Math.pow(2, zoom - MAP_DEFAULT_ZOOM);

  const _resolutionChanged = () => {
    const zoom = map.getView().getZoom();
    resizeFactor.value = Math.pow(2, zoom - MAP_DEFAULT_ZOOM);
    const layers = map.getAllLayers();

    // 遍历所有层
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];

      // 根据 layer 的 resizeable property
      if (layer.get("resizeable") === true) {
        // 如果 layer 设置了 resize 函数, 根据执行的结果判断是否堵塞feature缩放
        // 这个判断往往用于制作层在一定的缩放程度下不进行显示
        const layer_resize_func = layer.get("resize");
        if (layer_resize_func) {
          const layer_resize_func_res = layer_resize_func();
          // 只有明确返回了true才进行堵塞
          if (layer_resize_func_res === true) {
            continue;
          }
        }

        // 如果没有堵塞, 那么继续进行feature的resize回调
        const features = layer.getSource().getFeatures();
        for (let j = 0; j < features.length; j++) {
          const feature = features[j];
          if (feature.get("resize")) feature.get("resize")();
        }
      }
    }
  };

  const resolutionChanged = debounce(_resolutionChanged, 50, { trailing: true });

  map.getView().addEventListener("change:resolution", resolutionChanged);
};
