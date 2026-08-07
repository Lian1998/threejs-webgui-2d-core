import { SVG } from "@svgdotjs/svg.js";

import { hasContainerGeometry } from "@2dmapv2/inMap/containerGeometry.ts";
import { SocketioSubModule } from "@2dmapv2/classes/SocketioHelper";

// 需要加载的图片资源
const imageResources = [
  // {
  //   father: "#mtTrolley",
  //   replaced: "#mtTrolley_replaced",
  //   url: "/v2/trolley.png",
  //   svgdotjs_image: undefined,
  // },
];

export const initializeSvgPack = async (domElement: HTMLElement, svgRawContent: string) => {
  return new Promise((resolve, reject) => {
    const draw = SVG().addTo(domElement);
    draw.svg(svgRawContent);

    const onImagesLoaded = () => {
      const mt = draw.find("#MtPosMovement_00000129176291763188453190000010718998750784696466_")[0];
      const mtRopes = draw.find("#MtRope")[0];
      const mtTrolley = draw.find("#MtPosMovement")[0];
      const mtContainer = draw.find("#MtSprLock")[0];

      const pt = draw.find("#PtPosMovement_00000127017517198924617760000016271918902048435629_")[0];
      const ptRopes = draw.find("#PtRope")[0];
      const ptTrolley = draw.find("#PtPosMovement")[0];
      const ptContainer = draw.find("#PtSprLock")[0];

      const pfwsContainer = draw.find("#pfwsContainer")[0];
      const pflsContainer = draw.find("#pflsContainer")[0];

      const pp = 886.3 / 144; // 比例尺(svg单位/m)

      /** 主小车集装箱横坐标设置 */
      const setMTPositionX = (dtoX: number) => {
        const start = 25;
        const newMatrixV = start - dtoX * pp; // 后端传输的移动距离(相对于框架)*比例尺
        const newMatrixString = `matrix(1,0,0,1,${newMatrixV},0)`;
        mt.attr("transform", newMatrixString);
      };

      /** 门架小车集装箱横坐标设置 */
      const setPTPositionX = (dtoX: number) => {
        const start = -16;
        const newMatrixV = start - dtoX * pp; // 后端传输的移动距离(相对于框架)*比例尺
        const newMatrixString = `matrix(1,0,0,1,${newMatrixV},0)`;
        pt.attr("transform", newMatrixString);
      };

      /** 主小车集装箱纵坐标设置 */
      const setMTPositionY = (dtgY: number) => {
        const newMatrixV = (47.3 - dtgY) * pp; //defaultY[layerNo] - sectionStatus.distanceZ * pp; // 后端传输的高度*比例尺
        const newMatrixString = `matrix(1,0,0,1,0,${newMatrixV})`;
        mtTrolley.attr("transform", newMatrixString);

        const ropes = mtRopes.children();
        for (let i = 0; i < ropes.length; i++) {
          const rope = ropes[i];
          rope.attr("y2", 232.3 + newMatrixV);
        }
      };

      /** 门架小车集装箱纵坐标设置 */
      const setPTPositionY = (dtgY: number) => {
        const newMatrixV = (11.7 - dtgY) * pp; //defaultY[layerNo] - sectionStatus.distanceZ * pp; // 后端传输的高度*比例尺
        const newMatrixString = `matrix(1,0,0,1,0,${newMatrixV})`;
        ptTrolley.attr("transform", newMatrixString);

        const ropes = ptRopes.children();
        for (let i = 0; i < ropes.length; i++) {
          const rope = ropes[i];
          rope.attr("y2", 450.8 + newMatrixV);
        }
      };

      /** 主小车集装箱显示设置 */
      const setMTContainerVisiablity = (visiable: boolean) => {
        if (visiable) mtContainer.show();
        else mtContainer.hide();
      };
      /** 门架小车集装箱显示设置 */
      const setPTContainerVisiablity = (visiable: boolean) => {
        if (visiable) ptContainer.show();
        else ptContainer.hide();
      };
      /** 集装箱平台海侧集装箱显示设置 */
      const setPFWSContainerVisiablity = (visiable: boolean) => {
        if (visiable) pfwsContainer.show();
        else pfwsContainer.hide();
      };
      /** 集装箱平台陆侧集装箱显示设置 */
      const setPFLSContainerVisiablity = (visiable: boolean) => {
        if (visiable) pflsContainer.show();
        else pflsContainer.hide();
      };

      /** 复位 */
      const resetStatus = (id: string, socketioHelper: SocketioSubModule) => {
        setMTPositionX(0.0);
        setPTPositionX(0.0);
        setMTPositionY(47.3);
        setPTPositionY(11.7);
        setPTContainerVisiablity(false);
        setMTContainerVisiablity(false);
        setPFWSContainerVisiablity(false);
        setPFLSContainerVisiablity(false);

        // 主小车位置
        socketioHelper.registerListener<{ value: 11775; code: "DC01" }>(`DF.QC.${id}.QCMtTrolleyPos`, (itemValue) => {
          setMTPositionX(itemValue.value / 1000.0);
        });

        // 门架小车位置
        socketioHelper.registerListener<{ value: 920; code: "DC01" }>(`DF.QC.${id}.QCPtTrolleyPos`, (itemValue) => {
          setPTPositionX(itemValue.value / 1000.0);
        });

        // 主小车起升
        socketioHelper.registerListener<{ value: 618; code: "DC01" }>(`DF.QC.${id}.QCMtHoistPos`, (itemValue) => {
          setMTPositionY(itemValue.value / 100.0);
        });

        // 门架小车起升
        socketioHelper.registerListener<{ value: 1610; code: "DC01" }>(`DF.QC.${id}.QCPtHoistPos`, (itemValue) => {
          setPTPositionY(itemValue.value / 100.0);
        });

        // 门架小车锁头
        socketioHelper.registerListener<{ value: 1 | 2; code: "DC04" }>(`DF.QC.${id}.QCPtSprdTwist`, (itemValue) => {
          setPTContainerVisiablity(false);
          if (itemValue.value === 1) {
            setPTContainerVisiablity(true);
          }
        });

        // 主小车锁头
        socketioHelper.registerListener<{ value: 1 | 2; code: "DC01" }>(`DF.QC.${id}.QCMtWsSprdTwist`, (itemValue) => {
          setMTContainerVisiablity(false);
          if (itemValue.value === 1) {
            setMTContainerVisiablity(true);
          }
        });

        // 平台水侧锁头
        socketioHelper.registerListener<{ value: 1 | 2; code: "DC01" }>(`DF.QC.${id}.QCPfWsPadSize`, (itemValue) => {
          setPFWSContainerVisiablity(false);
          if (hasContainerGeometry(itemValue.value)) {
            setPFWSContainerVisiablity(true);
          }
        });

        // 平台陆侧锁头
        socketioHelper.registerListener<{ value: 1 | 2; code: "DC04" }>(`DF.QC.${id}.QCPfLsPadSize`, (itemValue) => {
          setPFLSContainerVisiablity(false);
          if (hasContainerGeometry(itemValue.value)) {
            setPFLSContainerVisiablity(true);
          }
        });
      };

      resolve({
        draw,
        setMTPositionX,
        setPTPositionX,
        setMTPositionY,
        setPTPositionY,
        setMTContainerVisiablity,
        setPTContainerVisiablity,
        setPFWSContainerVisiablity,
        setPFLSContainerVisiablity,
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
