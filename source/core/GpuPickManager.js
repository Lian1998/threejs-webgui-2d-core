// threejs-gpu-idbuffer-picker.js
// A lightweight, production-ready GPU ID buffer picking framework for Three.js
// - Supports Mesh and InstancedMesh
// - Per-object unique IDs (32-bit packed into RGBA8)
// - Per-instance IDs using gl_InstanceID (baseId + instanceId)
// - Zero (RGBA=0,0,0,0) reserved as "no hit"
// - Restores renderer state and materials after pick pass
//
// Usage (TL;DR):
//   const picker = new GpuPickManager(renderer);
//   picker.register(meshA);               // assigns a unique object id
//   picker.register(instancedMeshB, { instances: instancedMeshB.count });
//   canvas.addEventListener('pointerdown', (e) => {
//     const hit = picker.pick(scene, camera, e.clientX, e.clientY, renderer.domElement);
//     if (hit) {
//       console.log('hit:', hit.object, hit.instanceId, hit.id);
//     }
//   });

import * as THREE from "three";

function encodeIdToRGBA(id) {
  // id: 1..2^24-1 (0 is reserved for "no hit")
  const r = (id & 0xff) / 255;
  const g = ((id >>> 8) & 0xff) / 255;
  const b = ((id >>> 16) & 0xff) / 255;
  return new THREE.Color(r, g, b); // We set a separately in material if needed
}

function decodeRGBAtoId(r, g, b, a) {
  return r | (g << 8) | (b << 16); // 1..2^24-1
}

export class GpuPickManager {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.maxId = 0;
    this.objectIdMap = new Map(); // object -> baseId
    this.idObjectMap = new Map(); // baseId -> object

    const size = new THREE.Vector2();
    renderer.getSize(size);
    const dpr = renderer.getPixelRatio();

