import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager/";
import { GpuPickFeature } from "@core/GpuPickManager/";
import { ThreejsRenderOrder } from "@source/inMap/index";
import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/inMap/utils/ratio";
import { orthoCamera } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";
import { MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";

const texture_agvBase = await new THREE.TextureLoader().loadAsync("/resources/AGV_Base.png");
const texture_agvHeader = await new THREE.TextureLoader().loadAsync("/resources/AGV_Header.png");

/** Automated Guided Vehicle 自动导引运输车 */
export class AGV implements GpuPickFeature {
  isGpuPickFeature: true;
  code: string = "";
  static codeSelected = undefined;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    // 生成图元
    const agvBase = new Sprite2D({
      texture: texture_agvBase,
      mpp: calculateMPP(15, 2330),
      renderOrder: ThreejsRenderOrder.AGV_BASE,
      color: getColorRuntime("VARS.DEVICE_STATUS.NORMAL").threejsColor,
    });

    const agvHeader = new Sprite2D({
      texture: texture_agvHeader,
      mpp: calculateMPP(15, 2330),
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

    // 绑定指针
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
    if (AGV.codeSelected !== this.code) {
      this.unfocused();
    }
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
