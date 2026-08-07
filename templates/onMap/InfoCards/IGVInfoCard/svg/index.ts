import { SVG } from "@svgdotjs/svg.js";
import { Tspan } from "@svgdotjs/svg.js";
import { setStyleByMoveKind } from "@2dmapv2/inMap/projectUtils";

import { socketioSubModule_infocard_igv as socketioHelper } from "@2dmapv2/data/initWebSocketData";
import { getAccValue } from "@2dmapv2/classes/DataHelper.js";

// 需要加载的图片资源
const imageResources = [
  // {
  //   father: "#container20_front",
  //   replaced: "#container20_front_replaced",
  //   url: "/v2/container20.png",
  //   svgdotjs_image: undefined,
  // },
  // {
  //   father: "#container20_behind",
  //   replaced: "#container20_behind_replaced",
  //   url: "/v2/container20.png",
  //   svgdotjs_image: undefined,
  // },
  // {
  //   father: "#container40",
  //   replaced: "#container40_replaced",
  //   url: "/v2/container4045.png",
  //   svgdotjs_image: undefined,
  // },
];

export const initializeSvgPack = async (domElement: HTMLElement, svgRawContent: string) => {
  return new Promise((resolve, reject) => {
    const draw = SVG().addTo(domElement);
    draw.svg(svgRawContent);

    const onImagesLoaded = () => {
      // 集装箱图片位置元素(如果不被替换的话dom元素还会存在)
      const container1_ = draw.find("#container20_front_replaced")[0]; // 前箱(靠近车头)
      const container2_ = draw.find("#container20_behind_replaced")[0]; // 前箱(靠近车头)
      const container3_ = draw.find("#container40_replaced")[0]; // 前箱(靠近车头)
      const containerColorsEl = [container1_, container2_, container3_];

      // 集装箱图片元素
      const container1 = draw.find("#container20_front")[0];
      const container2 = draw.find("#container20_behind")[0];
      const container3 = draw.find("#container40")[0];
      const containers = [container1, container2, container3];

      // 集装箱箱门元素
      const containerDoor1 = draw.find("#containerDoor1")[0];
      const containerDoor2 = draw.find("#containerDoor2")[0];
      const containerDoor3 = draw.find("#containerDoor3")[0];
      const containerDoor4 = draw.find("#containerDoor4")[0];
      const containerDoors = [containerDoor1, containerDoor2, containerDoor3, containerDoor4];

      // 文字描述锚点
      const texts = [];
      const tspans: Tspan[][] = [[], [], []];
      for (let i = 0; i < 3; i++) {
        const text = draw.text((add) => {
          for (let j = 0; j < 4; j++) {
            const tspan = add.tspan("").newLine();
            tspans[i].push(tspan);
          }
        });
        texts.push(text);
      }
      texts[0].move(260, 38);
      texts[1].move(28, 38);
      texts[2].move(140, 38);
      texts[0].scale(2.2);
      texts[1].scale(2.2);
      texts[2].scale(2.2);

      /** 设置集装箱文字 */
      const setContainerDescritionText = (index: number, data: Record<string, any> = undefined, dataKey: string = undefined) => {
        if (data === undefined) {
          for (let j = 0; j < 4; j++) {
            tspans[index][j].text("");
          }
          return;
        }

        // 文字内容
        tspans[index][0].text(getAccValue(data, `containerId${dataKey}`));
        tspans[index][1].text(getAccValue(data, `containerSize${dataKey}`));
        tspans[index][2].text(getAccValue(data, `originSlot${dataKey}`));
        tspans[index][3].text(getAccValue(data, `destSlot${dataKey}`));

        // 颜色和描边
        const { colorString, colorStringDarken } = setStyleByMoveKind(getAccValue(data, `moveKind${dataKey}`), undefined);
        containerColorsEl[index].fill(colorString); // 集装箱图背景色
        containerColorsEl[index].stroke(colorStringDarken); // 集装箱图描边
        // 给SVG文字设置上动态颜色 让文字和集装箱两者颜色更有对比度
        for (let j = 0; j < 4; j++) {
          tspans[index][j].fill(colorStringDarken);
        }
      };

      /** 设置 集装箱 显示, 根据数组 [前, 后, 大箱] */
      const setContainerByStatus = (statusArr: Array3<boolean>) => {
        for (let i = 0; i < statusArr.length; i++) {
          const isShow = statusArr[i];
          if (isShow) containers[i].show();
          else containers[i].hide();
        }
      };

      /** 设置 集装箱箱门方向 显示, 根据数组 [前头, 前屁, 后头, 后屁] */
      const setContainerDoorByStatus = (statusArr: Array4<boolean>) => {
        for (let i = 0; i < statusArr.length; i++) {
          const isShow = statusArr[i];
          if (isShow) containerDoors[i].show();
          else containerDoors[i].hide();
        }
      };

      /** 复位 */
      const resetStatus = (id: string) => {
        setContainerByStatus([false, false, false]);
        setContainerDoorByStatus([false, false, false, false]);
        for (let i = 0; i < 3; i++) {
          setContainerDescritionText(i, undefined, undefined);
        }

        socketioHelper.registerListener<{
          cheId: "D002";
          containerId1: "HAMU3553025";
          containerDoorDirection1: null;
          containerSize1: "40";
          containerLengthCm1: 12192;
          containerHeightCm1: 2896;
          containerWeightKg1: 11890;
          containerPosition1: "UNKNOWN";
          containerType1: "GP";
          pointOfWork1: "DC01";
          moveKind1: "LOAD";
          moveStage1: "COMPLETE";
          containerId2: null;
          containerDoorDirection2: null;
          containerSize2: null;
          containerLengthCm2: null;
          containerHeightCm2: null;
          containerWeightKg2: null;
          containerPosition2: null;
          containerType2: null;
          pointOfWork2: null;
          moveKind2: null;
          moveStage2: null;
          originSlot1: "YARD.61B.094.01.02";
          destSlot1: "VESSEL.HMIR0014W.086.13.80";
          originSlot2: null;
          destSlot2: null;
        }>(`DF.AGV.${id}.ContainerInventory`, (itemValue) => {
          // console.log(`DF.AGV.${id}.ContainerInventory`, itemValue);

          const iventory_containerSize1_acc = getAccValue(itemValue, "containerSize1");
          const iventory_containerSize2_acc = getAccValue(itemValue, "containerSize2");

          // 集装箱显示
          const containerStatusArr: Array3<boolean> = [false, false, false];
          if (iventory_containerSize1_acc == 20) {
            containerStatusArr[0] = true;
            setContainerDescritionText(0, itemValue, "1");
          } else if (iventory_containerSize1_acc >= 40) {
            containerStatusArr[2] = true;
            setContainerDescritionText(2, itemValue, "1");
          }
          if (iventory_containerSize2_acc == 20) {
            containerStatusArr[1] = true;
            setContainerDescritionText(1, itemValue, "2");
          }
          setContainerByStatus(containerStatusArr);

          // 集装箱门
          const iventory_containerDoorDirection1_acc = getAccValue(itemValue, "containerDoorDirection1");
          const iventory_containerDoorDirection2_acc = getAccValue(itemValue, "containerDoorDirection2");
          const containerDoorStatusArr: Array4<boolean> = [false, false, false, false];
          if (iventory_containerDoorDirection1_acc === "车头") {
            containerDoorStatusArr[0] = true;
          } else if (iventory_containerDoorDirection1_acc === "车尾") {
            if (iventory_containerSize1_acc <= 20) {
              containerDoorStatusArr[1] = true;
            } else {
              containerDoorStatusArr[3] = true;
            }
          }
          if (iventory_containerDoorDirection2_acc === "车头") containerDoorStatusArr[2] = true;
          else if (iventory_containerDoorDirection2_acc === "车尾") containerDoorStatusArr[3] = true;
          setContainerDoorByStatus(containerDoorStatusArr);
        });
      };

      resolve({
        draw,
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
          // console.log(replacedS, replacedS.x(), replacedS.y());
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
