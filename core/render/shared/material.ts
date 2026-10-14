import * as THREE from "three";
import type { ColorInput, RenderContext } from "../../contracts";

export const vertexPass = /* glsl */ `
uniform vec2 uCssSize;
uniform vec2 uBufferSize;
uniform vec4 uCrop;
uniform float uScale;
vec4 cropClip(vec4 clip) {
  vec2 pixel = (clip.xy / clip.w * 0.5 + 0.5) * uBufferSize;
  clip.xy = ((pixel - uCrop.xy) / uCrop.zw * 2.0 - 1.0) * clip.w;
  return clip;
}
`;

export const fragmentPass = /* glsl */ `
precision highp float;
uniform bool uPickPass;
uniform vec2 uCssSize;
uniform vec2 uBufferSize;
uniform vec4 uCrop;
uniform vec2 uPickCenter;
uniform vec2 uPickPixel;
flat in vec3 vPickColor;
flat in vec2 vHit;
out vec4 outColor;
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c));
}
void writeColor(vec4 color) {
  if (color.a <= 0.0) discard;
  if (uPickPass) {
    if (color.a < vHit.x) discard;
    vec2 pixel = gl_FragCoord.xy + uCrop.xy;
    vec2 css = vec2(pixel.x / uBufferSize.x * uCssSize.x, (uBufferSize.y - pixel.y) / uBufferSize.y * uCssSize.y);
    bool center = all(lessThan(abs(floor(pixel) - uPickPixel), vec2(0.1)));
    if (!center && distance(css, uPickCenter) > vHit.y) discard;
    outColor = vec4(vPickColor, 1.0);
  } else {
    outColor = vec4(linearToSrgb(color.rgb), color.a);
  }
}
`;

export function createBatchMaterial(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform> = {}): THREE.RawShaderMaterial {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: {
      uCssSize: { value: new THREE.Vector2(1, 1) },
      uBufferSize: { value: new THREE.Vector2(1, 1) },
      uCrop: { value: new THREE.Vector4(0, 0, 1, 1) },
      uScale: { value: 1 },
      uPickPass: { value: false },
      uPickCenter: { value: new THREE.Vector2() },
      uPickPixel: { value: new THREE.Vector2() },
      ...uniforms,
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    dithering: false,
  });
}

export function applyRenderContext(material: THREE.RawShaderMaterial, context: RenderContext): void {
  const [w, h] = context.drawingBufferSize;
  material.uniforms.uCssSize.value.set(...context.cssSize);
  material.uniforms.uBufferSize.value.set(w, h);
  material.uniforms.uScale.value = context.scale;
  material.uniforms.uPickPass.value = context.pass === "pick";
  material.blending = context.pass === "pick" ? THREE.NoBlending : THREE.NormalBlending;
  if (context.pick) {
    const { originPx, sizePx, centerCss } = context.pick;
    material.uniforms.uCrop.value.set(...originPx, ...sizePx);
    material.uniforms.uPickCenter.value.set(...centerCss);
    material.uniforms.uPickPixel.value.set(Math.floor((centerCss[0] * w) / context.cssSize[0]), h - 1 - Math.floor((centerCss[1] * h) / context.cssSize[1]));
  } else material.uniforms.uCrop.value.set(0, 0, w, h);
}

export function colorComponents(input: ColorInput): readonly [number, number, number] {
  const c = new THREE.Color(input);
  return [c.r, c.g, c.b];
}
export function pickComponents(id: number): readonly [number, number, number] {
  return [(id & 255) / 255, ((id >> 8) & 255) / 255, ((id >> 16) & 255) / 255];
}

/** 只上传变更的连续元素范围, 相邻更新由 Three.js r170 在提交时合并. */
export function updateAttribute(attribute: THREE.BufferAttribute | THREE.InstancedBufferAttribute, offset: number, values: ArrayLike<number>): number {
  const array = attribute.array as Float32Array;
  let changed = false;
  for (let i = 0; i < values.length; i++)
    if (array[offset + i] !== Math.fround(values[i])) {
      changed = true;
      break;
    }
  if (!changed) return 0;
  array.set(values, offset);
  attribute.addUpdateRange(offset, values.length);
  attribute.needsUpdate = true;
  return values.length * array.BYTES_PER_ELEMENT;
}
