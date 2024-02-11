// commitlint 等级
// 关闭: "off"      0
// 警告: "warn"     1
// 错误: "error"    2

module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-case": ["off"],
        "type-empty": ["off"],
        "scope-empty": ["off"],
        "scope-case": ["off"],
        "subject-full-stop": ["off", "never"],
        "subject-case": ["off", "never"],
        "body-leading-blank": ["warn", "always"],
        "footer-leading-blank": ["warn", "always"],
        "header-max-length": ["error", "always", 108],
        "type-enum": [
            "error",
            "always",
            [
                "feat", // 新增特性
                "fix", // 修补代码
                "perf", // 性能优化
                "chore", // 其他修改
                "docs", // 文档注释
                "revert", // 回退版本
                "refactor", // 代码重构
                "test", // 测试用例
                "hotfix", // 线上热修
                "build", // 构建管线
                "ci", // 持续集成
            ],
        ],
    },
};
