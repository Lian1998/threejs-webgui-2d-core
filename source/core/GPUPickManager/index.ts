import * as THREE from "three";
import instancedPickVert from "./shaders/instancedPick.vs?raw";
import instancedPickFrag from "./shaders/instancedPick.fs?raw";

const encodeIdToRGBA = (id: number) => {
  // id: 1..2^32-1 (0 is reserved for "no hit")
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  const a = ((id >>> 24) & 0xff) / 255; // keep alpha too (useful if needed)
  return new THREE.Color(r, g, b); // We set a separately in material if needed
};

const decodeRGBAtoId = (r: number, g: number, b: number, a: number) => {
  // r,g,b,a are 0..255 integers
  return r | (g << 8) | (b << 16) | (a << 24);
};

export interface GPUPickManagerOptions {
  renderer?: THREE.WebGLRenderer;
  samples?: number;
}

export interface GPUInstanceRenderPickManagerOptions {
  instances?: number;
}

/**
 *
 * 在 threejs 封装下 基于GPU渲染, 将Id烘焙成buffer图像流, 完成选择事件的监听和读取
 * - Supports Mesh and InstancedMesh
 * - Per-object unique Ids (32-bit packed into RGBA8)
 * - Per-instance Ids using gl_InstanceId (baseId + instanceId)
 * - Zero (RGBA=0,0,0,0) reserved as "no hit"
 * - Restores renderer state and materials after pick pass
 *
 *
 * 用法:
 * ```javascript
 * const picker = new GpuPickManager(renderer, { samples: 4 });
 * picker.register(meshA); // assigns a unique object id
 * picker.register(instancedMeshB, { instances: instancedMeshB.count });
 * canvas.addEventListener('pointerdown', (e) => {
 *  const picker = new GpuPickManager(renderer, { samples: 4 });
 *  const hit = picker.pick(scene, camera, e.clientX, e.clientY, renderer.domElement);
 *  if (hit) {
 *    console.log('hit:', hit.object, hit.instanceId, hit.id);
 *  }
 * });
 * ```
 *
 * 文档:
 * [MathUtils.generateUUID](https://threejs.org/docs/?q=Util#api/en/math/MathUtils.generateUUID)
 * [wikipedia](https://en.wikipedia.org/wiki/Universally_unique_identifier)
 */
export class GpuPickManager implements GPUPickManagerOptions {
  renderer: THREE.WebGLRenderer; // 在生成GPUPickManager时需要绑定渲染器
  renderTarget: THREE.WebGLRenderTarget; // 离屏渲染纹素

  sharedPickMaterial: THREE.Material;
  instancedPickMaterial: THREE.ShaderMaterial;
  private _meshPickShaderObject: THREE.WebGLProgramParametersWithUniforms;
  private _pixel = new Uint8Array(4);
  private _prev = {};

  samples: number = 4;
  maxId: number = 0;
  object2IdMap = new Map<THREE.Object3D, number>(); // object -> baseId
  Id2ObjectMap = new Map<number, THREE.Object3D>(); // baseId -> object

