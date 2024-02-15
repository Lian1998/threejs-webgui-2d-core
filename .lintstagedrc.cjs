const fs = require("fs");
const path = require("path");
const ignore = require("ignore");

const PROCESS_CWD = process.cwd();

module.exports = {

    "*.{js,jsx,vue,ts,tsx,json,css,scss,sass,less,html}": async (fileAbsPaths) => {

        try {

           // prettier
            const prettierIgnoreInstance = ignore(); // 用ignore实例接管 .prettiercignore 配置的表达式
            {
                const ignorePaths  = path.resolve(".prettierignore"); 
                const ignoredPatterns = fs.readFileSync(ignorePaths, "utf-8")
                    .split("\n")                                           // 排除换行
                    .map(line => line.trim())                              // 排除多余空格
                    .filter(line => !line.startsWith("#") && line !== ""); // 排除注释
                prettierIgnoreInstance.add(ignoredPatterns);
            }

            // 计算对应的相对路径数组
            if (!prettierIgnoreInstance) { throw new Error("读取 .prettierignore 失败"); }
            const prettierDealWithPaths = fileAbsPaths
                        .map((fileAbsPath) => { // 路径转换为相对路径
                            console.log(fileAbsPath);
                            return path.relative(PROCESS_CWD, fileAbsPath);
                        })
                        .filter((fileAbsPath) => { // 路径进行ignore对比过滤
                            console.log(fileAbsPath);
                            return !prettierIgnoreInstance.ignores(fileAbsPath);
                        });
            const prettierDealWithPaths_ = prettierDealWithPaths.join(" ");
            console.log(prettierDealWithPaths_);

            const commandsRes = []; // 存储指令集

            // 使用prettier对所有的匹配的文件进行自动格式化
            commandsRes.push(`npx prettier --write ${prettierDealWithPaths_}`)

            // 重新保存回stage缓冲区
            commandsRes.push(`git add ${prettierDealWithPaths_}`);

            return commandsRes;

        } catch (error) {
            console.log(error);
        }
        
    }
}