import { SVG } from "@svgdotjs/svg.js";
import type { Text } from "@svgdotjs/svg.js";

import { getColorString } from "@2dmapv2/classes/colorConfig";
import { containerInfoCardHoverRef } from "@2dmapv2/onMap/index";

import { socketioSubModule_infocard_yc as socketioHelper } from "@2dmapv2/data/initWebSocketData";
import tinycolor from "tinycolor2";

let colorStringDarkenCache = {};

/**
 *
 * @param domElement
 * @param blockBayInfoConfiguration
 * @returns
 */
export const initializeSvgPack = (domElement: HTMLElement, blockBayInfoConfiguration: { columnNum?: number; tierNum?: number; key: string }) => {
  const columnNum = blockBayInfoConfiguration?.columnNum ?? 14; // 此项目最多14列
  const tierNum = blockBayInfoConfiguration?.tierNum ?? 6; // 此项目最多6层集装箱

  const titleHeight = 60;
  const containerWidthInSvg = 47.3; // svg中集装箱的宽度
  const containerHeightInSvg = 53.6; // svg中集装箱的高度
  const containerWidthGapInSVG = 6; // 集装箱列的gap像素
  const fontSize = 24; // 文字大小
  const _fontSize = fontSize + 4;

  const canvasSize = {
    width: _fontSize + columnNum * containerWidthInSvg + (columnNum - 1) * containerWidthGapInSVG + 4,
    height: titleHeight + _fontSize + tierNum * containerHeightInSvg + 4,
  };

  const containerIds = [];
  const containerMap = new Map();
  const containerInfomationMap = new Map();

  // 主要难点: canvasY轴向下, rect的xy为左上角

  const draw = SVG().addTo(domElement).size(canvasSize.width, canvasSize.height);
  const origin = [0.0, titleHeight + _fontSize + tierNum * containerHeightInSvg];

  /** 集装箱绘制 */
  const createContainerString = (columnNo: number, tierNo: number) => {
    const centerX = origin[0] + _fontSize + (columnNo - 0.5) * containerWidthInSvg + (columnNo - 1) * containerWidthGapInSVG;
    const centerY = origin[1] - _fontSize - (tierNo - 0.5) * containerHeightInSvg;

    const x = centerX - 0.5 * containerWidthInSvg;
    const y = centerY - 0.5 * containerHeightInSvg;

    const containerId = `c-${columnNo}-${tierNo}`;
    containerIds.push(containerId);
    return `<rect id="${containerId}" x="${x}" y="${y}" fill="#f8e9d6" stroke="#d0dce0" stroke-width="1" height="${containerHeightInSvg}" width="${containerWidthInSvg}"/>`;
  };

  /** 编号绘制 */
  const createTextString = (isColumn: boolean, value: number) => {
    let x = origin[0];
    let y = origin[1];
    if (isColumn) {
      let columnNo = value;
      x = origin[0] + _fontSize + (columnNo - 0.5) * containerWidthInSvg + (columnNo - 1) * containerWidthGapInSVG;
      y = origin[1] - _fontSize / 4;
      x -= _fontSize / 2;
    } else {
      let tierNo = value;
      x = origin[0] + _fontSize / 4;
      y = origin[1] - _fontSize - (tierNo - 0.5) * containerHeightInSvg;
      y += _fontSize / 2;
    }

    let text = value.toString();
    if (isColumn) text = value.toString().padStart(2, "0");

    return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}px">${text}</text>`;
  };

  // 绘制集装箱/文字
  for (let i = 1; i <= columnNum; i++) {
    draw.svg(createTextString(true, i));
    for (let j = 1; j <= tierNum; j++) {
      draw.svg(createContainerString(i, j));
    }
  }
  for (let j = 1; j <= tierNum; j++) {
    draw.svg(createTextString(false, j));
  }

  // 插入Title
  draw.svg(`<text id="title" x="10" y="38" font-family="sans-serif" font-size="24px"></text>`);
  const title = draw.findOne("#title") as Text;
  const setTitle = (value: string) => (title.node.textContent = value);

  // 找到dom
  containerIds.forEach((key) => {
    const containerEl = draw.findOne(`#${key}`);
    containerMap.set(key, containerEl);

    containerEl.on("mouseenter", () => {
      containerEl.attr("stroke", "#FF0000FF");
      if (containerInfoCardHoverRef.value) containerInfoCardHoverRef.value.openInfoCard(containerInfomationMap.get(key));
    });
    containerEl.on("mouseleave", () => {
      containerEl.attr("stroke", containerEl.attr("stroke-tier"));
      if (containerInfoCardHoverRef.value) containerInfoCardHoverRef.value.closeInfoCard();
    });
  });
  containerMap.forEach((containerEl, key) => containerEl.attr("display", "none")); // 默认全部不显示

  const key = blockBayInfoConfiguration?.key;
  setTitle(key);

  if (key) {
    socketioHelper.registerListener<{
      bayNo: string; // "070";
      blockNo: string; // "YARD-62B";
      empty: boolean; // false;
      totalRowCount: number; // 12;
      unitList: Record<
        string, // 01
        {
          ctnSize: string; // "40";
          tierNo: string; // "04";
          ctnId: string; // "EGHU9190901";
          ctnIso: string; // "45G1";
          bayNo: string; // "070";
        }[]
      >;
    }>(`CD.BLOCK.${key}.BayYardUnit`, (itemValue) => {
      // console.log(`CD.BLOCK.${key}.BayYardUnit`, itemValue);
      containerMap.forEach((containerEl, key) => containerEl.attr("display", "none"));
      containerInfomationMap.clear();

      const lane_deviceAlias = Object.keys(itemValue.unitList);
      for (let i = 0; i < lane_deviceAlias.length; i++) {
        const laneNo = lane_deviceAlias[i];
        try {
          const columnNo = Number.parseInt(laneNo);
          const containersInfo = itemValue.unitList[laneNo];
          for (let j = 0; j < containersInfo.length; j++) {
            const containerInfo = containersInfo[j];
            const tierNo = Number.parseInt(containerInfo.tierNo);
            const key = `c-${columnNo}-${tierNo}`;
            const containerEl = containerMap.get(key);
            containerInfomationMap.set(key, containerInfo);

            const colorString = getColorString(`VARS.YARD_TIER.TIER${tierNo}`);
            containerEl.attr("fill", colorString);

            if (!colorStringDarkenCache[colorString]) {
              const colorObject = tinycolor(colorString);
              const colorStringDarken = colorObject.darken(30).toString();
              colorStringDarkenCache[colorString] = colorStringDarken;
            }

            const colorStringDarken = colorStringDarkenCache[colorString];
            containerEl.attr("stroke-tier", colorStringDarken);
            containerEl.attr("stroke", colorStringDarken);
            containerEl.attr("display", "block");
          }
        } catch (err) {}
      }
    });

    socketioHelper.subReal(undefined, `CD.BLOCK.${key}.BayYardUnit`);
  }

  return { draw, canvasSize, setTitle };
};
