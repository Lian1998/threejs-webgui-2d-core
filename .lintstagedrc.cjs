module.exports = {

    "*.{js,jsx,vue,ts,tsx,json,css,scss,sass,less,html}": async (fileAbsPaths) => {
        
        const commandsRes = []; // 存储指令集

        // 自动格式化文件
        commandsRes.push(`npx prettier --write .`);
        
        return commandsRes;
    }
}