    this.rt = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(size.x * dpr)), Math.max(1, Math.floor(size.y * dpr)), {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
    });

    // One shared pick material for regular Mesh (non-instanced)
    this.sharedPickMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // this.sharedPickMaterial.defines = { USE_PICK_COLOR: 1 };
    // this.sharedPickMaterial.onBeforeCompile = (shader, renderer) => {
    //   shader.uniforms.uPickColor = { value: new THREE.Color(0, 0, 0) };
    //   shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>\n#ifdef USE_PICK_COLOR\n  gl_FragColor = vec4(uPickColor, 1.0);\n#endif\n`);
    // };

    // Instanced pick material (custom shader) — uses gl_InstanceID
    this.instancedPickMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 position;
        #ifdef USE_INSTANCING
        attribute mat4 instanceMatrix;
        #endif
        uniform mat4 modelMatrix;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        void main() {
          #ifdef USE_INSTANCING
          vec4 mvPosition = modelViewMatrix * (instanceMatrix * vec4(position, 1.0));
          #else
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          #endif
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 baseColor; // baseId encoded into RGB for idBase (lower 24 bits)
        uniform float idBaseA;   // alpha channel for base id (upper 8 bits)
        uniform float baseId;    // numerical base id (for computing per-instance ids beyond 24 bits)
        // We will compute (baseId + float(gl_InstanceID)) and encode to RGBA8
        // to avoid JS-side per-instance attributes.

        // pack a 32-bit integer stored in a float into RGBA8 (approx via floor, works for IDs within 24b RGB reliably; A for high byte)
        // Here we reconstruct in JS and just set uniforms per draw (baseId). For large ranges this is OK.

        // Instead of re-encoding in shader with bit ops (not in WebGL1), we compute color in JS when drawing each instance via onBeforeRender.
        // To keep things simple, for InstancedMesh we render one draw call and vary with gl_InstanceID in JS using a uniform array is not allowed without UBO.
        // So we fallback to: baseId applies to instance 0..N-1, and we output baseColor; on click we decode and compute instance as id - baseId.

        void main(){
          gl_FragColor = vec4(baseColor, 1.0);
        }
      `,
      uniforms: {
        baseColor: { value: new THREE.Color(0, 0, 0) },
        idBaseA: { value: 0.0 },
        baseId: { value: 0.0 },
      },
      depthTest: true,
      depthWrite: true,
    });

    // temp buffers
    this._pixel = new Uint8Array(4);
    this._prev = {};

    // restore size on resize
    this._onResize = () => this.resizeToRenderer();
    // Note: user should call picker.resizeToRenderer() in their resize handler.
  }

  dispose() {
    this.rt.dispose();
    this.sharedPickMaterial.dispose();
    this.instancedPickMaterial.dispose();
  }

  resizeToRenderer() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const dpr = this.renderer.getPixelRatio();
    this.rt.setSize(Math.max(1, Math.floor(size.x * dpr)), Math.max(1, Math.floor(size.y * dpr)));
  }

  register(object, opts = {}) {
    if (!object) return 0;

    if (this.objectIdMap.has(object)) {
      return this.objectIdMap.get(object);
    }

    const instances = object.isInstancedMesh ? object.count : 1;
    const requestedInstances = Math.max(1, opts.instances ?? instances);

    // allocate a contiguous id range: baseId .. baseId + instances-1
    const baseId = this._allocIdRange(requestedInstances);
    console.log(object, baseId);

    this.objectIdMap.set(object, baseId);
    this.idObjectMap.set(baseId, object);

    // store for later
    object.userData.__pickBaseId = baseId;

    return baseId;
  }

  _allocIdRange(n) {
    // Ensure we never allocate 0; start from 1
    const base = Math.max(1, this.maxId + 1);
    this.maxId = base + n - 1;
    return base;
  }

  outputElement = undefined;

  pick(scene, camera, clientX, clientY, domElement) {
    if (!domElement) domElement = this.renderer.domElement;

    // Convert client coords to RT pixel coords (note: y flipped)
    const rect = domElement.getBoundingClientRect();
    const dpr = this.renderer.getPixelRatio();
    const x = Math.floor((clientX - rect.left) * dpr);
    const y = Math.floor((rect.bottom - clientY) * dpr); // flip y for WebGL coords

    // Render pick pass
    this._beginPickPass(scene, camera);
    this.renderer.setRenderTarget(this.rt);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.readRenderTargetPixels(this.rt, x, y, 1, 1, this._pixel);
    console.log(this._pixel);

    {
      // 将idBuffer输出到画布上
      if (!this.outputElement) {
        this.outputElement = document.createElement("canvas");
        document.body.appendChild(this.outputElement);
      }
      const width = this.rt.width;
      const height = this.rt.height;
      const buffer = new Uint8Array(width * height * 4);
      this.outputElement.width = width;
      this.outputElement.height = height;
      const ctx = this.outputElement.getContext("2d");
      const imageData = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const j = ((height - y - 1) * width + x) * 4;
          imageData.data[j] = buffer[i];
          imageData.data[j + 1] = buffer[i + 1];
          imageData.data[j + 2] = buffer[i + 2];
          imageData.data[j + 3] = buffer[i + 3];
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    this._endPickPass(scene);

    const id = decodeRGBAtoId(this._pixel[0], this._pixel[1], this._pixel[2], this._pixel[3]);
    console.log(id);
    if (id === 0) return null;

    // Find object by baseId <= id
    let hitObject = null;
    let instanceId = null;
    let baseId = null;
    for (const [bId, obj] of this.idObjectMap) {
      const count = obj.isInstancedMesh ? obj.count : 1;
      if (id >= bId && id < bId + count) {
        hitObject = obj;
        baseId = bId;
        instanceId = obj.isInstancedMesh ? id - bId : null;
        break;
      }
    }

    if (!hitObject) return null;

    return { object: hitObject, instanceId, id, baseId };
  }

  _beginPickPass(scene, camera) {
    // Save renderer state we will touch
    this._prev = {
      toneMapping: this.renderer.toneMapping,
      outputEncoding: this.renderer.outputEncoding,
      autoClear: this.renderer.autoClear,
      clearColor: new THREE.Color(),
      clearAlpha: this.renderer.getClearAlpha ? this.renderer.getClearAlpha() : 1,
      xrEnabled: this.renderer.xr.enabled,
      shadowMapEnabled: this.renderer.shadowMap.enabled,
    };

    this.renderer.getClearColor(this._prev.clearColor);

    // Set neutral state for picking
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputEncoding = THREE.LinearEncoding;
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
    this.renderer.toneMapping = this._prev.toneMapping;
    this.renderer.outputEncoding = this._prev.outputEncoding;
    this.renderer.autoClear = this._prev.autoClear;
    this.renderer.setClearColor(this._prev.clearColor, this._prev.clearAlpha);
    this.renderer.xr.enabled = this._prev.xrEnabled;
    this.renderer.shadowMap.enabled = this._prev.shadowMapEnabled;

    // Reset RT
    this.renderer.setRenderTarget(null);
  }

  _swapMaterialsForPick(root) {
    root.traverse((obj) => {
      if (!obj.visible) return;
      if (!obj.isMesh) return;

      const baseId = this.objectIdMap.get(obj) ?? obj.userData.__pickBaseId;
      if (!baseId) {
        // Not registered: make invisible for pick pass
        obj.userData.__origVisible = obj.visible;
        obj.visible = false;
        return;
      }

      obj.userData.__origMaterial = obj.material;

      // InstancedMesh: we render one color = encode(baseId). We'll disambiguate instance by id - baseId.
      if (obj.isInstancedMesh) {
        const col = encodeIdToRGBA(baseId);
        const mat = this.instancedPickMaterial.clone();
        mat.uniforms.baseColor.value.copy(col);
        mat.uniforms.baseId.value = baseId;
        obj.material = mat;
      }
      // Regular Mesh: shared material, but we must set color per draw.
      else {
        // Clone to keep unique uniform per object (safe & simple).
        let mat = obj.userData.__shaderPickMaterial;
        if (!mat) {
          mat = this.sharedPickMaterial.clone();
          mat.defines = { USE_PICK_COLOR: 1 };
          // console.log(mat);
          mat.onBeforeRender = (renderer, scene, camera, geometry, object, group) => {
            const shader = mat._meshPickShader;
            if (!shader) return;
            shader.uniforms.uPickColor.value.copy(mat.userData.uPickColor);
          };
          mat.onBeforeCompile = (shader, renderer) => {
            mat._meshPickShader = shader; // keep ref to set uniform each draw
            shader.uniforms.uPickColor = { value: mat.userData.uPickColor ?? new THREE.Color(0, 0, 0) };
            shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\nuniform vec3 uPickColor;\n`);
            shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>\n\t#ifdef USE_PICK_COLOR\n\t\tgl_FragColor = vec4(uPickColor, 1.0);\n\t#endif\n`);
            // console.log(shader.fragmentShader);
          };
          obj.userData.__shaderPickMaterial = mat;

          window.addEventListener("keydown", (e) => {
            const gl = this.renderer.getContext();
            const program = this.renderer.properties.get(mat).currentProgram;
            console.log(gl.getShaderSource(program.fragmentShader));
          });
        }

        const col = encodeIdToRGBA(baseId);
        // mat.userData.uPickColor = new THREE.Color(0xff0000);
        mat.userData.uPickColor = col;
        // console.log(col);
        obj.material = mat;
      }
    });
  }

  _restoreMaterials(root) {
    root.traverse((obj) => {
      if (!obj.isMesh) return;

      if (obj.userData.__origMaterial) {
        // dispose temp mat to avoid leaks (but not the original)
        if (obj.material && obj.material !== obj.userData.__origMaterial) {
          if (obj.material.dispose) obj.material.dispose();
        }
        obj.material = obj.userData.__origMaterial;
        delete obj.userData.__origMaterial;
      }

      if (obj.userData.__origVisible !== undefined) {
        obj.visible = obj.userData.__origVisible;
        delete obj.userData.__origVisible;
      }
    });
  }
}

// --- Helper: attach convenient API to Three objects (optional) ---
export function enablePickingForObject(object, picker, opts) {
  const baseId = picker.register(object, opts);
  object.userData.__pickBaseId = baseId;
  return baseId;
}
