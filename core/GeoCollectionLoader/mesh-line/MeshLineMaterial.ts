import * as THREE from "three";
import vertexShader from "./shaders/mesh-line.vs?raw";
import fragmentShader from "./shaders/mesh-line.fs?raw";

/**
 * https://github.com/spite/THREE.MeshLine
 */
export interface MeshLineMaterialParameters {
  /** a THREE.Texture to paint along the line (requires useMap set to true) */
  map?: THREE.Texture;

  /** tells the material to use map (0 - solid color, 1 use texture) */
  useMap?: number;

  /**  a THREE.Texture to use as alpha along the line (requires useAlphaMap set to true) */
  alphaMap?: THREE.Texture;

  /** tells the material to use alphaMap (0 - no alpha, 1 modulate alpha) */
  useAlphaMap?: number;

  /**  THREE.Vector2 to define the texture tiling (applies to map and alphaMap - MIGHT CHANGE IN THE FUTURE) */
  repeat?: THREE.Vector2;

  /** THREE.Color to paint the line width, or tint the texture with */
  color?: string | THREE.Color | number;

  /**  alpha value from 0 to 1 (requires transparent set to true) */
  opacity?: number;

  /** cutoff value from 0 to 1 */
  alphaTest?: number;

  /** the length and space between dashes. (0 - no dash) */
  dashArray?: number;

  /** defines the location where the dash will begin. Ideal to animate the line. */
  dashOffset?: number;

  /** defines the ratio between that is visible or not (0 - more visible, 1 - more invisible). */
  dashRatio?: number;

  useDash?: number;

  /** THREE.Vector2 specifying the canvas size (REQUIRED) */
  resolution: THREE.Vector2; // required

  /** makes the line width constant regardless distance (1 unit is 1px on screen) (0 - attenuate, 1 - don't attenuate) */
  sizeAttenuation?: number;

  /** float defining width (if sizeAttenuation is true, it's world units; else is screen pixels) */
  lineWidth?: number;

  gradient?: string[] | THREE.Color[] | number[];

  useGradient?: number;

  visibility?: number;
}

export class MeshLineMaterial extends THREE.ShaderMaterial implements MeshLineMaterialParameters {
  // override type = "MeshLineMaterial";

  lineWidth!: number;
  map!: THREE.Texture;
  useMap!: number;
  alphaMap!: THREE.Texture;
  useAlphaMap!: number;
  color!: THREE.Color;
  gradient!: THREE.Color[];
  resolution!: THREE.Vector2;
  sizeAttenuation!: number;
  dashArray!: number;
  dashOffset!: number;
  dashRatio!: number;
  useDash!: number;
  useGradient!: number;
  visibility!: number;
  repeat!: THREE.Vector2;

