export const encodeIdToRGBA = (id: number) => {
  // id: 1..2^24-1 (0 is reserved for "no hit")
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  const a = ((id >>> 24) & 0xff) / 255;
  return [r, g, b, a];
};

export const decodeRGBAToId = ([r, g, b, a]: number[]) => {
  return r | (g << 8) | (b << 16) | (a << 24); // 1..2^24-1
};

export const encodeIdToRGB = (id: number) => {
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  return [r, g, b];
};

export const decodeRGBToId = ([r, g, b, a]: number[]) => {
  return r | (g << 8) | (b << 16);
};
