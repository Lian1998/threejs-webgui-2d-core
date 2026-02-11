import * as THREE from "three";
import Tinycolor from "tinycolor2";
import { GpuPickManager } from "@core/GpuPickManager/";
import { GpuPickFeature } from "@core/GpuPickManager/";
import LayerSequence from "@source/classes/LayerSequence";
import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/inMap/utils/ratio";
import { orthoCamera } from "@source/inMap/viewport";
import { defaultZoom } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";

const texture_ascGantry = await new THREE.TextureLoader().loadAsync("/resources/ASC_Gantry.png");
const texture_ascTrolley = await new THREE.TextureLoader().loadAsync("/resources/STS_Trolley.png");

/** Automated Stacking Crane 自动化堆场起重机 */
export class ASC implements GpuPickFeature {
  code: string = "";
  static codeSelected = undefined;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    // 生成图元
    const ascGantry = new Sprite2D({
      texture: texture_ascGantry,
      mpp: calculateMPP(54, 6594),
      renderOrder: LayerSequence.ASC_Gantry,
      color: getColorRuntime("VARS.DEVICE_STATUS.NORMAL").threejsColor,
    });

    const ascMtPviot = new THREE.Object3D();
    ascMtPviot.position.x = -26.0;
    const ascMT = new Sprite2D({
      texture: texture_ascTrolley,
      mpp: calculateMPP(18, 87),
      renderOrder: LayerSequence.ASC_Trolley,
      color: new THREE.Color(Tinycolor(getColorRuntime("VARS.DEVICE_STATUS.NORMAL").tinyColor.getOriginalInput()).darken(10).toHexString()),
    });
    ascMT.rotateY(Math.PI / 2);
    ascMtPviot.add(ascMT);

    const ascLabelPviot = new THREE.Object3D();
    const ascLabel = new SDFText2D({
      text: this.code,
      renderOrder: LayerSequence.ASC_Label,
    });
    ascLabelPviot.add(ascLabel);
    ascLabel.onBeforeRender = () => {
      const scale = defaultZoom / orthoCamera.zoom;
      const scalar = Math.max(Math.min(scale, 1.0), 1.5);
      ascLabel.scale.setScalar(scalar);
    };

    // 绑定关系
    ascGantry.add(ascMtPviot);
    ascGantry.add(ascLabelPviot);
    ascGantry.geometry.computeBoundingBox();
    ascMT.geometry.boundingBox = ascGantry.geometry.boundingBox.clone();
    ascGantry.traverse((object3D) => object3D.layers.set(1));

    // 绑定指针
    this.pool.ascGantry = ascGantry;
    this.pool.ascMT = ascMT;
    this.pool.ascLabel = ascLabel;

    // 注册拾取
    const picker = GpuPickManager.getClassInstance<GpuPickManager>();
    picker.register(ascGantry);
    picker.register(ascMT);
    picker.register(ascLabel);
    for (const key of Object.keys(this.pool)) {
      picker.register(this.pool[key]);
      this.pool[key].userData[GpuPickManager.className].feature = this;
    }
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
    if (ASC.codeSelected !== this.code) {
      this.unfocused();
    }
  }

  onZoomTo() {}

  focused = () => {
    this.pool.ascLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
    this.pool.ascLabel.renderOrder = LayerSequence.ACTIVE_LABEL;
  };

  unfocused = () => {
    this.pool.ascLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
    this.pool.ascLabel.renderOrder = LayerSequence.ASC_Label;
  };
}
