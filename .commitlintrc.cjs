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
        "header-max-length": ["error", "always", 108], // header上最大108字符
        "type-enum": [
            "error",
            "always",
            [

                // 新增特性
                "feat",

                // 修补代码
                "fix",

                // 性能优化
                "perf",

                // 其他修改
                "chore",

                // 文档注释
                "docs",

                // 回退版本
                "revert",

                // 代码重构
                "refactor",

                // 测试用例
                "test",

                // 线上热修
                "hotfix",

                // 构建管线
                "build",

                // 持续集成
                "ci",
            ],
        ],
    },
};
