import * as THREE from "three";
import Tinycolor from "tinycolor2";
import { GpuPickManager } from "@core/GpuPickManager/";
import { GpuPickFeature } from "@core/GpuPickManager/";
import { ThreejsRenderOrder } from "@source/inMap/index";
import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/inMap/utils/ratio";
import { orthoCamera } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";
import { MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";

const textrues = {
  STS_Gantry: await new THREE.TextureLoader().loadAsync("/resources/STS_Gantry.png"),
  STS_Trolley: await new THREE.TextureLoader().loadAsync("/resources/STS_Trolley.png"),
};

/** Ship-to-Shore Crane 岸边集装箱起重机 */
export class STS implements GpuPickFeature {
  isGpuPickFeature: true;
  code: string = "";
  static codeSelected = undefined;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;
    const colorRuntime = getColorRuntime("VARS.DEVICE_STATUS.NORMAL");

    // 生成图元
    const stsGantry = new Sprite2D({
      texture: textrues.STS_Gantry,
      mpp: calculateMPP(35, 610),
      renderOrder: ThreejsRenderOrder.STS_GANTRY,
      color: colorRuntime.threejsColor,
    });

    const stsMtPviot = new THREE.Object3D();
    stsMtPviot.position.z = 60.0;
    const stsMT = new Sprite2D({
      texture: textrues.STS_Trolley,
      mpp: calculateMPP(18, 87),
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
      color: new THREE.Color(Tinycolor(colorRuntime.tinyColor.getOriginalInput()).darken(10).toHexString()),
    });
    stsMtPviot.add(stsMT);

    const stsPTPviot = new THREE.Object3D();
    stsPTPviot.position.z = 40.0;
    const stsPT = new Sprite2D({
      texture: textrues.STS_Trolley,
      mpp: calculateMPP(18, 87),
      renderOrder: ThreejsRenderOrder.STS_TROLLEY,
      color: new THREE.Color(Tinycolor(colorRuntime.tinyColor.getOriginalInput()).darken(10).toHexString()),
    });
    stsPTPviot.add(stsPT);

    const stsLabelPviot = new THREE.Object3D();
    stsLabelPviot.position.z = 8;
    const stsLabel = new SDFText2D({
      text: this.code,
      renderOrder: ThreejsRenderOrder.STS_LABEL,
    });
    stsLabelPviot.add(stsLabel);
    stsLabel.onBeforeRender = () => {
      const scale = MAP_DEFAULT_ZOOM / orthoCamera.zoom;
      const scalar = Math.max(Math.min(scale, 1.0), 1.5);
      stsLabel.scale.setScalar(scalar);
    };

    // 绑定关系
    stsGantry.add(stsMtPviot);
    stsGantry.add(stsPTPviot);
    stsGantry.add(stsLabelPviot);
    stsGantry.geometry.computeBoundingBox();
    stsMT.geometry.boundingBox = stsGantry.geometry.boundingBox.clone();
    stsPT.geometry.boundingBox = stsGantry.geometry.boundingBox.clone();

    // 绑定指针
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

  onZoomTo() {}

  focused = () => {
    this.pool.stsLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
    this.pool.stsLabel.renderOrder = ThreejsRenderOrder.ACTIVE_LABEL;
  };

  unfocused = () => {
    this.pool.stsLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
    this.pool.stsLabel.renderOrder = ThreejsRenderOrder.STS_LABEL;
  };
}
