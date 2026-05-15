# Claude Code 官方文档总结：Agent / Command / Skill

> 来源：Claude 官方文档  
> 整理时间：2025-12-29  
> 文档链接：
> - Skills: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
> - Slash Commands: https://code.claude.com/docs/en/slash-commands
> - Claude Code Skills: https://code.claude.com/docs/en/skills

---

## 🔍 总览对比表

| 维度 | **Skill** | **Slash Command** | **Agent 模式** |
|------|-----------|-------------------|----------------|
| **官方定义** | 可复用的知识包，教 Claude 如何完成特定任务 | 预定义的提示模板 | Claude 的自主执行模式 |
| **触发方式** | **Claude 自动选择**（根据请求语义匹配） | **手动输入** `/command` | 自动进行 |
| **配置文件** | `SKILL.md` | `.md` 文件 | 系统内置 |
| **位置** | `.claude/skills/` 或 `~/.claude/skills/` | `.claude/commands/` 或 `~/.claude/commands/` | - |
| **加载时机** | 按需加载（渐进式披露） | 触发时加载 | 始终可用 |

---

## 🧠 Agent Skills（技能）

### 官方定义

> **"Skills are modular capabilities that extend Claude's functionality."**  
> Skills 是扩展 Claude 能力的**模块化功能**。

> **"Skills are reusable, filesystem-based resources that provide Claude with domain-specific expertise: workflows, context, and best practices that transform general-purpose agents into specialists."**

### 核心特点

1. **Model-invoked（模型调用）**
   - Claude **自动决定**何时使用 Skill
   - 用户不需要显式调用
   - 根据请求语义匹配 Skill 的 `description`

2. **渐进式加载（Progressive Disclosure）**
   | Level | 加载时机 | Token 消耗 | 内容 |
   |-------|----------|-----------|------|
   | Level 1: Metadata | 始终加载（启动时） | ~100 tokens/Skill | YAML frontmatter 中的 name 和 description |
   | Level 2: Instructions | Skill 触发时 | <5k tokens | SKILL.md 主体内容 |
   | Level 3+: Resources | 按需加载 | 无限制 | 捆绑文件，通过 bash 执行 |

3. **存放位置**
   | 位置 | 路径 | 适用范围 |
   |------|------|----------|
   | 企业级 | 托管设置 | 组织所有用户 |
   | 个人 | `~/.claude/skills/` | 你，跨所有项目 |
   | 项目 | `.claude/skills/` | 仓库内所有人 |
   | 插件 | 随插件捆绑 | 安装插件的用户 |

### 工作流程

1. **Discovery（发现）**：启动时加载每个 Skill 的 name 和 description
2. **Activation（激活）**：请求匹配 Skill 描述时，Claude 请求使用该 Skill
3. **Execution（执行）**：Claude 遵循 Skill 指令，按需加载引用文件或运行脚本

### SKILL.md 结构

```markdown
---
name: your-skill-name          # 必填，最多64字符
description: 描述 + 何时使用   # 必填，最多1024字符
---

# Your Skill Name

## Instructions
[Claude 遵循的指令]

## Examples
[具体使用示例]
```

**字段要求：**
- `name`：最多64字符，仅小写字母、数字和连字符，不能包含 XML 标签或保留词（"anthropic"、"claude"）
- `description`：非空，最多1024字符，应包含 Skill 的功能和使用时机

### 预构建 Skills

官方提供以下预构建 Agent Skills：
- **PowerPoint (pptx)**：创建演示文稿、编辑幻灯片
- **Excel (xlsx)**：创建电子表格、数据分析
- **Word (docx)**：创建文档、编辑内容
- **PDF (pdf)**：生成格式化的 PDF 文档

---

## ⚡ Slash Commands（命令）

### 官方定义

> **"Custom slash commands allow you to define frequently used prompts as Markdown files that Claude Code can execute."**  
> 自定义斜杠命令允许你将常用提示定义为 Markdown 文件，供 Claude Code 执行。

### 核心特点

1. **手动触发**
   - 用户输入 `/command-name` 执行
   - 不是自动触发的

2. **命令类型**
   | 类型 | 路径 | 显示标记 | 说明 |
   |------|------|----------|------|
   | 项目命令 | `.claude/commands/` | (project) | 与团队共享 |
   | 个人命令 | `~/.claude/commands/` | (user) | 跨所有项目可用 |

