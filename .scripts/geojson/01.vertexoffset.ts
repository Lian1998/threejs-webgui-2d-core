const INPUT_FOLDER = path.resolve("./public/geojson");
const OUTPUT_FOLDER = path.resolve("./public/geojson_vertexoffseted");
const OFFSET = [-484869.29, -2493687.04];

//////////////////////////////////// Utils ////////////////////////////////////
//
// 读取标准Geojson格式对每个顶点进行偏移
//
///////////////////////////////////////////////////////////////////////////////

import { GeoJSON } from "geojson";
import { Point } from "geojson";
import { LineString } from "geojson";
import { Polygon } from "geojson";

const pointOffset = (coordinates: Point["coordinates"], x: number, y: number) => {
  coordinates[0] += x;
  coordinates[1] += y;
};

const lineStringOffset = (coordinates: LineString["coordinates"], x: number, y: number) => {
  coordinates.forEach((point) => pointOffset(point, x, y));
};

const polygonOffset = (coordinates: Polygon["coordinates"], x: number, y: number) => {
  coordinates.forEach((line) => lineStringOffset(line, x, y));
};

const offset = (geojson: GeoJSON, xOffset: number, yOffset: number) => {
  if (geojson.type === "Point") {
    pointOffset(geojson.coordinates, xOffset, yOffset);
  } else if (geojson.type === "MultiPoint" || geojson.type === "LineString") {
    lineStringOffset(geojson.coordinates, xOffset, yOffset);
  } else if (geojson.type === "MultiLineString" || geojson.type === "Polygon") {
    polygonOffset(geojson.coordinates, xOffset, yOffset);
  } else if (geojson.type === "MultiPolygon") {
    geojson.coordinates.forEach((polygon) => polygonOffset(polygon, xOffset, yOffset));
  } else if (geojson.type === "Feature") {
    offset(geojson.geometry, xOffset, yOffset);
  } else if (geojson.type === "FeatureCollection") {
    geojson.features.forEach((feature) => offset(feature, xOffset, yOffset));
  }

  return geojson;
};

//////////////////////////////////// Logic ////////////////////////////////////

import fs from "node:fs";
import path from "node:path";

const processFileContent = async (content: string, filePath: string): Promise<string> => {
  const geojson = JSON.parse(content);
  // FeatureCollection
  if (geojson.type === "FeatureCollection") {
    for (let i = 0; i < geojson.features.length; i++) {
      const feature = geojson.features[i];
      feature.geometry = offset(feature.geometry, OFFSET[0], OFFSET[1]);
    }
  }
  // GeometryCollection
  else if (geojson.type === "GeometryCollection") {
    for (let i = 0; i < geojson.geometries.length; i++) {
      const geometry = geojson.geometries[i];
      geojson.geometries[i] = offset(geometry, OFFSET[0], OFFSET[1]);
    }
  }
  return JSON.stringify(geojson);
};

const entries = await fs.promises.readdir(INPUT_FOLDER, { withFileTypes: true });

for (const entry of entries) {
  const srcPath = path.join(INPUT_FOLDER, entry.name);
  const outPath = path.join(OUTPUT_FOLDER, entry.name);

  try {
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  } catch (err) {}

  if (entry.isFile()) {
    const content = await fs.promises.readFile(srcPath, "utf8");
    const processed = await processFileContent(content, srcPath);
    await fs.promises.writeFile(outPath, processed, "utf8");
    console.log(`✅ Processed: ${srcPath} → ${outPath}`);
  }
}
