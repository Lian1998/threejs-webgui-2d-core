module.exports = {

    "*.{js,jsx,vue,ts,tsx,json,css,scss,sass,less,html}": async (fileAbsPaths) => {
        
        const commandsRes = []; // 存储指令集

        // 使用prettier对所有的匹配的文件进行自动格式化
        commandsRes.push(`npx prettier --write ${fileAbsPaths.join(" ")}`);

        // 重新保存回stage缓冲区
        commandsRes.push(`git add ${fileAbsPaths.join(" ")}`);
        
        return commandsRes;
    }
}