import * as THREE from "three";
import Tinycolor from "tinycolor2";
import { GpuPickFeature } from "@core/interfaces/GpuPickFeature";
import { GpuPickManager } from "@core/GpuPickManager/";
import { SDFText2D, Sprite2D } from "@core/index";
import { ThreejsRenderOrder } from "@source/inMap/variables";
import { calculateMpp } from "@source/inMap/utils/ratio";
import { orthoCamera, MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";

const spriteUrls = {
  ASC_Gantry: "/resource/sprites/ASC_Gantry.png",
  ASC_Trolley: "/resource/sprites/STS_Trolley.png",
};

/** Automated Stacking Crane. */
export class ASC implements GpuPickFeature {
  static codeSelected = undefined;
  code = "";

  isGpuPickFeature: true = true;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    const normalColor = getColorRuntime("VARS.DEVICE_STATUS.NORMAL");
    const ascGantry = new Sprite2D({
      url: spriteUrls.ASC_Gantry,
      mpp: calculateMpp(54, 6594),
      renderOrder: ThreejsRenderOrder.ASC_GANTRY,
      multiplyColor: normalColor.threejsColor,
    });

    const ascMtPviot = new THREE.Object3D();
    ascMtPviot.position.x = -26.0;

    const ascMT = new Sprite2D({
      url: spriteUrls.ASC_Trolley,
      mpp: calculateMpp(18, 87),
      renderOrder: ThreejsRenderOrder.ASC_TROLLEY,
      multiplyColor: new THREE.Color(Tinycolor(normalColor.tinyColor.getOriginalInput()).darken(10).toHexString()),
    });
    ascMT.rotateY(Math.PI / 2);
    ascMtPviot.add(ascMT);

    const ascLabelPviot = new THREE.Object3D();
    const ascLabel = new SDFText2D({
      text: this.code,
      renderOrder: ThreejsRenderOrder.ASC_LABEL,
    });
    ascLabelPviot.add(ascLabel);
    ascLabel.onBeforeRender = () => {
      const scale = MAP_DEFAULT_ZOOM / orthoCamera.zoom;
      const scalar = THREE.MathUtils.clamp(scale, 1.0, 1.5);
      ascLabel.scale.setScalar(scalar);
    };

    ascGantry.add(ascMtPviot);
    ascGantry.add(ascLabelPviot);
    ascGantry.geometry.computeBoundingBox();
    ascMT.geometry.boundingBox = ascGantry.geometry.boundingBox.clone();

    this.pool.ascGantry = ascGantry;
    this.pool.ascMT = ascMT;
    this.pool.ascLabel = ascLabel;

    for (const key of Object.keys(this.pool)) GpuPickManager.register(this.pool[key], this);
  }

  onSelected() {
    ASC.codeSelected = this.code;
    this.focused();
  }

  onCancelSelected() {
    ASC.codeSelected = undefined;
    this.unfocused();
  }

  onDoubleClicked() {}

  onMovein() {
    this.focused();
  }

  onMoveout() {
    if (ASC.codeSelected !== this.code) this.unfocused();
  }

  onZoomTo() {}

  focused = () => {
    this.pool.ascLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
    this.pool.ascLabel.renderOrder = ThreejsRenderOrder.ACTIVE_LABEL;
  };

  unfocused = () => {
    this.pool.ascLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
    this.pool.ascLabel.renderOrder = ThreejsRenderOrder.ASC_LABEL;
  };
}
