import * as THREE from "three";
import vertexShader from "./shaders/mesh-line.vs?raw";
import fragmentShader from "./shaders/mesh-line.fs?raw";
import { DebugGui, WithDebugGui } from "@core/DebugGUI";
import { DirtyRenderScheduler } from "@core/RenderScheduler";

// 参考项目: https://github.com/spite/THREE.MeshLine

export interface MeshLineMaterialParameters extends THREE.ShaderMaterialParameters {
  /** 线条颜色 */
  uColor?: THREE.Color;

  /** 线条透明度(默认值1) */
  uOpacity?: number;

  /** 是否启用虚线(默认值0) */
  uUseDash?: 0 | 1;

  /** 虚线的样式(默认值[4.0, 4.0]): 先实部占用4.0个单位, 再是虚部占用4.0个单位 */
  uDashArray?: THREE.Vector2;

  /** 是否启用小方格线(默认值0) */
  uUseBox?: 0 | 1;

  /** 虚线的样式(默认值[1.0, 5.0]): 线条的宽度为1.0, 小方格的大小为5.0, 线条与小方格的比例恒定为4:3 */
  uBoxArray?: THREE.Vector2;

  /** 当前材质绘制时的画布大小 */
  uResolution: THREE.Vector2;

  /** 线宽是否随距离衰减(默认值0): 1 随与相机距离变化(世界空间); 0 不随距离变化(屏幕空间) */
  uSizeAttenuation?: number;

  /** 线宽(默认值1) */
  uLineWidth?: number;

  /** 当前材质绘制时的pixelRatio(默认值1) */
  uPixelRatio?: number;
}

export class MeshLineMaterial extends WithDebugGui(THREE.RawShaderMaterial) {
  constructor(parameters: MeshLineMaterialParameters) {
    super({
      name: "MeshLineMaterial",
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.FrontSide,
      uniforms: {
        uColor: { value: new THREE.Color(0x000000) },
        uOpacity: { value: 1.0 },
        uUseDash: { value: 0 },
        uDashArray: { value: new THREE.Vector2(4.0, 4.0) },
        uUseBox: { value: 0 },
        uBoxArray: { value: new THREE.Vector2(1.0, 5.0) },
        uResolution: { value: new THREE.Vector2(1920.0, 1080.0) },
        uSizeAttenuation: { value: 0 },
        uLineWidth: { value: 1.0 },
        uPixelRatio: { value: 1.0 },
      },
      vertexShader,
      fragmentShader,
    });

    this.setValues(parameters);
  }

  private invalidateRender(property: string) {
    DirtyRenderScheduler.invalidateDefault(`MeshLineMaterial.${property}`);
  }

  @DebugGui.color({ name: "color", folder: "MeshLine" })
  get uColor() {
    return this.uniforms.uColor.value;
  }
  set uColor(v: THREE.Color) {
    this.uniforms.uColor.value.copy(v);
    this.invalidateRender("uColor");
  }

  @DebugGui.number({ name: "opacity", folder: "MeshLine", min: 0, max: 1, step: 0.01 })
  get uOpacity() {
    return this.uniforms.uOpacity.value;
  }
  set uOpacity(v: number) {
    this.uniforms.uOpacity.value = v;
    this.invalidateRender("uOpacity");
  }

  @DebugGui.number({ name: "dash", folder: "MeshLine", min: 0, max: 1, step: 1 })
  get uUseDash() {
    return this.uniforms.uUseDash.value;
  }
  set uUseDash(v: 0 | 1) {
    this.uniforms.uUseDash.value = v;
    this.invalidateRender("uUseDash");
  }

  @DebugGui.vector2({ name: "dash array", folder: "MeshLine", min: 0, max: 128, step: 0.1 })
  get uDashArray() {
    return this.uniforms.uDashArray.value;
  }
  set uDashArray(v: THREE.Vector2) {
    this.uniforms.uDashArray.value.copy(v);
    this.invalidateRender("uDashArray");
  }

  @DebugGui.number({ name: "box", folder: "MeshLine", min: 0, max: 1, step: 1 })
  get uUseBox() {
    return this.uniforms.uUseBox.value;
  }
  set uUseBox(v: 0 | 1) {
    this.uniforms.uUseBox.value = v;
    this.updateBoxState();
    this.invalidateRender("uUseBox");
  }

  @DebugGui.vector2({ name: "box array", folder: "MeshLine", min: 0, max: 128, step: 0.1 })
  get uBoxArray() {
    return this.uniforms.uBoxArray.value;
  }
  set uBoxArray(v: THREE.Vector2) {
    this.uniforms.uBoxArray.value.copy(v);
    this.updateBoxState();
    this.invalidateRender("uBoxArray");
  }
  private updateBoxState() {
    if (this.uniforms.uUseBox.value !== 1) return;
    // 开启绘制小方格功能时, 会强制使用屏幕空间缩放模式
    this.uniforms.uSizeAttenuation.value = 0;
    const uBoxArray = this.uniforms.uBoxArray.value;
    // 在屏幕空间缩放模式下, 保证线宽不能小于1.0
    if (uBoxArray.y < 1.0) uBoxArray.y = 1.0;
    // 绘制小方格时需要保证面片的宽度不能小于小方格
    if (this.uniforms.uLineWidth.value < uBoxArray.y) this.uniforms.uLineWidth.value = uBoxArray.y;
  }

  get uResolution() {
    return this.uniforms.uResolution.value;
  }
  set uResolution(v: THREE.Vector2) {
    this.uniforms.uResolution.value.copy(v);
    this.invalidateRender("uResolution");
  }

  @DebugGui.number({ name: "size attenuation", folder: "MeshLine", min: 0, max: 1, step: 1 })
  get uSizeAttenuation() {
    return this.uniforms.uSizeAttenuation.value;
  }
  set uSizeAttenuation(v: number) {
    this.uniforms.uSizeAttenuation.value = v;
    this.invalidateRender("uSizeAttenuation");
  }

  @DebugGui.number({ name: "line width", folder: "MeshLine", min: 0, max: 64, step: 0.1 })
  get uLineWidth() {
    return this.uniforms.uLineWidth.value;
  }
  set uLineWidth(v: number) {
    this.uniforms.uLineWidth.value = v;
    this.invalidateRender("uLineWidth");
  }

  get uPixelRatio() {
    return this.uniforms.uPixelRatio.value;
  }
  set uPixelRatio(v: number) {
    this.uniforms.uPixelRatio.value = v;
    this.invalidateRender("uPixelRatio");
  }

  override copy(source: MeshLineMaterial): this {
    super.copy(source);

    this.uColor.copy(source.uColor);
    this.uOpacity = source.uOpacity;
    this.uUseDash = source.uUseDash;
    this.uDashArray.copy(source.uDashArray);
    this.uUseBox = source.uUseBox;
    this.uBoxArray.copy(source.uBoxArray);
    this.uResolution.copy(source.uResolution);
    this.uSizeAttenuation = source.uSizeAttenuation;
    this.uLineWidth = source.uLineWidth;
    this.uPixelRatio = source.uPixelRatio;

    return this;
  }
}
