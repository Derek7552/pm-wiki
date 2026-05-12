# Claude Code 扩展机制：Subagents / Hooks / Plugins

> 来源：Claude 官方文档  
> 整理时间：2025-12-29  
> 文档链接：
> - Subagents: https://code.claude.com/docs/en/sub-agents
> - Hooks Guide: https://code.claude.com/docs/en/hooks-guide
> - Plugins: https://code.claude.com/docs/en/plugins

---

## 📊 总览对比表

| 维度 | **Subagent** | **Hooks** | **Plugins** |
|------|--------------|-----------|-------------|
| **定义** | 专门化的 AI 助手 | 生命周期事件的 Shell 命令 | 可分享的功能扩展包 |
| **触发方式** | Claude 自动委托或手动调用 | 特定事件自动触发 | 安装后自动可用 |
| **配置位置** | `.claude/agents/` 或 `~/.claude/agents/` | `settings.json` | `.claude-plugin/plugin.json` |
| **用途** | 任务隔离、专业领域处理 | 自动化操作、确定性控制 | 打包分享功能 |

---

## 🤖 Subagents（子代理）

### 官方定义

> **"Subagents are pre-configured AI personalities that Claude Code can delegate tasks to."**  
> Subagents 是预配置的 AI 角色，Claude Code 可以将任务委托给它们。

> **"Custom subagents in Claude Code are specialized AI assistants that can be invoked to handle specific types of tasks. They enable more efficient problem-solving by providing task-specific configurations with customized system prompts, tools and a separate context window."**

### 核心特点

每个 Subagent：
- 有特定的目的和专业领域
- 使用独立于主对话的上下文窗口
- 可配置允许使用的工具
- 包含指导行为的自定义系统提示

当 Claude Code 遇到匹配 Subagent 专业领域的任务时，可以将该任务委托给专门的 Subagent，它独立工作并返回结果。

### 关键优势

| 优势 | 说明 |
|------|------|
| **Context preservation（上下文保留）** | 每个 Subagent 在自己的上下文中工作，防止污染主对话，保持专注于高级目标 |
| **Specialized expertise（专业化）** | 可针对特定领域进行详细指令调优，提高指定任务的成功率 |
| **Reusability（可复用）** | 一次创建，跨不同项目使用，可与团队共享 |
| **Flexible permissions（灵活权限）** | 每个 Subagent 可有不同工具访问级别，将强大工具限制在特定类型 |

### 存放位置

| 类型 | 路径 | 范围 | 优先级 |
|------|------|------|--------|
| 项目级 | `.claude/agents/` | 当前项目可用 | 最高 |
| 用户级 | `~/.claude/agents/` | 所有项目可用 | 较低 |
| CLI 定义 | `--agents` JSON 参数 | 当前会话 | 中等 |
| 插件提供 | Plugin 的 `agents/` 目录 | 安装插件的用户 | - |

当 Subagent 名称冲突时，项目级优先于用户级。

### 文件格式

Subagent 以带 YAML frontmatter 的 Markdown 文件定义：

```markdown
---
name: your-sub-agent-name
description: Description of when this subagent should be invoked
tools: tool1, tool2, tool3    # 可选 - 不填则继承主线程所有工具
model: sonnet                  # 可选 - 模型别名或 'inherit'
permissionMode: default        # 可选 - 权限模式
skills: skill1, skill2         # 可选 - 自动加载的 Skills
---

Your subagent's system prompt goes here. This can be multiple paragraphs
and should clearly define the subagent's role, capabilities, and approach
to solving problems.

Include specific instructions, best practices, and any constraints
the subagent should follow.
```

### 配置字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 唯一标识符，使用小写字母和连字符 |
| `description` | ✅ | Subagent 用途的自然语言描述 |
| `tools` | ❌ | 逗号分隔的工具列表。省略则继承主线程所有工具 |
| `model` | ❌ | 使用的模型。可以是别名（sonnet, opus, haiku）或 'inherit' 使用主对话模型 |
| `permissionMode` | ❌ | 权限模式：default, acceptEdits, bypassPermissions, plan, ignore |
| `skills` | ❌ | 逗号分隔的 Skill 名称，Subagent 启动时自动加载。Subagent 不继承父对话的 Skills |

### CLI 定义方式

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### 使用方式

```bash
# 打开 Subagent 管理界面
/agents

# Claude 自动使用或显式调用
> Use the code-reviewer subagent to check my recent changes
```

