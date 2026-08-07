import { MAP_MIN_ZOOM } from "@2dmapv2/inMap/viewport_projection";

import { throttle } from "lodash-es";

/**
 * 初始化Openlayers的选择事件管线
 */
export const initSelectPipeLine = (map) => {
  let featurePointer = undefined; // 当前悬浮的
  let lastMoveinFeaturePointer = undefined; // 上一个悬浮的
  let lastSelectedFeaturePointer = undefined; // 上一个选择的
  let clickEvent = undefined;

  // 监听鼠标指针在地图上的移动事件
  let _pixel = undefined;
  const _detect = () => {
    const feature = map.forEachFeatureAtPixel(
      _pixel,
      (feature, layer) => {
        // 如果这里不return, 那么穿透找到所有的feature
        // 否则只会找到最近一个添加的layer的一个feature (最靠近视口的)
        return feature;
      },
      {
        hitTolerance: 5.0, // 允许像素误差
        layerFilter: (layer) => {
          if (layer.get("selectable") && layer.getVisible()) return true;
          return false;
        },
      },
    );

    featurePointer = feature;

    let moveInFlag = false;
    let moveOutFlag = false;

    if (featurePointer) {
      const featurePointerId = featurePointer.getId();
      if (lastMoveinFeaturePointer) {
        const lastMoveinFeaturePointerId = lastMoveinFeaturePointer.getId();
        // 选了新的, 以前是旧的
        if (lastMoveinFeaturePointerId !== featurePointerId) {
          moveInFlag = true;
          moveOutFlag = true;
        }
      }
      // 选了新的, 以前是空的
      else if (lastMoveinFeaturePointer === undefined) {
        moveInFlag = true;
      }
    } else if (featurePointer === undefined) {
      if (lastMoveinFeaturePointer) {
        moveOutFlag = true;
      }
    }

    if (moveOutFlag) {
      moveout(lastMoveinFeaturePointer);
      lastMoveinFeaturePointer = undefined;
    }
    if (moveInFlag) {
      lastMoveinFeaturePointer = featurePointer;
      movein(lastMoveinFeaturePointer);
    }
  };
  const onDetect = throttle(_detect, 50, { trailing: true });
  map.addEventListener("pointermove", (e) => {
    const { pixel, originalEvent } = e;
    _pixel = pixel;
    onDetect();
  });

  // 监听点击在地图上的事件
  map.addEventListener("click", () => {
    clearTimeout(clickEvent);
    clickEvent = setTimeout(singleClick, 30);
  });

  // 监听双击在地图上的事件
  map.addEventListener("dblclick", () => {
    clearTimeout(clickEvent);
    doubleClick();
  });

  const singleClick = () => {
    // CancelSelect
    if (lastSelectedFeaturePointer) {
      const lastSelectedFeaturePointerId = lastSelectedFeaturePointer.getId();
      let cancelSelectedFlag = false;
      if (featurePointer) {
        const featurePointerId = featurePointer.getId();
        // 从旧的变成一个新的
        if (lastSelectedFeaturePointerId !== featurePointerId) {
          cancelSelectedFlag = true;
        }
      }
      // 点空的
      else if (featurePointer === undefined) {
        cancelSelectedFlag = true;
      }

      if (cancelSelectedFlag) {
        cancelSelected(lastSelectedFeaturePointer);
        lastSelectedFeaturePointer = undefined;
      }
    }

    // Select
    if (featurePointer) {
      selected(featurePointer);
      lastSelectedFeaturePointer = featurePointer;
    }
  };

  const doubleClick = () => {
    if (featurePointer) {
      doubleClicked(featurePointer);
    }
  };

  const selected = (feature) => {
    const selectedFunc = feature.get("selected");
    if (selectedFunc) selectedFunc();
  };
  const cancelSelected = (feature) => {
    const cancelSelectedFunc = feature.get("cancelSelected");
    if (cancelSelectedFunc) cancelSelectedFunc();
  };
  const doubleClicked = (feature) => {
    const doubleClickedFunc = feature.get("doubleClicked");
    if (doubleClickedFunc) doubleClickedFunc();
  };
  const movein = (feature) => {
    const moveinFunc = feature.get("movein");
    if (moveinFunc) moveinFunc();
  };
  const moveout = (feature) => {
    const moveoutFunc = feature.get("moveout");
    if (moveoutFunc) moveoutFunc();
  };

  /** 抛出选择事件 */
  const selectAndFocus = (feature, zoomLevel) => {
    if (lastSelectedFeaturePointer) {
      const cancelSelectedFunc = lastSelectedFeaturePointer.get("cancelSelected");
      if (cancelSelectedFunc) {
        cancelSelectedFunc();
      }
    }

    lastSelectedFeaturePointer = feature;
    if (feature) {
      const selectedFunc = feature.get("selected");
      if (selectedFunc) selectedFunc();
      const coordinates = feature.getGeometry().flatCoordinates;
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const view = map.getView();
        view.animate({ center: coordinates, duration: 500, zoom: zoomLevel ? zoomLevel : MAP_MIN_ZOOM + 1 });
      }
    }
  };

  return { selectAndFocus };
};
