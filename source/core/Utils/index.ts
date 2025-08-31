import * as THREE from "three";

export const encodeIdToRGBA = (id: number) => {
  // id: 1..2^32-1 (0 is reserved for "no hit")
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  const a = ((id >>> 24) & 0xff) / 255; // keep alpha too (useful if needed)
  return new THREE.Color(r, g, b); // We set a separately in material if needed
};