### 快速开始

1. 运行 `/agents`
2. 选择 'Create New Agent'
3. 选择项目级或用户级
4. 描述 Subagent 详情（推荐先用 Claude 生成，再自定义）
5. 选择授予的工具
6. 保存使用

---

## 🪝 Hooks（钩子）

### 官方定义

> **"Claude Code hooks are user-defined shell commands that execute at various points in Claude Code's lifecycle."**  
> Hooks 是用户定义的 Shell 命令，在 Claude Code 生命周期的不同阶段执行。

> **"Hooks provide deterministic control over Claude Code's behavior, ensuring certain actions always happen rather than relying on the LLM to choose to run them."**

### 核心特点

- **确定性控制**：确保某些操作**始终发生**，而不是依赖 LLM 选择运行
- **自动执行**：在特定事件触发时自动运行
- **Shell 命令**：可执行任意 Shell 脚本

通过将规则编码为 Hooks 而非提示指令，你将建议转变为每次预期运行时都会执行的应用级代码。

### 使用场景

| 场景 | 说明 |
|------|------|
| **Notifications（通知）** | 自定义 Claude Code 等待输入或权限时的通知方式 |
| **Automatic formatting（自动格式化）** | 编辑后运行 `prettier`（.ts）、`gofmt`（.go）等 |
| **Logging（日志）** | 跟踪和计数所有执行的命令，用于合规或调试 |
| **Feedback（反馈）** | Claude Code 生成不符合代码库规范的代码时提供自动反馈 |
| **Custom permissions（自定义权限）** | 阻止对生产文件或敏感目录的修改 |

### 可用事件

| 事件 | 触发时机 | 能力 |
|------|----------|------|
| `PreToolUse` | 工具调用**前** | 可阻止工具调用 |
| `PermissionRequest` | 显示权限对话框时 | 可允许或拒绝 |
| `PostToolUse` | 工具调用**后** | - |
| `UserPromptSubmit` | 用户提交提示后、Claude 处理前 | - |
| `Notification` | Claude Code 发送通知时 | - |
| `Stop` | Claude Code 完成响应时 | - |
| `SubagentStop` | Subagent 任务完成时 | - |
| `PreCompact` | 压缩操作前 | - |
| `SessionStart` | 新会话开始或恢复时 | - |
| `SessionEnd` | 会话结束时 | - |

每个事件接收不同数据，可以不同方式控制 Claude 的行为。

### 配置格式

存储在 `~/.claude/settings.json` 或项目设置中：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "your-shell-command"
          }
        ]
      }
    ]
  }
}
```

### 示例

**日志记录 Bash 命令：**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '\"\\(.tool_input.command) - \\(.tool_input.description // \"No description\")\"' >> ~/.claude/bash-command-log.txt"
          }
        ]
      }
    ]
  }
}
```

**编辑后自动格式化 TypeScript：**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | { read file_path; if echo \"$file_path\" | grep -q '\\.ts$'; then npx prettier --write \"$file_path\"; fi; }"
          }
        ]
      }
    ]
  }
}
```

### 使用方式

```bash
# 打开 Hooks 配置界面
/hooks

# 选择事件类型 → 添加 matcher → 添加 hook 命令 → 保存
```

### ⚠️ 安全注意事项

> **警告**：你必须在添加 Hooks 时考虑安全影响，因为 Hooks 在代理循环中使用当前环境的凭据自动运行。例如，恶意 Hooks 代码可能泄露你的数据。始终在注册前审查你的 Hooks 实现。

---

## 🧩 Plugins（插件）

### 官方定义

> **"Plugins let you extend Claude Code with custom functionality that can be shared across projects and teams."**  
> 插件让你扩展 Claude Code 的自定义功能，可跨项目和团队分享。

> **"Create custom plugins to extend Claude Code with slash commands, agents, hooks, Skills, and MCP servers."**

### 核心特点

- **打包分发**：将 Commands、Agents、Skills、Hooks、MCP Servers 打包在一起
- **命名空间**：避免多插件命令冲突（如 `/my-plugin:hello`）
- **版本控制**：语义化版本管理
- **可分享**：团队共享、社区分发、市场发布

### 何时用 Plugin vs 独立配置

| 方式 | 命令名称 | 适用场景 |
|------|----------|----------|
| **独立配置** (`.claude/` 目录) | `/hello` | 个人工作流、项目特定定制、快速实验 |
| **Plugin** (含 `.claude-plugin/plugin.json`) | `/plugin-name:hello` | 团队分享、社区分发、版本发布、跨项目复用 |

**使用独立配置当：**
- 为单个项目自定义 Claude Code
- 配置是个人的，不需要分享
- 在打包前实验命令或 Hooks
- 想要短命令名如 `/hello` 或 `/review`

**使用 Plugin 当：**
- 想与团队或社区分享功能
- 需要跨多个项目使用相同命令/Agents
- 想要版本控制和方便的扩展更新
- 通过市场分发
- 接受命名空间命令如 `/my-plugin:hello`（命名空间防止插件间冲突）

### 目录结构

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json       # 必需：插件清单
├── commands/             # 可选：斜杠命令
│   └── hello.md
├── agents/               # 可选：Subagents
│   └── reviewer.md
├── skills/               # 可选：Skills
│   └── my-skill/
│       └── SKILL.md
├── hooks.json            # 可选：Hooks 配置
└── mcp-servers/          # 可选：MCP 服务器
```

