import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager/";
import { GpuPickFeature } from "@core/GpuPickManager/";

import ColorDefine from "@source/ColorDefine";
import LayerSequence from "@source/LayerSequence";

import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/utils/ratio";
import { darkenHex } from "@source/utils/color";

import { orthoCamera } from "@source/viewport";
import { defaultZoom } from "@source/viewport";

const textrues = {
  ASC_Gantry: await new THREE.TextureLoader().loadAsync("/resources/ASC_Gantry.png"),
  ASC_Trolley: await new THREE.TextureLoader().loadAsync("/resources/STS_Trolley.png"),
};

export class ASC implements GpuPickFeature {
  code: string = "";
  static codeSelected = undefined;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    // 生成图元
    const ascGantry = new Sprite2D({
      texture: textrues.ASC_Gantry,
      mpp: calculateMPP(54, 6594),
      depth: LayerSequence.ASC_Gantry,
      color: new THREE.Color(ColorDefine.DEVICE.DEFAULT),
    });

    const ascMtPviot = new THREE.Object3D();
    ascMtPviot.position.z = 60;
    const ascMT = new Sprite2D({
      texture: textrues.ASC_Trolley,
      mpp: calculateMPP(18, 87),
      depth: LayerSequence.ASC_Trolley,
      color: new THREE.Color(darkenHex(ColorDefine.DEVICE.DEFAULT, 15)),
    });
    ascMT.rotateY(Math.PI);
    ascMtPviot.add(ascMT);

    const ascLabelPviot = new THREE.Object3D();
    const ascLabel = new SDFText2D({
      text: this.code,
      depth: LayerSequence.ASC_Label,
    });
    ascLabelPviot.add(ascLabel);
    ascLabel.onBeforeRender = () => {
      const scale = defaultZoom / orthoCamera.zoom;
      const scalar = Math.max(Math.min(scale, 1.0), 1.5);
      ascLabel.scale.setScalar(scalar);
    };

    // 绑定关系
    ascGantry.add(ascMtPviot);
    ascGantry.geometry.computeBoundingBox();
    ascMT.geometry.boundingBox = ascMT.geometry.boundingBox.clone();
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
      this.pool[key].userData.gpuPickManager.feature = this;
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
  };

  unfocused = () => {
    this.pool.ascLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
  };
}
