module.exports = {
    requirePragma: false,   // 是否只校验包含头注释文件
    insertPragma: false,    // 是否插入头注释
    tabWidth: 4,            // tabSize
    printWidth: 320,        // 行长度
    semi: true,             // 句子结尾使用分号
    singleQuote: false,     // 使用单引号
    bracketSpacing: true,   // 闭合标签前后插入空格
    bracketSameLine: true,  // 闭合标签的后一个不换行
    arrowParens: "always",  // 箭头函数参数强制加括号
    proseWrap: "never",     // 非代码长文本的空白处理, 如html中写了大量文字
    experimentalTernaries: false,   // 优化三元表达式
    quoteProps: "as-needed",        // 属性名是否需要添加引号
    trailingComma: "all",   // 行尾逗号
    useTabs: false,         // tab时使用tabs还是空格

    // JavaScript XML
    embeddedLanguageFormatting: "auto",     // JavaScript XML 语言格式化策略, auto尝试, off关闭
    htmlWhitespaceSensitivity: "strict",    // 对Html中空格的处理, strict意味着不会无故删除空格
    vueIndentScriptAndStyle: false,         // Vue文件的script和style标签缩进
    jsxSingleQuote: false,                  // jsx使用单引号
    singleAttributePerLine: false,          // jsx属性是否独占一行

};
