# 离线示例字体

`NotoSansSC-demo.woff2` 和 `NotoSansSC-ui.woff2` 是 Google Fonts 官方服务生成的 Noto Sans SC 400 字重子集, 于 2026-10-13 下载. 字体使用 SIL Open Font License 1.1, 完整许可保存在 `OFL.txt`.

- 字体项目: [Google Fonts Noto Sans SC](https://github.com/google/fonts/tree/main/ofl/notosanssc).
- 官方许可: [OFL.txt](https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/OFL.txt).
- 官方子集接口: [Google Fonts CSS API](https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400).
- 请求的完整字符集合: `demo-coverage.txt`. 精确下载 URL 和文件摘要记录在 `source.json`.
- 调试DOM/GUI界面另使用 `ui-coverage.txt`, `NotoSansSC-ui.woff2` 和 `debug-ui.css`, 来源记录在 `ui-source.json`. 仅调试页面加载此CSS, 不进入SDK生产库.

示例通过本地 `/fonts/NotoSansSC-demo.woff2` 加载, 不引用 Google Fonts CSS 或远程字体. 这是明确限定字符集合的示例资源, 业务项目需要提供自己的完整离线中文字体, 或配置有 coverage 的本地 fallback.

重新取得子集时, 为 CSS API 传入 `family=Noto Sans SC:wght@400` 和 `text=demo-coverage.txt` 的内容, 使用支持 WOFF2 的浏览器 User-Agent, 再下载返回的 fonts.gstatic.com URL. 不改变字体内部名称, 保留 OFL 许可.
