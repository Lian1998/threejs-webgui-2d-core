import * as THREE from "three";
import Tinycolor from "tinycolor2";
import { WithClassInstanceMap } from "@core/Mixins/";
import { IActor } from "@core/interfaces/IActor";
import { GpuPickFeature } from "@core/interfaces/GpuPickFeature";
import { GpuBatchFeature } from "@core/interfaces/GpuBatchFeature";
import { Sprite2D } from "@core/index";
import { SDFText2D } from "@core/index";

import { ThreejsGroups } from "@source/inMap/variables";
import { ThreejsRenderOrder } from "@source/inMap/variables";
import { calculateMpp } from "@source/inMap/utils/ratio";
import { orthoCamera } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";
import { MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";

/** Ship-to-Shore Crane 岸边集装箱起重机 */
export class STS extends WithClassInstanceMap(Object) implements GpuPickFeature, GpuBatchFeature, IActor {
  isGpuPickFeature: true = true;
  isGpuBatchFeature: true = true;
  primitives: Record<string, { ava: THREE.Object3D; mesh: THREE.Object3D }> = undefined;
  primitiveKeys: string[];

  code: string = ""; // 实例的code
  static codeSelected = undefined; // 当前选择的code

  constructor(code: string) {
    super();

    this.code = code;

    // 生成关系

    const stsGantryAva = new THREE.Object3D();

    const stsMtPviot = new THREE.Object3D();
    const stsMtAva = new THREE.Object3D();
    stsMtPviot.position.z = 36.5; // 主小车相对于大车中心点的偏移量

    const stsPTPviot = new THREE.Object3D();
    const stsPtAva = new THREE.Object3D();
    stsPTPviot.position.z = 45.0; // 门架小车相对于大车中心点的偏移量

    const stsLabelPviot = new THREE.Object3D();
    const stsLabelAva = new THREE.Object3D();
    stsLabelPviot.position.z = -12; // 标签相对于大车中心点的偏移量

    stsGantryAva.add(stsMtPviot);
    stsMtPviot.add(stsMtAva);
    stsGantryAva.add(stsPTPviot);
    stsPTPviot.add(stsPtAva);
    stsGantryAva.add(stsLabelPviot);
    stsLabelPviot.add(stsLabelAva);

    // 生成网格

    const deviceColor = getColorRuntime("VARS.DEVICE_STATUS.NORMAL");
    const stsGantry = new Sprite2D({
      url: "/resource/sprites/STS_Gantry.png",
      mpp: calculateMpp(35, 610),
      offset: [-21.0, 0.0],
      rotate: -Math.PI / 2,
      multiplyColor: deviceColor.threejsColor,
      renderOrder: ThreejsRenderOrder.STS_GANTRY,
    });
    const stsMT = new Sprite2D({
      url: "/resource/sprites/STS_Trolley.png",
      mpp: calculateMpp(18, 522),
      multiplyColor: new THREE.Color(Tinycolor(deviceColor.tinyColor.getOriginalInput()).darken(10).toHexString()),
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
    });
    const stsPT = new Sprite2D({
      url: "/resource/sprites/STS_Trolley.png",
      mpp: calculateMpp(18, 522),
      multiplyColor: new THREE.Color(Tinycolor(deviceColor.tinyColor.getOriginalInput()).darken(10).toHexString()),
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
    });
    const labelColor = getColorRuntime("LABEL.QC.DEFAULT.TEXT");
    const labelBackground = getColorRuntime("LABEL.QC.DEFAULT.TEXT_BACKGROUND");
    const stsLabel = new SDFText2D({
      text: this.code,
      renderOrder: ThreejsRenderOrder.STS_LABEL,
      uTextColor: labelColor.threejsColor,
      uBackgroundColor: labelBackground.threejsColor,
      uBackgroundAlpha: labelBackground.alpha.value,
    });

    this.primitives = {
      stsGantry: { ava: stsGantryAva, mesh: stsGantry },
      stsMT: { ava: stsMtAva, mesh: stsMT },
      stsPT: { ava: stsPtAva, mesh: stsPT },
      stsLabel: { ava: stsLabelAva, mesh: stsLabel },
    };

    this.primitiveKeys = Object.keys(this.primitives);
  }

  onInit() {
    // 挂载根代表
    ThreejsGroups.Void.add(this.primitives.stsGantry.ava);

    // 添加所有 mesh 到场景
    for (const key of this.primitiveKeys) {
      const mesh = this.primitives[key].mesh;
      mesh.matrixAutoUpdate = false; // 关闭矩阵自动同步
      ThreejsGroups.Meshes.add(mesh);
    }
  }

  onUpdate(deltaTime: number, elapsedTime: number) {
    const scale = MAP_DEFAULT_ZOOM / orthoCamera.zoom;
    const scalar = THREE.MathUtils.clamp(scale, 1.0, 1.5);

    const stsLabel = this.primitives.stsLabel.mesh as SDFText2D;
    stsLabel.scale.setScalar(scalar);

    for (const key of this.primitiveKeys) {
      const mesh = this.primitives[key].mesh;
      const ava = this.primitives[key].ava;
      mesh.matrix.copy(ava.matrixWorld);
    }
  }

  focused = () => {
    const stsLabel = this.primitives.stsLabel.mesh as SDFText2D;
    const labelColor_selected = getColorRuntime("LABEL.QC.SELECTED.TEXT");
    const labelBackground_selected = getColorRuntime("LABEL.QC.SELECTED.TEXT_BACKGROUND");
    stsLabel.setStyle({
      uTextColor: labelColor_selected.threejsColor,
      uBackgroundColor: labelBackground_selected.threejsColor,
      uBackgroundAlpha: labelBackground_selected.alpha.value,
    });
    stsLabel.renderOrder = ThreejsRenderOrder.ACTIVE_LABEL;
  };

  unfocused = () => {
    const stsLabel = this.primitives.stsLabel.mesh as SDFText2D;
    const labelColor = getColorRuntime("LABEL.QC.DEFAULT.TEXT");
    const labelBackground = getColorRuntime("LABEL.QC.DEFAULT.TEXT_BACKGROUND");
    stsLabel.setStyle({
      uTextColor: labelColor.threejsColor,
      uBackgroundColor: labelBackground.threejsColor,
      uBackgroundAlpha: labelBackground.alpha.value,
    });
    stsLabel.renderOrder = ThreejsRenderOrder.STS_LABEL;
  };

  onSelected() {
    STS.codeSelected = this.code;
    this.focused();
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

  static batchInit() {
    // 1. 取classInstanceMap中第一个实例的所有primitives
    // 2. 每个primitives生成一个InstancedMesh, 几何就用第一个实例对应的
    // 3. Sprite2D的属性全都在buffer中
    // 4. SDFText2D取第一个实例对应的uniform, 再生成一个浮动的去盖
    // 4.1 SDFText2D的属性也全部都写到buffer中
  }
}
