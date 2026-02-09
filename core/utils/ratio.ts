/**
 * 计算 米/像素
 * @param targetRealLength 这个物件的这个特征实际的长度占据多少m
 * @param targetImgPixelLength 这个物件的图片特征(* 长度/宽度或其他?)占据图片多少个像素
 * @returns {number} 米/像素
 */
export const calculateMPP = (targetRealLength: number, targetImgPixelLength: number): number => {
  return targetRealLength / targetImgPixelLength;
};
