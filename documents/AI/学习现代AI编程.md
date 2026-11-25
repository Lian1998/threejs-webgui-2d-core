https://ai.codefather.cn/library/2010974737915121665

`传统手工编程` 一般实现流程为 理解业务, 整理逻辑, 查API文档实现算法

`Vibe Coding` 大语言模型问世的时候就一直用了, 基本就是算法文字版本直接生成代码, 可以省下查API的时间

`Agentic Engineering` (当一个业务逻辑比较大时) 强调优化提示词并把大型任务拆分成小的步骤

`Agentic Coding` (在纯文本大模型基础上) 强调通过对话自动读取文件上下文内容

`Harness Engineering` 强调通过一系列管线配置完成对AI项目的管控

`Multi Agent` 强调多模态

`Orchestration` 强调多模态模型下模型之间的调用编排

# AGENTS.md

1. 放在项目根目录下, 如果是monorepo, 那么可以每个repo放一个
2. 没有强制schema, 通常保留这几类就够了：Project overview、Setup commands、Development workflow、Code style、Testing instructions、Security considerations、PR instructions。

# SKILL

一个 skill 是一个目录，目录里有一个 SKILL.md 文件，再可选附带 scripts/、references/、assets/ 等资源。SKILL.md 至少包含 name 和 description，然后写具体执行说明


```text
repo/
├── AGENTS.md
├── .agents/
│   └── skills/
│       ├── frontend-ui/
│       │   └── SKILL.md
│       ├── react-component/
│       │   └── SKILL.md
│       ├── accessibility-review/
│       │   └── SKILL.md
│       └── performance-review/
│           └── SKILL.md
└── src/

```
Codex 会从当前目录向仓库根目录扫描 .agents/skills，也支持用户级目录 $HOME/.agents/skills。仓库内的 .agents/skills 适合团队共享，用户级目录适合个人常用 skill
(前端项目不要只写一个巨大 frontend skill。更好的方式是按任务拆)


## npm上的skills依赖包

https://github.com/vercel-labs/skills

skills 这个 npm 包不是前端运行时依赖。它是一个 Agent Skills 的 CLI / 包管理器，用来发现、安装、更新、删除 SKILL.md 类型的 AI agent 能力包。npm 页面把它描述为 “The CLI for the open agent skills ecosystem”，并给出的典型用法是 npx skills add vercel-labs/agent-skills

它管理的不是代码库里的业务依赖，而是给 Claude Code、Codex、Cursor、OpenCode 等 coding agent 用的技能说明。Vercel Labs 的 README 说明它支持 OpenCode、Claude Code、Codex、Cursor 等多种 agent，并支持从 GitHub shorthand、GitHub URL、GitLab URL、git URL、本地路径安装 skill

```bash
# 查找 skill
npx skills find react

# 安装某个 skill 仓库
npx skills add vercel-labs/agent-skills

# 只安装指定 skill
npx skills add vercel-labs/agent-skills --skill frontend-design

# 安装给指定 agent
npx skills add vercel-labs/agent-skills -a codex
npx skills add vercel-labs/agent-skills -a cursor

# 列出已安装的 skills
npx skills list

# 更新 skills
npx skills update

# 初始化一个新的 SKILL.md 模板
npx skills init frontend-ui
```