  constructor(opts: GPUPickManagerOptions = {}) {
    this.renderer = opts.renderer;
    if (!this.renderer) throw new Error("使用 GpuPickManager 时请绑定渲染器");
    this.samples = opts.samples; // MSAA renderbuffer samples (WebGL2 only)

    const size = new THREE.Vector2();
    this.renderer.getSize(size);

    window.addEventListener("resize", () => {});
    const dpr = this.renderer.getPixelRatio();

    this.renderTarget = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(size.x * dpr)), Math.max(1, Math.floor(size.y * dpr)), {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      samples: this.samples,
    });

    // One shared pick material for regular Mesh (non-instanced)
    this.sharedPickMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sharedPickMaterial.defines = { USE_PICK_COLOR: 1 };
    this.sharedPickMaterial.onBeforeCompile = (shaderObject) => {
      console.log("THREE.WebGLProgramParametersWithUniforms", shaderObject);
      shaderObject.uniforms.pickColor = { value: new THREE.Color(0, 0, 0) };
      shaderObject.fragmentShader = shaderObject.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>\n#ifdef USE_PICK_COLOR\n  gl_FragColor = vec4(pickColor, 1.0);\n#endif\n`);
      this._meshPickShaderObject = shaderObject; // keep ref to set uniform each draw
    };

    // Instanced pick material (custom shader) — uses gl_InstanceId
    this.instancedPickMaterial = new THREE.ShaderMaterial({
      vertexShader: instancedPickVert,
      fragmentShader: instancedPickFrag,
      uniforms: {
        baseColor: { value: new THREE.Color(0, 0, 0) },
        idBaseA: { value: 0.0 },
        baseId: { value: 0.0 },
      },
      depthTest: true,
      depthWrite: true,
    });
  }

  dispose() {
    this.renderTarget.dispose();
    this.sharedPickMaterial.dispose();
    this.instancedPickMaterial.dispose();
  }

  resizeToRenderer() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const dpr = this.renderer.getPixelRatio();
    this.renderTarget.setSize(Math.max(1, Math.floor(size.x * dpr)), Math.max(1, Math.floor(size.y * dpr)));
  }

  register(object3D: THREE.Object3D, opts: GPUInstanceRenderPickManagerOptions = {}) {
    if (!object3D) return 0;

    if (this.object2IdMap.has(object3D)) {
      return this.object2IdMap.get(object3D);
    }

    const instances = (object3D as THREE.InstancedMesh).isInstancedMesh ? (object3D as THREE.InstancedMesh).count : 1;
    const requestedInstances = Math.max(1, opts.instances ?? instances);
    const pickId = this._allocPickIdRange(requestedInstances);

    this.object2IdMap.set(object3D, pickId);
    this.Id2ObjectMap.set(pickId, object3D);

    object3D.userData.__pickId = pickId; // store for later

    return pickId;
  }

  _allocPickIdRange(n: number) {
    const baseId = Math.max(1, this.maxId + 1);
    this.maxId = baseId + n - 1;
    return baseId;
  }

  /**
   * 触发拾取
   * @param scene
   * @param camera
   * @param clientX
   * @param clientY
   * @param domElement
   * @returns
   */
  pick(scene: THREE.Scene, camera: THREE.Camera, clientX: number, clientY: number, domElement: HTMLCanvasElement) {
    if (!domElement) domElement = this.renderer.domElement;

    // 计算客户端点击的位置在纹素上的坐标位置 (note: y flipped)
    const dpr = this.renderer.getPixelRatio();
    const { left, bottom } = domElement.getBoundingClientRect();
    const x = Math.floor((clientX - left) * dpr);
    const y = Math.floor((bottom - clientY) * dpr); // flip y for WebGL coords

    // 离屏渲染一帧纹理以用于拾取pickID
    this._beginPickPass(scene, camera);
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.readRenderTargetPixels(this.renderTarget, x, y, 1, 1, this._pixel);
    this._endPickPass(scene);

    const id = decodeRGBAtoId(this._pixel[0], this._pixel[1], this._pixel[2], this._pixel[3]);
    if (id === 0) return null;

    // Find object by pickId <= id
    let hitObject = null;
    let instanceId = null;
    let pickId = null;
    for (const [_pickId, object3D] of this.Id2ObjectMap) {
      const count = (object3D as THREE.InstancedMesh).isInstancedMesh ? (object3D as THREE.InstancedMesh).count : 1;
      if (id >= _pickId && id < _pickId + count) {
        hitObject = object3D;
        pickId = _pickId;
        instanceId = (object3D as THREE.InstancedMesh).isInstancedMesh ? id - _pickId : null;
        break;
      }
    }

    if (!hitObject) return null;

    return { object: hitObject, instanceId, id, pickId };
  }

  _beginPickPass(scene: THREE.Scene, camera: THREE.Camera) {
    // Save renderer state we will touch
    this._prev = {
      toneMapping: this.renderer.toneMapping,
      outputColorSpace: this.renderer.outputColorSpace,
      autoClear: this.renderer.autoClear,
      clearColor: new THREE.Color(),
      clearAlpha: this.renderer.getClearAlpha ? this.renderer.getClearAlpha() : 1,
      shadowMapEnabled: this.renderer.shadowMap.enabled,
    };

    this.renderer.getClearColor(this._prev["clearColor"]);

    // Set neutral state for picking
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = true;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.xr.enabled = false;
    this.renderer.shadowMap.enabled = false;

    // Replace materials for pick draw
    this._swapMaterialsForPick(scene);
  }

  _endPickPass(scene) {
    // Restore materials
    this._restoreMaterials(scene);

    // Restore renderer state
    this.renderer.toneMapping = this._prev["toneMapping"];
    this.renderer.outputColorSpace = this._prev["outputColorSpace"];
    this.renderer.autoClear = this._prev["autoClear"];
    this.renderer.setClearColor(this._prev["clearColor"], this._prev["clearAlpha"]);
    this.renderer.shadowMap.enabled = this._prev["shadowMapEnabled"];

    // Reset RT
    this.renderer.setRenderTarget(null);
  }

  _swapMaterialsForPick(root: THREE.Object3D) {
    root.traverse((object3D) => {
      if (!object3D.visible) return;
      if (!(object3D as THREE.Mesh).isMesh) return;

      const pickId = this.object2IdMap.get(object3D) ?? object3D.userData.__pickId;
      if (!pickId) {
        // Not registered: make invisible for pick pass
        object3D.userData.__origVisible = object3D.visible;
        object3D.visible = false;
        return;
      }

      object3D.userData.__originMaterial = object3D["material"];

      // For InstancedMesh, we render one color = encode(baseId). We'll disambiguate instance by id - baseId.
      if ((object3D as THREE.InstancedMesh).isInstancedMesh) {
        const color = encodeIdToRGBA(pickId);
        const mat = this.instancedPickMaterial.clone();
        mat.uniforms.baseColor.value.copy(color);
        mat.uniforms.baseId.value = pickId;
        (object3D as THREE.InstancedMesh).material = mat;
      }

      // Regular Mesh: shared material, but we must set color per draw.
      // Clone to keep unique uniform per object (safe & simple).
      else {
        const mat = this.sharedPickMaterial.clone();
        const color = encodeIdToRGBA(pickId);
        // onBeforeCompile already injected pickColor uniform
        mat.userData.pickColor = color;
        mat.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
          if (material) {
            if (material["unifroms"]) {
              if (material["uniforms"]["pickColor"]) {
                material["uniforms"]["pickColor"].value.copy(material.userData.pickColor);
              }
            }
          }
        };
        (object3D as THREE.Mesh).material = mat;
      }
    });
  }

  _restoreMaterials(root: THREE.Object3D) {
    root.traverse((object3D: THREE.Object3D) => {
      if (!(object3D as THREE.Mesh).isMesh) return;

      if (object3D.userData.__originMaterial) {
        // dispose temp mat to avoid leaks (but not the original)
        if (object3D["material"]) {
          if (object3D["material"] !== object3D.userData.__originMaterial) {
            if (object3D["material"].dispose) {
              object3D["material"].dispose();
            }
          }
        }
        object3D["material"] = object3D.userData.__originMaterial;
        delete object3D.userData.__originMaterial;
      }

      if (object3D.userData.__origVisible !== undefined) {
        object3D.visible = object3D.userData.__origVisible;
        delete object3D.userData.__origVisible;
      }
    });
  }
}

// --- Helper: attach convenient API to Three objects (optional) ---
export function enablePickingForObject(picker: GpuPickManager, object: THREE.Object3D, opts: GPUInstanceRenderPickManagerOptions) {
  const baseId = picker.register(object, opts);
  object.userData.__pickBaseId = baseId;
  return baseId;
}
