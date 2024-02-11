// commitlint 等级
// 关闭: "off"
// 警告: "warn"
// 错误: "error"

module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "body-leading-blank": ["error", "always"], // body上面有换行
        "footer-leading-blank": ["error", "always"], // footer上面有换行
        "header-max-length": ["error", "always", 108], // header上最大108字符
        "type-enum": [
            "error",
            "always",
            [
                // 新增特性, 修补代码, 文档注释
                "feat",
                "fix",
                "docs",

                // 性能优化, 代码重构
                "perf",
                "refactor",

                // 测试用例
                "test",

                // 线上热修
                "hotfix",

                // 构建管线配置
                "build",

                // 持续集成配置
                "ci",
            ],
        ],
    },
};