  constructor(parameters: MeshLineMaterialParameters) {
    super({
      uniforms: {
        ...THREE.UniformsLib.fog,
        lineWidth: { value: 1 },
        map: { value: null },
        useMap: { value: 0 },
        alphaMap: { value: null },
        useAlphaMap: { value: 0 },
        color: { value: new THREE.Color(0x000000) },
        gradient: { value: [new THREE.Color(0xff0000), new THREE.Color(0x00ff00)] },
        opacity: { value: 1 },
        resolution: { value: new THREE.Vector2(1, 1) },
        sizeAttenuation: { value: 1 },
        dashArray: { value: 0 },
        dashOffset: { value: 0 },
        dashRatio: { value: 0.5 },
        useDash: { value: 0 },
        useGradient: { value: 0 },
        visibility: { value: 1 },
        alphaTest: { value: 0 },
        repeat: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader,
      fragmentShader,
    });

    Object.defineProperties(this, {
      lineWidth: {
        enumerable: true,
        get() {
          return this.uniforms.lineWidth.value;
        },
        set(value) {
          this.uniforms.lineWidth.value = value;
        },
      },
      map: {
        enumerable: true,
        get() {
          return this.uniforms.map.value;
        },
        set(value) {
          this.uniforms.map.value = value;
        },
      },
      useMap: {
        enumerable: true,
        get() {
          return this.uniforms.useMap.value;
        },
        set(value) {
          this.uniforms.useMap.value = value;
        },
      },
      alphaMap: {
        enumerable: true,
        get() {
          return this.uniforms.alphaMap.value;
        },
        set(value) {
          this.uniforms.alphaMap.value = value;
        },
      },
      useAlphaMap: {
        enumerable: true,
        get() {
          return this.uniforms.useAlphaMap.value;
        },
        set(value) {
          this.uniforms.useAlphaMap.value = value;
        },
      },
      color: {
        enumerable: true,
        get() {
          return this.uniforms.color.value;
        },
        set(value) {
          this.uniforms.color.value = value;
        },
      },
      gradient: {
        enumerable: true,
        get() {
          return this.uniforms.gradient.value;
        },
        set(value) {
          this.uniforms.gradient.value = value;
        },
      },
      opacity: {
        enumerable: true,
        get() {
          return this.uniforms.opacity.value;
        },
        set(value) {
          this.uniforms.opacity.value = value;
        },
      },
      resolution: {
        enumerable: true,
        get() {
          return this.uniforms.resolution.value;
        },
        set(value) {
          this.uniforms.resolution.value.copy(value);
        },
      },
      sizeAttenuation: {
        enumerable: true,
        get() {
          return this.uniforms.sizeAttenuation.value;
        },
        set(value) {
          this.uniforms.sizeAttenuation.value = value;
        },
      },
      dashArray: {
        enumerable: true,
        get() {
          return this.uniforms.dashArray.value;
        },
        set(value) {
          this.uniforms.dashArray.value = value;
          this.useDash = value !== 0 ? 1 : 0;
        },
      },
      dashOffset: {
        enumerable: true,
        get() {
          return this.uniforms.dashOffset.value;
        },
        set(value) {
          this.uniforms.dashOffset.value = value;
        },
      },
      dashRatio: {
        enumerable: true,
        get() {
          return this.uniforms.dashRatio.value;
        },
        set(value) {
          this.uniforms.dashRatio.value = value;
        },
      },
      useDash: {
        enumerable: true,
        get() {
          return this.uniforms.useDash.value;
        },
        set(value) {
          this.uniforms.useDash.value = value;
        },
      },
      useGradient: {
        enumerable: true,
        get() {
          return this.uniforms.useGradient.value;
        },
        set(value) {
          this.uniforms.useGradient.value = value;
        },
      },
      visibility: {
        enumerable: true,
        get() {
          return this.uniforms.visibility.value;
        },
        set(value) {
          this.uniforms.visibility.value = value;
        },
      },
      alphaTest: {
        enumerable: true,
        get() {
          return this.uniforms.alphaTest.value;
        },
        set(value) {
          this.uniforms.alphaTest.value = value;
        },
      },
      repeat: {
        enumerable: true,
        get() {
          return this.uniforms.repeat.value;
        },
        set(value) {
          this.uniforms.repeat.value.copy(value);
        },
      },
    });
    this.setValues(parameters);
  }

  override copy(source: MeshLineMaterial): this {
    super.copy(source);
    this.lineWidth = source.lineWidth;
    this.map = source.map;
    this.useMap = source.useMap;
    this.alphaMap = source.alphaMap;
    this.useAlphaMap = source.useAlphaMap;
    this.color.copy(source.color);
    this.gradient = source.gradient;
    this.opacity = source.opacity;
    this.resolution.copy(source.resolution);
    this.sizeAttenuation = source.sizeAttenuation;
    this.dashArray = source.dashArray;
    this.dashOffset = source.dashOffset;
    this.dashRatio = source.dashRatio;
    this.useDash = source.useDash;
    this.useGradient = source.useGradient;
    this.visibility = source.visibility;
    this.alphaTest = source.alphaTest;
    this.repeat.copy(source.repeat);
    return this;
  }
}
