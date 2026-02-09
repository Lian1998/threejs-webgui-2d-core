import tinycolor from "tinycolor2";

export const darkenHex = (hexInt: number, percent: number) => {
  return parseInt(
    tinycolor(`#${hexInt.toString(16).padStart(6, "0")}`)
      .darken(percent)
      .toHex(),
    16,
  );
};
