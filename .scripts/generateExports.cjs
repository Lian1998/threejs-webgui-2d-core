const fs = require("fs");
const path = require("path");

const PROCESSCWD = process.cwd();
// 获取两个参数 sourceDir, targetFile
const [_, __, sourceDir, targetFile] = process.argv;
// 转化为绝对路径
const _sourceDir = path.resolve(PROCESSCWD, sourceDir);
const _targetFile = path.resolve(PROCESSCWD, targetFile);

// 检查一下传入的sourceDir, 如果有问题的话直接推出脚本
try {
  const stats = fs.statSync(_sourceDir);
  if (!stats.isDirectory()) {
    console.error("sourceDir must be a directory!");
    process.exit();
  }
} catch (error) {
  console.error(`Read sourceDir Error: ${_sourceDir}`, error);
  process.exit();
}

// 获取目录下所有.ts文件的名字
const filePaths = fs
  .readdirSync(_sourceDir)
  .filter((fileName) => fileName.endsWith(".ts"))
  .map((fileName) => path.join(_sourceDir, fileName));

// 为每个.ts文件生成并追加export语句到目标文件
let targetPath = "";
try {
  targetPath = path.dirname(_targetFile);
  if (!targetPath) {
    console.error(`targetFile Error: ${targetFile}`, error);
    process.exit();
  }
} catch (error) {
  console.error(`targetFile Error: ${targetFile}`, error);
  process.exit();
}

const statements = [];
for (let i = 0; i < filePaths.length; i++) {
  const filePath = filePaths[i];
  const relativePath = path.relative(targetPath, filePath).replace(/\\/g, "/");
  const statement = `export * from "./${relativePath}";`;
  statements.push(statement);
}

fs.writeFileSync(_targetFile, statements.join("\n"));
