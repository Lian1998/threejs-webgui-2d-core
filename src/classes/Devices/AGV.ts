import * as THREE from "three";
import { GpuPickFeature } from "@core/interfaces/GpuPickFeature";
import { GpuPickManager } from "@core/GpuPickManager/";
import { SDFText2D, Sprite2D } from "@core/index";
import { ThreejsRenderOrder } from "@source/inMap/variables";
import { calculateMpp } from "@source/inMap/utils/ratio";
import { orthoCamera, MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";

const spriteUrls = {
  AGV_Base: "/resource/sprites/AGV_Base.png",
  AGV_Header: "/resource/sprites/AGV_Header.png",
};

/** Automated Guided Vehicle. */
export class AGV implements GpuPickFeature {
  static codeSelected = undefined;
  code = "";

  isGpuPickFeature: true = true;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    const agvBase = new Sprite2D({
      url: spriteUrls.AGV_Base,
      mpp: calculateMpp(15, 2330),
      renderOrder: ThreejsRenderOrder.AGV_BASE,
      multiplyColor: getColorRuntime("VARS.DEVICE_STATUS.NORMAL").threejsColor,
    });

    const agvHeader = new Sprite2D({
      url: spriteUrls.AGV_Header,
      mpp: calculateMpp(15, 2330),
      renderOrder: ThreejsRenderOrder.AGV_HEADER,
    });

    const agvLabelPviot = new THREE.Object3D();
    agvLabelPviot.position.x = -10.0;
    agvBase.add(agvLabelPviot);

    const agvLabel = new SDFText2D({
      text: this.code,
      renderOrder: ThreejsRenderOrder.AGV_LABEL,
    });

    const invQuat = new THREE.Quaternion();
    agvLabel.onBeforeRender = () => {
      const scale = MAP_DEFAULT_ZOOM / orthoCamera.zoom;
      const scalar = 0.6 * THREE.MathUtils.clamp(scale, 1.0, 1.5);
      agvLabel.scale.setScalar(scalar);
      agvLabel.position.copy(agvLabelPviot.position);
      invQuat.copy(agvBase.quaternion).invert();
      agvLabel.quaternion.copy(invQuat);
    };

    agvBase.add(agvHeader);
    agvBase.add(agvLabel);
    agvBase.geometry.computeBoundingBox();
    agvHeader.geometry.boundingBox = agvBase.geometry.boundingBox.clone();
    agvLabel.geometry.boundingBox = agvBase.geometry.boundingBox.clone();

    this.pool.agvBase = agvBase;
    this.pool.agvHeader = agvHeader;
    this.pool.agvLabel = agvLabel;

    for (const key of Object.keys(this.pool)) GpuPickManager.register(this.pool[key], this);
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
    if (AGV.codeSelected !== this.code) this.unfocused();
  }

  onZoomTo() {}

  focused = () => {
    this.pool.agvLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
    this.pool.agvLabel.renderOrder = ThreejsRenderOrder.ACTIVE_LABEL;
  };

  unfocused = () => {
    this.pool.agvLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
    this.pool.agvLabel.renderOrder = ThreejsRenderOrder.AGV_LABEL;
  };
}
