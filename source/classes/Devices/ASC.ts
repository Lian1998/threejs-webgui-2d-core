import * as THREE from "three";
import Tinycolor from "tinycolor2";
import { GpuPickFeature } from "@core/interfaces/GpuPickFeature";
import { GpuPickManager } from "@core/GpuPickManager/";
import { ThreejsRenderOrder } from "@source/inMap/variables";
import { SDFText2D } from "@core/index";
import { Sprite2D } from "@core/index";
import { calculateMpp } from "@source/inMap/utils/ratio";
import { orthoCamera } from "@source/inMap/viewport";
import { getColorRuntime } from "@source/themes/ColorPaletteManager/index";
import { MAP_DEFAULT_ZOOM } from "@source/inMap/viewport";

const textures = {
  ASC_Gantry: new THREE.TextureLoader().load("/resource/device/ASC_Gantry.png"),
  ASC_Trolley: new THREE.TextureLoader().load("/resource/device/STS_Trolley.png"),
};

const textureKey = Object.keys(textures);
for (const key of textureKey) {
  const texture = textures[key];
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.premultiplyAlpha = false; //
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1); // 设置纹理左右不重复
}

/** Automated Stacking Crane 自动化堆场起重机 */
export class ASC implements GpuPickFeature {
  static codeSelected = undefined;
  code: string = "";

  isGpuPickFeature: true;
  pool: Record<string, THREE.Mesh> = {};

  constructor(code: string) {
    this.code = code;

    // 生成图元
    const ascGantry = new Sprite2D({
      texture: textures.ASC_Gantry,
      mpp: calculateMpp(54, 6594),
      renderOrder: ThreejsRenderOrder.ASC_GANTRY,
      multiplyColor: getColorRuntime("VARS.DEVICE_STATUS.NORMAL").threejsColor,
    });

    const ascMtPviot = new THREE.Object3D();
    ascMtPviot.position.x = -26.0;
    const ascMT = new Sprite2D({
      texture: textures.ASC_Trolley,
      mpp: calculateMpp(18, 87),
      renderOrder: ThreejsRenderOrder.ASC_TROLLEY,
      multiplyColor: new THREE.Color(Tinycolor(getColorRuntime("VARS.DEVICE_STATUS.NORMAL").tinyColor.getOriginalInput()).darken(10).toHexString()),
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

    // 绑定关系
    ascGantry.add(ascMtPviot);
    ascGantry.add(ascLabelPviot);
    ascGantry.geometry.computeBoundingBox();
    ascMT.geometry.boundingBox = ascGantry.geometry.boundingBox.clone();

    // 绑定指针
    this.pool.ascGantry = ascGantry;
    this.pool.ascMT = ascMT;
    this.pool.ascLabel = ascLabel;

    // 注册拾取
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
    if (ASC.codeSelected !== this.code) {
      this.unfocused();
    }
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
