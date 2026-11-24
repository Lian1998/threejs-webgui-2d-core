import * as THREE from "three";
import Tinycolor from "tinycolor2";
import { GpuPickFeature } from "@core/legacy/interfaces/GpuPickFeature";
import { GpuPickManager } from "@core/legacy/GpuPickManager/";
import { Sprite2D } from "@core/legacy/index";
import { SDFText2D } from "@core/legacy/index";

import { ThreejsRenderOrder } from "@/inMap/variables";
import { calculateMpp } from "@/inMap/utils/ratio";
import { getColorRuntime } from "@/themes/ColorPaletteManager/index";

/** Ship-to-Shore Crane 岸边集装箱起重机 */
export class STS implements GpuPickFeature {
  static codeSelected = undefined; // 当前选择的code
  code: string = ""; // 实例的code

  isGpuPickFeature: true = true;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    // 生成关系
    const normalColor = getColorRuntime("VARS.DEVICE_STATUS.NORMAL");
    const labelColor = getColorRuntime("LABEL.QC.DEFAULT.TEXT");
    const labelBackground = getColorRuntime("LABEL.QC.DEFAULT.TEXT_BACKGROUND");
    const stsMtPviot = new THREE.Object3D();
    stsMtPviot.position.z = 36.5; // 主小车相对于大车中心点的偏移量
    const stsPTPviot = new THREE.Object3D();
    stsPTPviot.position.z = 45.0; // 门架小车相对于大车中心点的偏移量
    const stsLabelPviot = new THREE.Object3D();
    stsLabelPviot.position.z = -12; // 标签相对于大车中心点的偏移量

    // 生成网格
    const stsGantry = new Sprite2D({
      url: "/resource/sprites/STS_Gantry.png",
      mpp: calculateMpp(35, 610),
      offset: [-21.0, 0.0],
      rotate: -Math.PI / 2,
      multiplyColor: normalColor.threejsColor,
      renderOrder: ThreejsRenderOrder.STS_GANTRY,
    });
    const stsMT = new Sprite2D({
      url: "/resource/sprites/STS_Trolley.png",
      mpp: calculateMpp(18, 522),
      multiplyColor: new THREE.Color(Tinycolor(normalColor.tinyColor.getOriginalInput()).darken(10).toHexString()),
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
    });
    const stsPT = new Sprite2D({
      url: "/resource/sprites/STS_Trolley.png",
      mpp: calculateMpp(18, 522),
      multiplyColor: new THREE.Color(Tinycolor(normalColor.tinyColor.getOriginalInput()).darken(10).toHexString()),
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
    });
    const stsLabel = new SDFText2D({
      text: this.code,
      renderOrder: ThreejsRenderOrder.STS_LABEL,
      uTextColor: labelColor.threejsColor,
      uBackgroundColor: labelBackground.threejsColor,
      uBackgroundAlpha: labelBackground.alpha.value,
    });
    stsGantry.add(stsMtPviot);
    stsMtPviot.add(stsMT);
    stsGantry.add(stsPTPviot);
    stsPTPviot.add(stsPT);
    stsGantry.add(stsLabelPviot);
    stsLabelPviot.add(stsLabel);

    this.pool.stsGantry = stsGantry;
    this.pool.stsMT = stsMT;
    this.pool.stsPT = stsPT;
    this.pool.stsLabel = stsLabel;

    // 注册拾取
    for (const key of Object.keys(this.pool)) GpuPickManager.register(this.pool[key], this);
  }

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

  focused = () => {
    const stsLabel = this.pool.stsLabel as SDFText2D;
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
    const stsLabel = this.pool.stsLabel as SDFText2D;
    const labelColor = getColorRuntime("LABEL.QC.DEFAULT.TEXT");
    const labelBackground = getColorRuntime("LABEL.QC.DEFAULT.TEXT_BACKGROUND");
    stsLabel.setStyle({
      uTextColor: labelColor.threejsColor,
      uBackgroundColor: labelBackground.threejsColor,
      uBackgroundAlpha: labelBackground.alpha.value,
    });
    stsLabel.renderOrder = ThreejsRenderOrder.STS_LABEL;
  };
}
