import * as THREE from "three";
import { GpuPickManager } from "@core/GpuPickManager/";
import { GpuPickFeature } from "@core/GpuPickManager/";

import ColorDefine from "@source/ColorDefine";
import LayerSequence from "@source/LayerSequence";

import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMPP } from "@source/utils/ratio";
import { darkenHex } from "@source/utils/color";

import { orthoCamera, defaultZoom } from "@source/viewport";

const t_STS_Gantry = await new THREE.TextureLoader().loadAsync("/resources/STS_Gantry.png");
const t_STS_Trolley = await new THREE.TextureLoader().loadAsync("/resources/STS_Trolley.png");

/** 岸桥 */
export class STS implements GpuPickFeature {
  code: string = "";
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    // 生成图元
    const stsGantry = new Sprite2D({
      texture: t_STS_Gantry,
      mpp: calculateMPP(35, 610),
      depth: LayerSequence.QC_Gantry,
      color: new THREE.Color(ColorDefine.DEVICE.DEFAULT),
    });

    const stsMtPviot = new THREE.Object3D();
    stsMtPviot.position.z = 60;
    const stsMT = new Sprite2D({
      texture: t_STS_Trolley,
      mpp: calculateMPP(18, 87),
      depth: LayerSequence.QC_Trolley,
      color: new THREE.Color(darkenHex(ColorDefine.DEVICE.DEFAULT, 15)),
    });
    stsMtPviot.add(stsMT);

    const stsPTPviot = new THREE.Object3D();
    stsPTPviot.position.z = 40;
    const stsPT = new Sprite2D({
      texture: t_STS_Trolley,
      mpp: calculateMPP(18, 87),
      depth: LayerSequence.QC_Trolley,
      color: new THREE.Color(darkenHex(ColorDefine.DEVICE.DEFAULT, 15)),
    });
    stsPTPviot.add(stsPT);

    const stsLabelPviot = new THREE.Object3D();
    stsLabelPviot.position.z = -40;
    const stsLabel = new SDFText2D({
      text: this.code,
      depth: LayerSequence.TEXT,
    });
    stsLabelPviot.add(stsLabel);

    // 绑定关系
    stsGantry.add(stsMtPviot);
    stsGantry.add(stsPTPviot);
    stsGantry.add(stsLabelPviot);
    stsGantry.geometry.computeBoundingBox();
    stsMT.geometry.boundingBox = stsGantry.geometry.boundingBox.clone();
    stsPT.geometry.boundingBox = stsGantry.geometry.boundingBox.clone();
    stsGantry.traverse((object3D) => object3D.layers.set(1));

    // 绑定指针
    this.pool.stsGantry = stsGantry;
    this.pool.stsMT = stsMT;
    this.pool.stsPT = stsPT;
    this.pool.stsLabel = stsLabel;

    // 注册拾取
    const picker = GpuPickManager.getClassInstance<GpuPickManager>();
    picker.register(stsGantry);
    picker.register(stsMT);
    picker.register(stsPT);
    for (const key of Object.keys(this.pool)) {
      picker.register(this.pool[key]);
      this.pool[key].userData.gpuPickManager.feature = this;
    }
  }

  update(deltaTime: number, elapsedTime: number) {
    const scale = (1.0 * defaultZoom) / orthoCamera.zoom;
    this.pool.stsLabel.scale.setScalar(scale);
  }

  onSelected() {}

  onCancelSelected() {}

  onDoubleClicked() {}

  onMovein() {
    this.pool.stsLabel.material["uniforms"].uBackgroundColor.value.set(0xffff00);
  }

  onMoveout() {
    this.pool.stsLabel.material["uniforms"].uBackgroundColor.value.set(0xffffff);
  }

  onZoomTo() {}
}
