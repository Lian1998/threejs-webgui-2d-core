import * as THREE from "three";
import Tinycolor from "tinycolor2";

import { DEFAULT_COLOR } from "./ColorItems";
import { ITEMS_DEV_KEY } from "./ColorItems";
import { ColorPaletteManager } from "./ColorPaletteManager";

type ColorRuntime = {
  tinyColor: Tinycolor.Instance;
  threejsColor: THREE.Color;
  alpha: { value: number };
  alphaPercentage: { value: number };
};

const ColorItemsRuntime = new Map<ITEMS_DEV_KEY, ColorRuntime>();

export const getColorRuntime = (key: ITEMS_DEV_KEY) => {
  if (!ColorItemsRuntime.get(key)) {
    const value = ColorPaletteManager.itemsMap.get(key) ?? DEFAULT_COLOR;
    const tinyColor = Tinycolor(value);
    const { r, g, b, a } = tinyColor.toRgb();
    const colorItems = {
      tinyColor: tinyColor,
      threejsColor: new THREE.Color().setRGB(r / 255.0, g / 255.0, b / 255.0, THREE.SRGBColorSpace),
      alpha: { value: a },
      alphaPercentage: { value: a / 255.0 },
    };
    ColorItemsRuntime.set(key, colorItems);
  }
  return ColorItemsRuntime.get(key);
};
