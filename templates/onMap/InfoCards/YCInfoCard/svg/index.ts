import { SVG } from "@svgdotjs/svg.js";
import { YCMap } from "@2dmapv2/data/index";
import { BlockMap } from "@2dmapv2/data/index";

import { socketioSubModule_infocard_yc as socketioHelper } from "@2dmapv2/data/initWebSocketData";

// 需要加载的图片资源
const imageResources = [
  // {
  //   father: "#mtTrolley",
  //   replaced: "#mtTrolley_replaced",
  //   url: "/v2/trolley.png",
  //   svgdotjs_image: undefined,
  // },
  // {
  //   father: "#mtContainer",
  //   replaced: "#mtContainer_replaced",
  //   url: "/v2/container.png",
  //   svgdotjs_image: undefined,
  // },
  // {
  //   father: "#ptTrolley",
  //   replaced: "#ptTrolley_replaced",
  //   url: "/v2/trolley.png",
  //   svgdotjs_image: undefined,
  // },
  // {
  //   father: "#ptContainer",
  //   replaced: "#ptContainer_replaced",
  //   url: "/v2/container.png",
  //   svgdotjs_image: undefined,
  // },
];

export const initializeSvgPack = async (domElement: HTMLElement, svgRawContent: string) => {
  return new Promise((resolve, reject) => {
    const draw = SVG().addTo(domElement);
    draw.svg(svgRawContent);

    const onImagesLoaded = () => {
      // 岸桥轨道车
      const mt = draw.find("#MtPosMovement")[0];
      const mtRopes = draw.find("#MtRope")[0];
      const mtTrolley = draw.find("#MhPosMovement")[0];
      const mtContainer = draw.find("#MtSprLock")[0];

      const ladder = draw.find("#ladder")[0];
      const ladderReverse = draw.find("#ladder-reverse")[0];

      let pp = 672.9 / 37; // 34, 37, 39, 21 比例尺(svg单位/m)
      let blockDefs = undefined;

      /** 主小车集装箱横坐标设置 */
      const setMTPositionX = (dtoX: number) => {
        const start = -125;
        const newMatrixV = start + dtoX * pp; // 后端传输的移动距离(相对于框架)*比例尺
        const newMatrixString = `matrix(1,0,0,1,${newMatrixV},0)`;
        mt.attr("transform", newMatrixString);
      };

      /** 主小车集装箱纵坐标设置 */
      const defaultY2 = mtRopes.children()[0].attr("y2");
      const setMTPositionY = (dtgY: number) => {
        // const newMatrixV = 0; // 后端传输的高度*比例尺
        const newMatrixV = 250 - dtgY * pp; // 后端传输的高度*比例尺
        const newMatrixString = `matrix(1,0,0,1,0,${newMatrixV})`;
        mtTrolley.attr("transform", newMatrixString);

        const ropes = mtRopes.children();
        for (let i = 0; i < ropes.length; i++) {
          const ropeEl = ropes[i];
          ropeEl.attr("y2", defaultY2 + newMatrixV);
        }
      };

      /** 主小车集装箱显示设置 */
      const setMTContainerVisiablity = (visiable: boolean) => {
        if (visiable) mtContainer.show();
        else mtContainer.hide();
      };

      /** 复位 */
      const resetStatus = (id: string) => {
        const ycItem = YCMap.get(id);
        const blockItem = BlockMap.get(ycItem.information.BLOCK_NAME);
        blockDefs = blockItem.defs;
        // console.warn("blockDefs", blockDefs);
        pp = 439 / blockDefs.railPitch;

        setMTPositionX(0);
        setMTPositionY(0);
        setMTContainerVisiablity(false);

        ladder.hide();
        ladderReverse.hide();
        if (blockDefs.landIncreCol) ladderReverse.show();
        else ladder.show();

        socketioHelper.registerListener<{ value: 22000; code: "DC01" }>(`DF.YC.${id}.ASCTrolleyCurPos`, (itemValue) => {
          setMTPositionX(itemValue.value / 1000.0);
        });
        socketioHelper.registerListener<{ value: 8000; code: "R629" }>(`DF.YC.${id}.ASCHoistCurPos`, (itemValue) => {
          setMTPositionY(itemValue.value / 1000.0);
        });
        socketioHelper.registerListener<{ value: 1 | 2; code: "R601" }>(`DF.YC.${id}.ASCSpreaderTwistStatus`, (itemValue) => {
          setMTContainerVisiablity(false);
          if (itemValue.value === 1) {
            setMTContainerVisiablity(true);
          }
        });
      };

      resolve({
        draw,
        setMTPositionX,
        setMTPositionY,
        setMTContainerVisiablity,
        resetStatus,
      });
    };

    let loadedImages = 0;

    // 不需要换图片
    if (imageResources.length <= 0) {
      onImagesLoaded();
    }
    // 需要换图片
    else {
      for (let i = 0; i < imageResources.length; i++) {
        const imageResourcesObject = imageResources[i];
        imageResourcesObject.svgdotjs_image = draw.image(imageResourcesObject.url).on("load", () => {
          const fatherS = draw.find(imageResourcesObject.father)[0];
          const replacedS = draw.find(imageResourcesObject.replaced)[0];
          imageResourcesObject.svgdotjs_image.addTo(fatherS);
          imageResourcesObject.svgdotjs_image.move(replacedS.x(), replacedS.y());
          replacedS.remove();

          loadedImages += 1;
          if (loadedImages === imageResources.length) {
            onImagesLoaded();
          }
        });
      }
    }
  });
};
