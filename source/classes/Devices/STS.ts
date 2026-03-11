import * as THREE from "three";
import Tinycolor from "tinycolor2";
import { WithClassInstanceMap } from "@core/Mixins/ClassInstanceMap";
import { IActor } from "@core/interfaces/IActor";
import { GpuPickFeature } from "@core/interfaces/GpuPickFeature";
import { GpuPickManager } from "@core/GpuPickManager/";
import { Sprite2D } from "@core/index";
import { SDFText2D } from "@core/index";

import { ThreejsGroups } from "@source/inMap/variables";
import { ThreejsRenderOrder } from "@source/inMap/variables";
import { calculateMpp } from "@source/inMap/utils/ratio";
import { orthoCamera } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";
import { MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";

/** Ship-to-Shore Crane 岸边集装箱起重机 */
export class STS extends WithClassInstanceMap(Object) implements GpuPickFeature, IActor {
  static codeSelected = undefined;
  code: string = "";

  isGpuPickFeature: true;
  represents: Record<string, THREE.Object3D> = undefined;
  private meshes: Record<string, THREE.Mesh> = undefined;

  constructor(code: string) {
    super();

    this.code = code;

    // 生成关系对象
    const stsGantryRepresent = new THREE.Object3D();

    const stsMtPviot = new THREE.Object3D();
    const stsMtRepresent = new THREE.Object3D();
    stsMtPviot.position.z = 36.5;

    const stsPTPviot = new THREE.Object3D();
    const stsPtRepresent = new THREE.Object3D();
    stsPTPviot.position.z = 45.0;

    const stsLabelPviot = new THREE.Object3D();
    const stsLabelRepresent = new THREE.Object3D();
    stsLabelPviot.position.z = -12;

    stsGantryRepresent.add(stsMtPviot);
    stsMtPviot.add(stsMtRepresent);
    stsGantryRepresent.add(stsPTPviot);
    stsPTPviot.add(stsPtRepresent);
    stsGantryRepresent.add(stsLabelPviot);
    stsLabelPviot.add(stsLabelRepresent);

    // 生成网格
    const stsColor = getColorRuntime("VARS.DEVICE_STATUS.NORMAL").threejsColor;
    const stsColorDarken = new THREE.Color(Tinycolor(getColorRuntime("VARS.DEVICE_STATUS.NORMAL").tinyColor.getOriginalInput()).darken(10).toHexString());

    const stsGantry = new Sprite2D({
      url: "/resource/sprites/STS_Gantry.png",
      mpp: calculateMpp(35, 610),
      offset: [-21.0, 0.0],
      rotate: -Math.PI / 2,
      multiplyColor: stsColor,
      renderOrder: ThreejsRenderOrder.STS_GANTRY,
    });
    const stsMT = new Sprite2D({
      url: "/resource/sprites/STS_Trolley.png",
      mpp: calculateMpp(18, 522),
      multiplyColor: stsColorDarken,
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
    });
    const stsPT = new Sprite2D({
      url: "/resource/sprites/STS_Trolley.png",
      mpp: calculateMpp(18, 522),
      multiplyColor: stsColorDarken,
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
    });

    const stsLabel = new SDFText2D({
      text: this.code,
      renderOrder: ThreejsRenderOrder.STS_LABEL,
    });

    this.meshes = { stsGantry, stsMT, stsPT, stsLabel };
    this.represents = { stsGantry: stsGantryRepresent, stsMT: stsMtRepresent, stsPT: stsPtRepresent, stsLabel: stsLabelRepresent };
  }

  onInit() {
    // 添加所有 represent 到场景
    ThreejsGroups.Represents.add(this.represents.stsGantry);

    // 添加所有 mesh 到场景
    for (const key of Object.keys(this.meshes)) {
      const mesh = this.meshes[key];

      mesh.matrixAutoUpdate = false; // 关闭矩阵自动同步
      GpuPickManager.register(mesh, this); // 注册拾取

      ThreejsGroups.Meshes.add(mesh);
    }
  }

  onUpdate(deltaTime: number, elapsedTime: number) {
    const scale = MAP_DEFAULT_ZOOM / orthoCamera.zoom;
    const scalar = THREE.MathUtils.clamp(scale, 1.0, 1.5);
    this.represents.stsLabel.scale.setScalar(scalar);

    for (const key of Object.keys(this.meshes)) {
      const mesh = this.meshes[key];
      const represent = this.represents[key];
      if (represent) mesh.matrix.copy(represent.matrixWorld);
    }
  }

  focused = () => {
    this.meshes.stsLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
    this.meshes.stsLabel.renderOrder = ThreejsRenderOrder.ACTIVE_LABEL;
  };

  unfocused = () => {
    this.meshes.stsLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
    this.meshes.stsLabel.renderOrder = ThreejsRenderOrder.STS_LABEL;
  };

  onSelected() {
    STS.codeSelected = this.code;
    this.focused();

    console.warn(`${this.code} onSelected`);
  }

  onCancelSelected() {
    STS.codeSelected = undefined;
    this.unfocused();
  }

  onDoubleClicked() {}

  onMovein() {
    this.focused();
  }

  onMoveout() {
    if (STS.codeSelected !== this.code) {
      this.unfocused();
    }
  }

  onZoomTo() {}

  dispose(): void {
    for (const key of Object.keys(this.meshes)) {
      const mesh = this.meshes[key];
      mesh.removeFromParent();
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) material.dispose();
      } else {
        mesh.material?.dispose();
      }
    }
    this.represents.stsGantry.removeFromParent();
    this.unregisterClassInstanceMap();
  }
}

// 业务逻辑封装

// static configuration = {
//   gantryPosX: 567297.0,
//   gantryPosDirection: -1.0,
//   gantryPosY: -(2397641.79 + 2397676.79) / 2.0 - 21.0,
//   gantryPosUnit: "cm",
// };

// /**
//  * 业务逻辑: 设置大车位置
//  * @param value
//  */
// setGantryPos = (value: number) => {
//   // prettier-ignore
//   this.represents.stsGantry.position.set(
//     STS.configuration.gantryPosX + STS.configuration.gantryPosDirection * value / 100.0,
//     0.0,
//     STS.configuration.gantryPosY
//   );
// };
