# 思路
插件地址: https://github.com/ahujasid/mcp-for-blender

**工作原理**:  
windows软件: Blender 4.2 LTS   
→ MCP服务(对接OpenAI转电脑操控): mcp-for-blender  
→ OpenAI CLI 走 MCP服务: Codex | Claude Code | Cursor | VS Code  

**对于Blender的工作原理:**  
`Agent → MCP → execute_blender_code → Blender Python (bpy)`, 即
通过Agent理解任务, 生成bpy, 然后再通过Agent调用MCP服务来完成任务  

```raw
Windows
┌──────────────────────────────┐
│ Blender 4.2 LTS              │
│   MCP for Blender Add-on     │
│   TCP Server :9876           │
└──────────────▲───────────────┘
               │ TCP
               │ 9876
┌──────────────┴───────────────┐
│ WSL2 / Ubuntu                │
│                              │
│ Codex CLI                    │
│    ↓ MCP STDIO               │
│ uvx mcp-for-blender          │
└──────────────────────────────┘
```

# 安装 Windows 部分

我走的是 `Windows (直接PowerShell安装获取权限)` `irm https://www.mcp-for-blender.com/install.ps1 | iex`(这里官方说2026年服务名更新为`mcp-for-blender`, 以前是`blender-mcp`)  
然后用uvx管理(本机python软件)这个插件 `winget install --id=astral-sh.uv -e && uvx mcp-for-blender setup`
```
Blender addon:
  Installed the addon to C:\Users\*\AppData\Roaming\Blender Foundation\Blender\4.2\scripts\addons\blender_mcp.py
  Couldn't find Blender to enable the addon. In Blender: Edit → Preferences → Add-ons → search "MCP for Blender" → tick the box.

Next:
  • Open Blender. The addon starts its server on launch (MCP for Blender tab, press N).
  • Then ask your assistant to build something in Blender.
```

要启动一下blender手动安装一下本地装好的 mcp-for-blender 插件, **记得要在插件的配置页面里启用远程监听功能并且填写 `127.0.0.1`**; 然后在blender打开的情况 powershell 测试一下 `netstat -ano | findstr ":9876"` **试试是否插件启动了端口监听**; 


# 安装 WSL2 部分

```bash
# 更apt
sudo apt update

# 装依赖
sudo apt install -y curl ca-certificates netcat-openbsd

# 装uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 加载环境变量
source "$HOME/.local/bin/env"

# 验证
uv --version
uvx --version
which uvx
# 通常安装路径 /home/<username>/.local/bin/uvx

# 装 python
uv python install 3.12
python3 --version
uv python list --only-installed
```

# 配置 WSL2 与 Windows 的网络通信

**1. 配置WSL2 Mirrored**  **!!这步建议直接用 Windows 提供的最新的 `WSL Settings.exe`**  

`notepad "$env:USERPROFILE\.wslconfig"`

>`$env:USERPROFILE` 是 Windows PowerShell 的环境变量写法
在 `PowerShell` 中:  
`$env:` 用来读取环境变量  
`USERPROFILE` 通常是你的 Windows 用户目录，例如 `C:\Users\Alice ` 
所以 `"$env:USERPROFILE\.wslconfig"` 会展开成类似 `C:\Users\Alice\.wslconfig`  

在wsl中测试当前是否处于mirrored `nc -vz -w 3 127.0.0.1 9876` `Connection to 127.0.0.1 9876 port [tcp/*] succeeded!`

**2.将WSL2上的MCP服务注册到CodexCLI启动项**  

**直接文本配置** `vim ~/.codex/config.toml`
```
[mcp_servers.blender]
command = "/home/YOUR_USERNAME/.local/bin/uvx"
args = ["--python", "3.12", "mcp-for-blender"]
enabled = true
startup_timeout_sec = 120
tool_timeout_sec = 180

[mcp_servers.blender.env]
BLENDER_HOST = "127.0.0.1"
BLENDER_PORT = "9876"
```

**或者命令行配置(不推荐, 幺蛾子多)**
```bash
codex mcp add blender \
  --env BLENDER_HOST=127.0.0.1 \
  --env BLENDER_PORT=9876 \
  -- "$(command -v uvx)" --python 3.12 mcp-for-blender

codex mcp list
codex mcp get blender
```

# 验证与使用
直接在Codex的CLI里用, 或者vscode的codex Agent工具里问
`请使用 Blender MCP 的 get_scene_info 工具读取当前 Blender 场景，返回场景中的所有对象、对象类型、坐标以及材质信息。不要修改任何对象。` 第一次问有很多权限需要授权(如果 Codex Agent 运行在Bubble里)

https://github.com/ahujasid/mcp-for-blender?utm_source=chatgpt.com#capabilities