### plugin.json 清单

```json
{
  "name": "my-first-plugin",
  "description": "A greeting plugin to learn the basics",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

| 字段 | 说明 |
|------|------|
| `name` | 唯一标识符，作为斜杠命令命名空间前缀（如 `/my-first-plugin:hello`） |
| `description` | 在插件管理器中浏览或安装时显示 |
| `version` | 使用语义化版本跟踪发布 |
| `author` | 可选，用于归属 |

其他可选字段：`homepage`、`repository`、`license`

### 插件可包含的组件

- ✅ **Slash Commands**：`commands/` 目录中的 Markdown 文件
- ✅ **Agents**：`agents/` 目录中的 Subagent 定义
- ✅ **Skills**：`skills/` 目录中的 SKILL.md 文件
- ✅ **Hooks**：`hooks.json` 配置文件
- ✅ **MCP Servers**：MCP 服务器连接

### 命令示例

创建命令 `my-plugin/commands/hello.md`：

```markdown
---
description: Greet the user with a friendly message
---

# Hello Command

Greet the user warmly and ask how you can help them today.
```

### 使用方式

```bash
# 测试插件（开发时）
claude --plugin-dir ./my-plugin

# 管理已安装插件
/plugin

# 使用插件命令
/my-plugin:hello

# 查看帮助，会列出插件命令
/help
```

### 快速开始

1. 创建插件目录：`mkdir my-first-plugin`
2. 创建清单：`mkdir my-first-plugin/.claude-plugin` 并创建 `plugin.json`
3. 添加命令：创建 `commands/` 目录和 Markdown 文件
4. 测试：`claude --plugin-dir ./my-first-plugin`
5. 运行命令：`/my-first-plugin:hello`

---

## 🔗 各概念关系图

```
┌─────────────────────────────────────────────────────────┐
│                      Plugins                             │
│        (可分享的功能扩展包，包含以下组件)                  │
└───────────────────────┬─────────────────────────────────┘
                        │ 包含
         ┌──────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Commands   │ │  Subagents  │ │   Skills    │ │    Hooks    │
│ (快捷命令)   │ │ (专业助手)   │ │ (知识能力)   │ │ (生命周期)   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
      │              │              │              │
      │              │              │              │
      ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                           │
│               (集成所有扩展，统一体验)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 选择指南

| 需求 | 使用 |
|------|------|
| 需要隔离上下文处理特定任务 | **Subagent** |
| 需要在特定事件时自动执行操作 | **Hooks** |
| 需要分享功能给团队/社区 | **Plugin** |
| 需要给 Claude 专业知识（自动触发） | **Skill** |
| 需要快捷触发工作流（手动触发） | **Command** |

### 组合使用示例

**场景：团队代码审查工作流**

1. **Plugin** 打包所有功能
2. **Subagent** `code-reviewer`：专门的代码审查 AI 助手
3. **Skill** `coding-standards`：团队编码标准知识
4. **Command** `/review`：快速触发审查
5. **Hooks** `PostToolUse`：审查后自动格式化代码

---

## 📚 官方文档链接

- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Create Plugins](https://code.claude.com/docs/en/plugins)
- [Discover and Install Plugins](https://code.claude.com/docs/en/discover-plugins)
- [Plugins Reference](https://code.claude.com/docs/en/plugins-reference)

---

## 相关文档

- [claude-agent-command-skill-comparison.md](./claude-agent-command-skill-comparison.md) - Agent / Command / Skill 对比

