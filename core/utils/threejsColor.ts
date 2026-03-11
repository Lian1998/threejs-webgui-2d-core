import * as THREE from "three";

/**
 * 将传入的颜色含义指针转化为 threejs color 对象
 * @param value 颜色字符串表达式, threejs color 对象 等
 * @returns THREE.Color
 */
export const toThreejsColor = (value: THREE.ColorLike): THREE.Color | undefined => {
  if (value === undefined || value === null) return undefined;
  return value instanceof THREE.Color ? value.clone() : new THREE.Color(value);
};

/**
 * 在threejs环境下比较两个颜色
 * @param {THREE.ColorLike} a
 * @param {THREE.ColorLike} b
 * @returns boolean
 */
export const isSameColor = (a?: THREE.ColorLike, b?: THREE.ColorLike): boolean => {
  const ca = toThreejsColor(a);
  const cb = toThreejsColor(b);

  if (!ca && !cb) return true; // 都是 null/undefined
  if (!ca || !cb) return false; // 只有一个是 null/undefined

  return ca.equals(cb);
};
