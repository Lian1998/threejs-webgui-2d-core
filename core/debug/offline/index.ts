import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import vertexShader from "./check.vs?raw";
import fragmentShader from "./check.fs?raw";
import { runFoundationChecks } from "../checks/foundations";
import { runInteractionChecks } from "../checks/interaction";

const status = document.querySelector<HTMLPreElement>("#status")!;
const container = document.querySelector<HTMLElement>("#viewport")!;
let cleanup = () => {};

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setClearColor("#122536");
  container.appendChild(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
  camera.position.z = 5;
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3));
  const material = new THREE.RawShaderMaterial({
    vertexShader,
    fragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: { color: { value: new THREE.Color("#56c5d6") } },
  });
  scene.add(new THREE.Mesh(geometry, material));
  const gui = new GUI({ container: document.querySelector<HTMLElement>("#panel")! });
  const model = { color: "#56c5d6" };
  const render = () => renderer.render(scene, camera);
  gui.addColor(model, "color").onChange((value) => {
    material.uniforms.color.value.set(value);
    render();
  });
  const observer = new ResizeObserver(() => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    render();
  });
  observer.observe(container);
  render();
  const results = [...(await runFoundationChecks()), ...(await runInteractionChecks())];
  status.textContent = `Three.js r${THREE.REVISION} / WebGL2 / GLSL3 / local lil-gui\n\n` + results.map((value) => `PASS ${value}`).join("\n");
  (window as any).__OFFLINE_CHECK__ = { ready: true, revision: THREE.REVISION, results };
  cleanup = () => {
    observer.disconnect();
    gui.destroy();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
void start().catch((error) => {
  status.textContent = String(error);
  (window as any).__OFFLINE_CHECK__ = { ready: false, error: String(error) };
  console.error(error);
});
window.addEventListener("pagehide", () => cleanup(), { once: true });
if (import.meta.hot) import.meta.hot.dispose(() => cleanup());
