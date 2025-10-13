/**
 * 将仅包含 alpha 通道的 Uint8ClampedArray 转为 RGBA 四通道
 * @param {Uint8ClampedArray} alphaChannel - 仅包含 alpha 通道的像素数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {Array|Uint8ClampedArray} [rgb=[0,0,0]] - 可选的底色 (RGB)
 * @returns {Uint8ClampedArray} imageData 图片像素数据
 */
export const makeRGBAImageData = (alphaChannel: Uint8ClampedArray, width: number, height: number, rgb: number[] = [0, 0, 0]): ImageDataArray => {
  if (alphaChannel.length !== width * height) {
    throw new Error("alphaBuffer length does not match width * height");
  }

  const imageData = new Uint8ClampedArray(width * height * 4);

  for (let i = 0, j = 0; i < alphaChannel.length; i++, j += 4) {
    imageData[j + 0] = alphaChannel[i]; // R
    imageData[j + 1] = alphaChannel[i]; // G
    imageData[j + 2] = alphaChannel[i]; // B
    imageData[j + 3] = 255; // A
  }

  return imageData;
};
