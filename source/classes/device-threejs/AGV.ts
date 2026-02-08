import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager/";
import { GpuPickFeature } from "@core/GpuPickManager/";

import ColorDefine from "@source/ColorDefine";
import LayerSequence from "@source/classes/LayerSequence";

import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/utils/ratio";
import { darkenHex } from "@source/utils/color";

import { orthoCamera } from "@source/viewport";
import { defaultZoom } from "@source/viewport";

const textrues = {
  AGV_Base: await new THREE.TextureLoader().loadAsync("/resources/AGV_Base.png"),
  AGV_Header: await new THREE.TextureLoader().loadAsync("/resources/AGV_Header.png"),
};

/** 水平运输车 */
export class AGV implements GpuPickFeature {
  code: string = "";
  static codeSelected = undefined;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    // 生成图元
    const agvBase = new Sprite2D({
      texture: textrues.AGV_Base,
      mpp: calculateMPP(15, 2330),
      renderOrder: LayerSequence.AGV_Base,
      color: new THREE.Color(ColorDefine.DEVICE.DEFAULT),
    });

    const agvHeader = new Sprite2D({
      texture: textrues.AGV_Header,
      mpp: calculateMPP(15, 2330),
      renderOrder: LayerSequence.AGV_Header,
    });

    const agvLabelPviot = new THREE.Object3D();
    agvLabelPviot.position.x = -10.0;
    agvBase.add(agvLabelPviot);
    const agvLabel = new SDFText2D({
      text: this.code,
      renderOrder: LayerSequence.AGV_LABEL,
    });
    const invQuat = new THREE.Quaternion();
    agvLabel.onBeforeRender = () => {
      const scale = defaultZoom / orthoCamera.zoom;
      const scalar = 0.6 * Math.max(Math.min(scale, 1.0), 1.5);
      agvLabel.scale.setScalar(scalar);

      agvLabel.position.copy(agvLabelPviot.position);
      invQuat.copy(agvBase.quaternion).invert();
      agvLabel.quaternion.copy(invQuat);
    };

    // 绑定关系
    agvBase.add(agvHeader);
    agvBase.add(agvLabel);
    agvBase.geometry.computeBoundingBox();
    agvLabel.geometry.computeBoundingBox();
    agvHeader.geometry.boundingBox = agvBase.geometry.boundingBox.clone();
    agvBase.traverse((object3D) => object3D.layers.set(1));

    // 绑定指针
    this.pool.agvBase = agvBase;
    this.pool.agvHeader = agvHeader;
    this.pool.agvLabel = agvLabel;

    // 注册拾取
    const picker = GpuPickManager.getClassInstance<GpuPickManager>();
    picker.register(agvBase);
    picker.register(agvHeader);
    picker.register(agvLabel);
    for (const key of Object.keys(this.pool)) {
      picker.register(this.pool[key]);
      this.pool[key].userData.gpuPickManager.feature = this;
    }
  }

  onSelected() {
    AGV.codeSelected = this.code;
    this.focused();
  }

  onCancelSelected() {
    AGV.codeSelected = undefined;
    this.unfocused();
  }

  onDoubleClicked() {}

  onMovein() {
    this.focused();
  }

  onMoveout() {
    if (AGV.codeSelected !== this.code) {
      this.unfocused();
    }
  }

  onZoomTo() {}

  focused = () => {
    this.pool.agvLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
    this.pool.agvLabel.renderOrder = LayerSequence.ACTIVE_LABEL;
  };

  unfocused = () => {
    this.pool.agvLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
    this.pool.agvLabel.renderOrder = LayerSequence.AGV_LABEL;
  };
}
