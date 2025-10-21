import fs from "node:fs";
import path from "node:path";
import { offset } from "geojson-offset";

const INPUT_FOLDER = path.resolve("./public/geojson");
const OUTPUT_FOLDER = path.resolve("./public/geojson-handled");

const processFileContent = async (content: string, filePath: string): Promise<string> => {
  const geojson = JSON.parse(content);
  if (geojson.type === "GeometryCollection") {
    for (let i = 0; i < geojson.geometries.length; i++) {
      const geometry = geojson.geometries[i];
      geojson.geometries[i] = offset(geometry, -484872, -2493683);
    }
  }
  return JSON.stringify(geojson, undefined, 2);
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
