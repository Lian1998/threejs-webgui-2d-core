import * as THREE from "three";
import { GpuPickFeature } from "@core/legacy/interfaces/GpuPickFeature";
import { GpuPickManager } from "@core/legacy/GpuPickManager/";
import { SDFText2D, Sprite2D } from "@core/legacy/index";
import { ThreejsRenderOrder } from "@/inMap/variables";
import { calculateMpp } from "@/inMap/utils/ratio";
import { orthoCamera, MAP_DEFAULT_ZOOM } from "@/inMap/viewport";
import { getColorRuntime } from "@/themes/ColorPaletteManager/index";

/** Automated Guided Vehicle. */
export class AGV implements GpuPickFeature {
  static codeSelected = undefined;
  code = "";

  isGpuPickFeature: true = true;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    const agvBase = new Sprite2D({
      url: "/resource/sprites/AGV_Base.png",
      mpp: calculateMpp(15, 2330),
      renderOrder: ThreejsRenderOrder.AGV_BASE,
      multiplyColor: getColorRuntime("VARS.DEVICE_STATUS.NORMAL").threejsColor,
    });

    const agvHeader = new Sprite2D({
      url: "/resource/sprites/AGV_Header.png",
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

    this.pool.agvBase = agvBase;
    this.pool.agvHeader = agvHeader;
    this.pool.agvLabel = agvLabel;

    // 注册拾取
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
