//////////////////////////////////// 配置项 ////////////////////////////////////

const INPUT_FOLDER = path.resolve("./assets/qgis.dachanwan/"); // 输入目录(包含一个或多个geojson文件的目录)
const OUTPUT_FOLDER = path.resolve("./output/.scripts/geojson/vertex_offset/"); // 结果输出目录
const OFFSET = [-484869.29, -2493687.04];

//////////////////////////////////// 工具函数 ////////////////////////////////////

import type { GeoJSON } from "geojson";
import type { Point } from "geojson";
import type { LineString } from "geojson";
import type { Polygon } from "geojson";

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

//////////////////////////////////// 主函数 ////////////////////////////////////
//
// 根据配置读取文件夹中的所有文件内容, 解析并按照文件名输出
//
///////////////////////////////////////////////////////////////////////////////

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

const main = async () => {
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
      console.log(`✅ 处理文件: ${srcPath} → ${outPath}`);
    }
  }
};

main();
