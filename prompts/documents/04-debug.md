# 独立调试单元

## 启动与检查

在项目根目录执行 `npm run dev`, 访问 `http://localhost:8056/debug/index.html`. 每页打开后自动执行自身检查并显示 PASS/FAIL, 无需点击按钮或接入真实业务接口.

```bash
npm run typecheck:debug-units
npm run build:debug:units
```

独立构建输出到 `dist-debug-units`. 它包含当前 refactor 页面及索引, 历史区链接只在开发服务或全量 debug 产物可用. 独立单元产物与包含历史 demo 的 `build:debug` 分开. 预览可以执行 `npm exec vite preview -- --mode debug-units`, 然后访问终端显示地址下的 `/debug/index.html`.

生产构建中的共享 chunk 属于打包器正常复用. 判断测试是否独立应看 HTML 的源码入口和测试内容, 不是要求浏览器绝不共享 Three.js 的打包代码.

## 目录与职责

```text
multi-pages/debug/refactor/<name>.html
  -> core/debug/units/<name>.ts  # 本模块案例和检查, 每页一个入口
  -> core/debug/units/harness.ts # 仅页面外壳, 输出和清理
```

harness 不导入 Viewer 或其他测试入口, 不根据 pathname 切换模块. 各入口直接导入被测模块, 渲染单元允许少量相同初始化代码. `window.__WEBGUI_UNIT__` 提供当前页 ready/errors/checks, 不暴露其他单元.

`core/debug/refactor/index.ts` 是原有完整模拟场景的旧脚本, 保留已有编辑但新 HTML 不再引用它. `PerformanceObserver.ts` 作为采样工具继续使用. 老 MeshLine/SDFText2D 等历史 HTML 保留在索引的历史区.

| HTML / TS 名称 | 自动检查重点                              | 运行环境                               |
| -------------- | ----------------------------------------- | -------------------------------------- |
| viewport       | 大坐标换算, project/unproject 往返        | CPU, 不创建 renderer                   |
| scheduler      | RAF 合并, flush/render 顺序, 连续帧与暂停 | 注入确定性时钟与队列                   |
| primitives     | 部分 patch, 不可变快照, ID 生命周期       | 注册表/工厂, 无 GPU                    |
| layers         | 图层顺序, 隐藏, LOD                       | 最小重叠多边形 + GPU                   |
| resources      | 并发去重, 独立 lease, 取消和最后释放      | ResourceStore, 无图片字体              |
| batching       | 连续同类合批, 插入异类拆分, 改色局部上传  | 多边形 + 一条线                        |
| polygons       | 三角形面积, 孔洞, MultiPolygon 区域       | 多边形 + GPU                           |
| lines          | 虚线实段/间隙, 重复点, 退化路径删除       | 线 + GPU                               |
| sprite-atlas   | 区域复用, 注销后已有 lease, 图集预览      | Canvas2D, DataTexture, 不创建 renderer |
| sprites        | 图片透明中心, bounds, 实例变换            | 一张本地 SVG + GPU                     |
| font-atlas     | 同字复用, 追加 UV 稳定, SDF 页预览        | FontFace/TinySDF/Canvas2D              |
| text           | 单标签准备, setText 异步布局              | 本地字体 + GPU                         |
| picking        | 孔洞穿透, bounds, 优先级, 过滤, 异步读回  | 最小 polygon + sprite                  |
| interaction    | 程序化 owner/part 选择和删除              | 无需真实指针点击                       |
| motion         | 半程位置/角度, 最短旋转, 令牌释放         | 确定性时钟, 无 GPU                     |
| composition    | 父矩阵, 跨层归属, 分离和销毁              | 最小多边形与路径                       |
| debug-gui      | 自动注册, 元数据和代理 setter             | 一个图元 + lil-gui                     |
| performance    | 静态零属性上传, 单图元更新, 帧摘要        | 同类多边形, `?count=512` 调整负载      |
| delivery       | 实际公开入口创建和幂等销毁                | 最小设备, 检查后移除 canvas            |

资源页和插帧页空白场景区是正常的, 以右侧结果为准. delivery 页面完成释放检查后不保留 canvas. 所有资源和观察监听均登记清理, pagehide/HMR 时按反序释放.

## 验证边界

独立单元的类型检查和多入口构建用于检查模块边界及依赖解析. 页面中的 GPU/字体断言需要具备 WebGL2 和 FontFace 的浏览器实际打开才会执行. 构建成功不等于这些浏览器断言已经通过, 不以 FPS 或 GPU 性能作交付承诺.

项目原有 `typecheck:core` 包含历史迁移错误, 如 `@core/Mixins`, `@core/Sprite2D` 和 `../public` 的旧路径. 现有全量 `build:debug` 会受其影响. 独立单元命令有明确范围, 不掩盖旧脚本错误. 历史页仍需后续按实际需求迁移.

## 本次检查记录

- `typecheck:debug-units` 通过.
- `build:debug:units` 通过, 输出 19 个独立单元页面和索引.
- 坐标, 调度, 图元, 资源和插帧共 21 条 CPU 断言通过; 复用已有 7 组几何与生命周期检查通过.
- 29 个核心文件的注释修改经去除注释后编译比对, 输出 JavaScript 与修改前相同.
- 全量 `typecheck:core` 修改前后均有 163 条既有错误, 没有新增错误.
- 未执行浏览器点击验证, 也未在本轮运行字体和 GPU 的浏览器断言.
