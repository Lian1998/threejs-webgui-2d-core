import * as THREE from "three";

import { Sprite2D } from "@core/index";
import { SDFText2D } from "@core/index";
import { MeshPolygonGeometry } from "@core/index";
import { MeshPolygonMaterial } from "@core/index";
import { MeshLineGeometry } from "@core/index";
import { MeshLineMaterial } from "@core/index";
import { DirtyRenderScheduler } from "@core/index";
import { GpuPickManager } from "@core/GpuPickManager";
import { GpuPickFeature } from "@core/interfaces/GpuPickFeature";

import { ThreejsGroups } from "@source/inMap/variables";
import { ThreejsLayers } from "@source/inMap/variables";
import { ThreejsRenderOrder } from "@source/inMap/variables";

type PreDefBlockItem = {
  areaName: string;
  x: number;
  y: number;
  hl: number;
  hw: number;
};

const LOGIC_CENTER = [567485.3, -2397835];
const coordinateTrans_mm = (x: number, y: number) => [LOGIC_CENTER[0] - x / 1000.0, LOGIC_CENTER[1] + y / 1000.0];

export const preDefBlockLayer = {
  source: [] as PreDefBlockItem[],
  polygonMesh: undefined as THREE.Mesh | undefined,
  outlineMesh: undefined as THREE.Mesh | undefined,
  labels: [] as SDFText2D[],
};

export const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose();
    return;
  }
  material.dispose();
};

export const disposePreDefBlockLayer = () => {
  if (preDefBlockLayer.polygonMesh) {
    GpuPickManager.unregister(preDefBlockLayer.polygonMesh);
    preDefBlockLayer.polygonMesh.removeFromParent();
    preDefBlockLayer.polygonMesh.geometry.dispose();
    disposeMaterial(preDefBlockLayer.polygonMesh.material);
    preDefBlockLayer.polygonMesh = undefined;
  }

  if (preDefBlockLayer.outlineMesh) {
    preDefBlockLayer.outlineMesh.removeFromParent();
    preDefBlockLayer.outlineMesh.geometry.dispose();
    disposeMaterial(preDefBlockLayer.outlineMesh.material);
    preDefBlockLayer.outlineMesh = undefined;
  }

  for (const label of preDefBlockLayer.labels) {
    label.removeFromParent();
    label.geometry.dispose();
    disposeMaterial(label.material);
  }
  preDefBlockLayer.labels.length = 0;
};

export const rebuildPreDefBlockLayer = (data: PreDefBlockItem[]) => {
  disposePreDefBlockLayer();
  preDefBlockLayer.source = data.slice();

  const positions: number[] = [];
  const lines: number[][] = [];
  const features: GpuPickFeature[] = [];
  const featureIndexByVertex: number[] = [];

  const labelNormalColor = new THREE.Color(0xffffff);
  const labelActiveColor = new THREE.Color(0xffec8b);

  for (let i = 0; i < data.length; i++) {
    const element = data[i];

    const coordinates = coordinateTrans_mm(element.x, element.y);
    const a1 = [coordinates[0] - element.hl / 1000.0 / 2.0, 0.0, coordinates[1] - element.hw / 1000.0 / 2.0];
    const a2 = [coordinates[0] - element.hl / 1000.0 / 2.0, 0.0, coordinates[1] + element.hw / 1000.0 / 2.0];
    const a3 = [coordinates[0] + element.hl / 1000.0 / 2.0, 0.0, coordinates[1] + element.hw / 1000.0 / 2.0];
    const a4 = [coordinates[0] + element.hl / 1000.0 / 2.0, 0.0, coordinates[1] - element.hw / 1000.0 / 2.0];

    positions.push(...a1, ...a2, ...a3, ...a3, ...a4, ...a1);
    lines.push([...a1, ...a2, ...a3, ...a4, ...a1]);
    for (let j = 0; j < 6; j++) featureIndexByVertex.push(i);

    const label = new SDFText2D({
      text: element.areaName,
      uOutlineColor: new THREE.Color(0xff0000),
      renderOrder: ThreejsRenderOrder.BLOCK_PREDEFINE_LABEL,
    });
    label.name = element.areaName;
    label.position.set(coordinates[0], 0.0, coordinates[1]);
    label.scale.setScalar(0.5);
    ThreejsGroups.Meshes.add(label);
    preDefBlockLayer.labels.push(label);

    let selected = false;
    const syncLabelState = (active: boolean) => {
      label.setStyle({ uBackgroundColor: active ? labelActiveColor : labelNormalColor });
      label.renderOrder = active ? ThreejsRenderOrder.ACTIVE_LABEL : ThreejsRenderOrder.BLOCK_PREDEFINE_LABEL;
    };

    const feature: GpuPickFeature = {
      isGpuPickFeature: true,
      onMovein: () => syncLabelState(true),
      onMoveout: () => !selected && syncLabelState(false),
      onSelected: () => {
        selected = true;
        syncLabelState(true);
        console.log("[PreDefBlock] selected", element);
      },
      onCancelSelected: () => {
        selected = false;
        syncLabelState(false);
      },
      onDoubleClicked: () => console.log("[PreDefBlock] double clicked", element),
    };
    features.push(feature);
  }

  const polygonGeometry = new MeshPolygonGeometry();
  polygonGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  const polygonMaterial = new MeshPolygonMaterial({
    uResolution: new THREE.Vector2(1024, 768),
    uColor: new THREE.Color("#000000"),
    uOpacity: 0.4,
  });
  const polygonMesh = new THREE.Mesh(polygonGeometry, polygonMaterial);
  polygonMesh.frustumCulled = false;
  ThreejsGroups.Meshes.add(polygonMesh);
  GpuPickManager.registerMeshBatch(polygonMesh, features, featureIndexByVertex);
  preDefBlockLayer.polygonMesh = polygonMesh;

  const lineGeometry = new MeshLineGeometry();
  lineGeometry.setMultiLine(lines);
  const lineMaterial = new MeshLineMaterial({
    uResolution: new THREE.Vector2(1024, 768),
    uLineWidth: 1.0,
    uColor: new THREE.Color("#000000"),
    uUseDash: 1,
    uDashArray: new THREE.Vector2(1, 1),
  });
  const outline = new THREE.Mesh(lineGeometry, lineMaterial);
  outline.frustumCulled = false;
  ThreejsGroups.Meshes.add(outline);
  preDefBlockLayer.outlineMesh = outline;

  DirtyRenderScheduler.invalidateDefault("predef-block:rebuild");
};

export const removePreDefBlockByName = (areaName: string) => {
  const next = preDefBlockLayer.source.filter((item) => item.areaName !== areaName);
  rebuildPreDefBlockLayer(next);
};