3. **命名空间**
   - 使用子目录分组相关命令
   - 例：`.claude/commands/frontend/component.md` 创建 `/component`，显示为 "(project:frontend)"

### 参数支持

| 参数 | 说明 |
|------|------|
| `$ARGUMENTS` | 捕获所有传入的参数 |
| `$1`, `$2`, `$3`... | 位置参数 |

### 示例

**创建命令：**
```bash
# 项目命令
mkdir -p .claude/commands
echo "Analyze this code for performance issues:" > .claude/commands/optimize.md

# 个人命令
mkdir -p ~/.claude/commands
echo "Review this code for security vulnerabilities:" > ~/.claude/commands/security-review.md
```

**带参数的命令：**
```markdown
# .claude/commands/fix-issue.md
Fix issue #$1 following our coding standards with priority $2
```

**使用：**
```bash
/fix-issue 123 high
# $1 = "123", $2 = "high"
```

### 内置命令（部分）

| 命令 | 用途 |
|------|------|
| `/clear` | 清除对话历史 |
| `/compact` | 压缩对话 |
| `/config` | 打开设置 |
| `/cost` | 显示 token 使用统计 |
| `/help` | 获取帮助 |
| `/init` | 初始化项目 CLAUDE.md |
| `/model` | 选择或更换模型 |
| `/review` | 请求代码审查 |

---

## 🔗 官方对比表

| 使用场景 | 当你想要... | 运行时机 |
|----------|------------|----------|
| **Skills** | 给 Claude 专业知识（如"用我们的标准审查 PR"） | Claude 自动选择 |
| **Slash commands** | 创建可复用提示（如 `/deploy staging`） | 你输入 `/command` |
| **CLAUDE.md** | 设置项目级指令（如"使用 TypeScript 严格模式"） | 每次对话加载 |
| **Subagents** | 委托任务到隔离的上下文 | Claude 委托或手动调用 |
| **Hooks** | 在事件时运行脚本（如保存时 lint） | 特定工具事件触发 |
| **MCP servers** | 连接外部工具和数据源 | Claude 按需调用 |

### Skills vs Commands 关键区别

- **Skills**：Claude 根据请求语义**自动选择**使用
- **Commands**：用户**手动输入** `/command` 触发

### Skills vs MCP

- **Skills**：告诉 Claude **如何**使用工具
- **MCP**：**提供**工具本身

---

## 🏗️ 协作关系

```
┌─────────────────────────────────────────────┐
│                   Agent                      │
│        (自主执行模式，理解意图并规划)          │
└───────────────────┬─────────────────────────┘
                    │ 调用
                    ▼
┌─────────────────────────────────────────────┐
│                 Commands                     │
│   /wechat-share  /git-push  /wechat-insight │
│         (预定义工作流，快捷触发)              │
└───────────────────┬─────────────────────────┘
                    │ 引用
                    ▼
┌─────────────────────────────────────────────┐
│                  Skills                      │
│         wechat-article-writer               │
│      (能力定义、知识规则、写作指南)           │
└─────────────────────────────────────────────┘
```

---

## 🎯 实际应用建议

### 什么时候用 Skill？
✅ **给 Claude 持久化的知识/规则**
- PR 审查标准
- 代码风格指南
- 数据库 schema
- 写作规范
- 领域专业知识

### 什么时候用 Command？
✅ **创建快捷工作流/模板**
- 部署流程：`/deploy staging`
- 生成模板：`/wechat-share`
- Git 操作：`/git-push main`
- 代码审查：`/review`

### 最佳实践目录结构

```
.claude/
├── commands/           # ← 快捷命令（手动触发）
│   ├── git-push.md    
│   ├── git-pull.md
│   └── wechat-share.md
└── skills/             # ← 知识包（自动应用）
    └── wechat-article-writer/
        ├── SKILL.md
        └── guides/
            ├── writing-style.md
            └── article-types.md
```

---

## 📋 安全注意事项

官方建议：
- 仅使用来自**可信来源**的 Skills（自己创建或 Anthropic 官方提供）
- 第三方 Skills 可能导致数据泄露或未授权访问
- 外部 URL 获取数据的 Skills 风险更高
- **像安装软件一样对待 Skills**

---

## 📚 参考链接

- [Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Agent Skills Quickstart](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart)
- [Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [Slash Commands](https://code.claude.com/docs/en/slash-commands)
- [Skills Cookbook](https://github.com/anthropics/claude-cookbooks/tree/main/skills)

