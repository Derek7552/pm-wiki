# Claude Code Plugin & Marketplace - GitHub 仓库配置完整指南

> 记录如何创建、配置和发布符合官方规范的 Claude Code Plugin Marketplace
>
> 参考：anthropics/claude-plugins-official
>
> 实战案例：ai-pm-plugin (wechat-writer)
>
> 最后更新：2025-12-29

---

## 📑 目录

1. [核心概念](#核心概念)
2. [Marketplace 目录结构](#marketplace-目录结构)
3. [单 Plugin 目录结构](#单-plugin-目录结构)
4. [关键配置文件](#关键配置文件)
5. [本地开发环境设置](#本地开发环境设置)
6. [发布和安装流程](#发布和安装流程)
7. [常见问题和解决方案](#常见问题和解决方案)
8. [实战案例](#实战案例)

---

## 核心概念

### Plugin vs Marketplace

| 特性 | Plugin | Marketplace |
|------|--------|-------------|
| **定义** | 单个功能扩展 | 多个 plugins 的集合/目录 |
| **配置文件** | `plugin.json` | `marketplace.json` |
| **位置** | 可以独立存在 | 包含多个 plugins |
| **用户操作** | 安装 plugin | 添加 marketplace，然后安装其中的 plugin |
| **类比** | 一个 app | App Store |

### 两种仓库模式

#### 模式 1: 单 Plugin 仓库

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # 只有 plugin.json
├── commands/
├── agents/
└── skills/
```

**用途**：发布单个 plugin
**安装**：需要通过其他 marketplace 或 `--plugin-dir`

#### 模式 2: Marketplace 仓库（推荐，官方规范）

```
my-marketplace/
├── .claude-plugin/
│   └── marketplace.json     # 只有 marketplace.json
└── plugins/                 # 多个 plugins
    ├── plugin-a/
    │   ├── .claude-plugin/
    │   │   └── plugin.json  # 每个 plugin 有自己的 plugin.json
    │   ├── commands/
    │   └── ...
    └── plugin-b/
        ├── .claude-plugin/
        │   └── plugin.json
        └── ...
```

**用途**：发布多个 plugins 的集合
**安装**：用户添加 marketplace，然后选择安装 plugins

---

## Marketplace 目录结构

### 官方规范结构（参考 anthropics/claude-plugins-official）

```
ai-pm-plugin/                               # Marketplace 仓库根目录
├── .claude-plugin/
│   └── marketplace.json                    # ✅ Marketplace 元数据（必需）
├── plugins/                                # ✅ Plugins 目录
│   ├── wechat-writer/                      # Plugin 1
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json                 # ✅ Plugin 元数据
│   │   ├── commands/
│   │   │   ├── wechat-share.md
│   │   │   └── wechat-insight.md
│   │   ├── agents/
│   │   │   └── wechat-writer.md
│   │   ├── skills/
│   │   │   └── wechat-article-writer/
│   │   │       ├── SKILL.md
│   │   │       └── guides/
│   │   └── README.md                       # Plugin 文档
│   └── ui-reviewer/                        # Plugin 2（示例）
│       ├── .claude-plugin/
│       │   └── plugin.json
│       └── ...
├── external_plugins/                       # ⭐ 可选：第三方 plugins
│   └── community-plugin/
│       └── ...
├── .gitignore
├── LICENSE
└── README.md                               # Marketplace 文档
```

### 关键规则

1. **✅ 根目录**：
   - **只有 `marketplace.json`**，没有 `plugin.json`
   - 这是 marketplace 仓库的标志

2. **✅ Plugins 组织**：
   - 所有 plugins 必须在 `plugins/` 目录下
   - 每个 plugin 是独立的子目录

3. **✅ Plugin 独立性**：
   - 每个 plugin 有自己的 `.claude-plugin/plugin.json`
   - 每个 plugin 可以有自己的 README

4. **✅ 可扩展性**：
   - 可以轻松添加新 plugins 到 `plugins/` 目录
   - 可选的 `external_plugins/` 用于第三方贡献

---

## 单 Plugin 目录结构

### 标准 Plugin 目录（在 marketplace 中）

```
wechat-writer/                              # Plugin 根目录
├── .claude-plugin/
│   └── plugin.json                         # ✅ 必需：Plugin 元数据
├── commands/                               # Slash commands（可选）
│   ├── wechat-share.md                     # ✅ 必须有 frontmatter
│   └── wechat-insight.md
├── agents/                                 # Subagents（可选）
│   └── wechat-writer.md
├── skills/                                 # Skills（可选）
│   └── wechat-article-writer/
│       ├── SKILL.md
│       └── guides/
│           ├── article-types.md
│           └── writing-style.md
├── .mcp.json                               # MCP 服务器配置（可选）
├── README.md                               # Plugin 文档
└── LICENSE                                 # 许可证（可选）
```

### 关键规则

1. **`.claude-plugin/plugin.json`** - 必需
2. **`commands/`、`agents/`、`skills/`** - 可选，根据需要创建
3. **Commands 必须有 frontmatter** - 否则不会显示
4. **Claude Code 自动扫描** - 无需在 plugin.json 中声明目录

---

## 关键配置文件

### 1. marketplace.json（Marketplace 元数据）

**位置**：`<marketplace-root>/.claude-plugin/marketplace.json`

**作用**：定义 marketplace 和包含的 plugins 列表

```json
{
  "name": "ai-pm-tools",
  "description": "AI Product Manager toolkit plugins",
  "owner": {
    "name": "Derek7552",
    "email": "dameh0108@163.com"
  },
  "plugins": [
    {
      "name": "wechat-writer",
      "description": "WeChat article writing assistant",
      "version": "1.0.3",
      "author": {
        "name": "Derek7552",
        "email": "dameh0108@163.com"
      },
      "source": "./plugins/wechat-writer",
      "homepage": "https://github.com/Derek7552/ai-pm-plugin",
      "category": "productivity"
    },
    {
      "name": "another-plugin",
      "description": "Another plugin description",
      "version": "1.0.0",
      "source": "./plugins/another-plugin",
      "category": "development"
    }
  ]
}
```

#### Source 类型

| Source 类型 | 格式 | 用途 | 示例 |
|------------|------|------|------|
| **本地路径** | `"./plugins/name"` | Marketplace 内的 plugin | `"./plugins/wechat-writer"` |
| **GitHub URL** | `{"source": "url", "url": "...git"}` | 外部 GitHub 仓库 | `{"source": "url", "url": "https://github.com/...git"}` |
| **Git URL** | `{"source": "url", "url": "...git"}` | 其他 Git 托管 | GitLab, Bitbucket 等 |

#### 字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | ✅ | Marketplace 唯一名称 |
| `description` | ✅ | Marketplace 描述 |
| `owner` | ✅ | 所有者信息 |
| `plugins` | ✅ | Plugins 数组 |
| `plugins[].name` | ✅ | Plugin 名称（用于安装命令） |
| `plugins[].source` | ✅ | Plugin 源码位置 |
| `plugins[].version` | ✅ | Plugin 版本 |
| `plugins[].category` | ❌ | 分类（productivity, development, design 等） |

---

### 2. plugin.json（Plugin 元数据）

**位置**：`<plugin-root>/.claude-plugin/plugin.json`

**作用**：定义单个 plugin 的信息

```json
{
  "name": "wechat-writer",
  "description": "WeChat article writing assistant with specialized agents",
  "version": "1.0.3",
  "author": {
    "name": "Derek7552",
    "email": "dameh0108@163.com"
  },
  "homepage": "https://github.com/Derek7552/ai-pm-plugin",
  "repository": "https://github.com/Derek7552/ai-pm-plugin",
  "license": "MIT",
  "keywords": [
    "wechat",
    "writing",
    "article",
    "content",
    "productivity"
  ]
}
```

#### 重要注意事项

✅ **正确格式**：
- `"repository": "https://..."` - 必须是**字符串**
- **不要**添加 `commands`、`agents`、`skills` 字段（Claude Code 自动发现）

❌ **错误格式**（会导致验证失败）：
```json
{
  "repository": {           // ❌ 错误：对象格式
    "type": "git",
    "url": "https://..."
  },
  "commands": "./commands/", // ❌ 错误：不需要声明
  "agents": "./agents/",     // ❌ 错误：不需要声明
  "skills": "./skills/"      // ❌ 错误：不需要声明
}
```

#### 字段说明

| 字段 | 必需 | 类型 | 说明 |
|------|------|------|------|
| `name` | ✅ | string | Plugin 唯一名称 |
| `description` | ✅ | string | Plugin 描述 |
| `version` | ✅ | string | 版本号（语义化版本） |
| `author` | ✅ | object | 作者信息 |
| `homepage` | ❌ | string | 主页 URL |
| `repository` | ❌ | **string** | 仓库 URL（注意：必须是字符串） |
| `license` | ❌ | string | 许可证类型 |
| `keywords` | ❌ | array | 关键词 |

---

### 3. Command 文件格式（必需 frontmatter）

**位置**：`<plugin-root>/commands/<command-name>.md`

**格式**：

```markdown
---
description: 命令的简短描述（必需，显示在命令列表中）
---

# Command Title

详细的命令说明和使用指南...

## 使用方式

请提供：
1. 第一步
2. 第二步

## 示例

...
```

#### Frontmatter 规则

✅ **必须包含**：
```yaml
---
description: 简短描述命令的功能
---
```

❌ **缺少 frontmatter 会导致命令不显示**：
```markdown
# Command Title    ❌ 错误：缺少 frontmatter

Command content...
```

#### 命名规则

- **文件名**：`wechat-share.md`
- **实际命令**：`/wechat-writer:wechat-share`
- **格式**：`/<plugin-name>:<command-file-name-without-.md>`

---

### 4. Agent 文件格式

**位置**：`<plugin-root>/agents/<agent-name>.md`

```markdown
---
name: wechat-writer
description: Specialized WeChat article writing assistant
---

# WeChat Writer Agent

System prompt and instructions for the agent...

## 工具权限

- Read, Write, Edit
- WebFetch, WebSearch
- ...

## 工作流程

1. 收集信息
2. 分析内容
3. 创作文章
4. 保存结果
```

---

### 5. Skill 文件格式

**位置**：`<plugin-root>/skills/<skill-name>/SKILL.md`

```markdown
---
name: wechat-article-writer
description: Writing style guidelines for WeChat articles
---

# WeChat Article Writing Skill

## 写作风格

- 自然对话式语气
- 避免 AI 腔调
- ...

## 文章结构

### 开头
- 引入话题
- 吸引读者

### 正文
- 展开论述
- 具体案例

### 结尾
- 总结观点
- 行动号召
```

---

## 本地开发环境设置

### 方案：本地开发 + GitHub 分发

#### 步骤 1: Clone Marketplace 仓库

```bash
cd /Users/derek/derekrepo
git clone https://github.com/Derek7552/ai-pm-plugin.git
```

#### 步骤 2: 创建软链接（可选，方便开发）

```bash
# 链接整个 marketplace
ln -s /Users/derek/derekrepo/ai-pm-plugin ~/.claude/plugins/ai-pm-plugin

# 或链接单个 plugin
ln -s /Users/derek/derekrepo/ai-pm-plugin/plugins/wechat-writer ~/.claude/plugins/wechat-writer
```

#### 步骤 3: 本地修改和测试

##### 测试整个 Marketplace

```bash
# 使用 --plugin-dir 直接加载 marketplace
claude --plugin-dir /Users/derek/derekrepo/ai-pm-plugin
```

##### 测试单个 Plugin

```bash
# 只加载一个 plugin
claude --plugin-dir /Users/derek/derekrepo/ai-pm-plugin/plugins/wechat-writer
```

#### 步骤 4: 提交到 GitHub

```bash
cd /Users/derek/derekrepo/ai-pm-plugin

# 修改文件
vim plugins/wechat-writer/commands/wechat-share.md

# 提交
git add .
git commit -m "fix: update wechat-share command description"
git push origin main
```

---

## 发布和安装流程

### 发布 Marketplace

#### 1. 推送到 GitHub

```bash
git push origin main
```

#### 2. 创建版本标签（可选）

```bash
git tag v1.0.3
git push origin v1.0.3
```

#### 3. 更新 marketplace.json 中的版本号

```bash
# 编辑 .claude-plugin/marketplace.json
vim .claude-plugin/marketplace.json

# 更新 plugin 版本
{
  "plugins": [
    {
      "name": "wechat-writer",
      "version": "1.0.3",  // 更新这里
      ...
    }
  ]
}
```

---

### 用户安装流程

#### 方法 1: 从 GitHub 安装（推荐）

```bash
# 在 Claude Code 中运行

# 1. 添加 marketplace
/plugin marketplace add https://github.com/Derek7552/ai-pm-plugin

# 2. 安装 plugin
/plugin install wechat-writer@ai-pm-tools

# 3. 使用命令
/wechat-writer:wechat-share
/wechat-writer:wechat-insight
```

#### 方法 2: 通过本地 Marketplace 安装

```bash
# 1. 创建本地 marketplace
mkdir -p ~/.claude/marketplaces/my-tools/.claude-plugin

# 2. 创建 marketplace.json（指向 GitHub）
cat > ~/.claude/marketplaces/my-tools/.claude-plugin/marketplace.json << 'EOF'
{
  "name": "my-tools",
  "plugins": [
    {
      "name": "wechat-writer",
      "source": {
        "source": "url",
        "url": "https://github.com/Derek7552/ai-pm-plugin.git"
      },
      ...
    }
  ]
}
EOF

# 3. 添加 marketplace
/plugin marketplace add /Users/derek/.claude/marketplaces/my-tools

# 4. 安装 plugin
/plugin install wechat-writer@my-tools
```

#### 方法 3: 开发模式（本地测试）

```bash
# 直接使用本地 plugin 目录
claude --plugin-dir /Users/derek/derekrepo/ai-pm-plugin/plugins/wechat-writer
```

---

## 常见问题和解决方案

### 1. 命令不显示在 `/` 列表中

**症状**：
- 运行 `/plugin` 显示 plugin 已安装
- 但输入 `/` 看不到命令

**可能原因**：
- ❌ Command 文件缺少 frontmatter
- ❌ Frontmatter 格式错误
- ❌ Plugin 缓存未更新

**解决方案**：

```bash
# 1. 检查 frontmatter
cat plugins/wechat-writer/commands/wechat-share.md | head -5

# 应该看到：
# ---
# description: ...
# ---

# 2. 重启 Claude Code（刷新缓存）

# 3. 重新安装 plugin
/plugin uninstall wechat-writer@ai-pm-tools
/plugin install wechat-writer@ai-pm-tools
```

---

### 2. Plugin 安装时验证失败

**错误示例**：
```
Error: Plugin has an invalid manifest file
Error: repository: Expected string, received object
Error: agents: Invalid input: must end with ".md"
```

**可能原因**：
- ❌ `repository` 使用了对象格式
- ❌ 在 plugin.json 中添加了 `commands/agents/skills` 字段

**解决方案**：

使用正确的 plugin.json 格式：

```json
{
  "name": "wechat-writer",
  "repository": "https://github.com/...",  // ✅ 字符串格式
  // ❌ 不要添加这些：
  // "commands": "./commands/",
  // "agents": "./agents/",
  // "skills": "./skills/"
}
```

---

### 3. Marketplace 添加后看不到 Plugins

**症状**：
- Marketplace 添加成功
- 但 Discover 中看不到 plugins

**可能原因**：
- ❌ marketplace.json 路径错误
- ❌ marketplace.json 格式错误
- ❌ source 路径不正确

**解决方案**：

```bash
# 1. 检查 marketplace.json 位置
ls -la ~/.claude/marketplaces/my-tools/.claude-plugin/marketplace.json

# 2. 验证 JSON 格式
cat ~/.claude/marketplaces/my-tools/.claude-plugin/marketplace.json | jq .

# 3. 检查 source 路径
{
  "plugins": [
    {
      "name": "wechat-writer",
      "source": "./plugins/wechat-writer",  // ✅ 相对于仓库根目录
      ...
    }
  ]
}

# 4. 重新添加 marketplace
/plugin marketplace remove my-tools
/plugin marketplace add https://github.com/Derek7552/ai-pm-plugin
```

---

### 4. 本地修改后不生效

**症状**：
- 修改了 command 文件
- 但 Claude Code 中还是旧内容

**原因**：
- Claude Code 缓存了 plugin

**解决方案**：

```bash
# 方法 1: 重启 Claude Code（最简单）

# 方法 2: 重新安装 plugin
/plugin uninstall wechat-writer@ai-pm-tools
/plugin install wechat-writer@ai-pm-tools

# 方法 3: 使用 --plugin-dir（绕过缓存）
claude --plugin-dir /Users/derek/derekrepo/ai-pm-plugin/plugins/wechat-writer
```

---

### 5. Marketplace.json 和 Plugin.json 冲突

**症状**：
- 根目录同时有 marketplace.json 和 plugin.json
- 不清楚该用哪个

**解决方案**：

根据仓库类型选择：

#### 单 Plugin 仓库
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json       # ✅ 只有这个
```

#### Marketplace 仓库（推荐）
```
my-marketplace/
├── .claude-plugin/
│   └── marketplace.json  # ✅ 只有这个
└── plugins/
    └── my-plugin/
        └── .claude-plugin/
            └── plugin.json  # ✅ 每个 plugin 有自己的
```

**规则**：
- **根目录**：marketplace.json **或** plugin.json，不能同时有
- **Plugin 子目录**：必须有 plugin.json

---

## 实战案例

### ai-pm-plugin Marketplace

**GitHub 仓库**：https://github.com/Derek7552/ai-pm-plugin

#### 目录结构

```
ai-pm-plugin/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace 元数据
├── plugins/
│   └── wechat-writer/            # WeChat Writer Plugin
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin 元数据
│       ├── commands/
│       │   ├── wechat-share.md   # 分享转述类文章
│       │   └── wechat-insight.md # 原创洞察类文章
│       ├── agents/
│       │   └── wechat-writer.md  # 写作助手 Agent
│       ├── skills/
│       │   └── wechat-article-writer/
│       │       ├── SKILL.md      # 写作指南
│       │       └── guides/
│       └── README.md
├── README.md
├── LICENSE
└── ...
```

#### 提供的功能

**Marketplace**：ai-pm-tools
**Plugins**：
1. wechat-writer - 微信文章写作助手

**Commands**：
- `/wechat-writer:wechat-share` - 创建分享转述类文章
- `/wechat-writer:wechat-insight` - 创建原创洞察类文章

**Agent**：
- `wechat-writer` - 专门的文章创作助手

**Skill**：
- `wechat-article-writer` - 写作风格和模板指南

#### 安装方式

```bash
# 方法 1: 直接从 GitHub
/plugin marketplace add https://github.com/Derek7552/ai-pm-plugin
/plugin install wechat-writer@ai-pm-tools

# 方法 2: 开发模式
claude --plugin-dir /path/to/ai-pm-plugin/plugins/wechat-writer
```

#### 版本历史

- **v1.0.3** - 重组为 marketplace 结构（2025-12-29）
- **v1.0.2** - 修复 plugin.json 格式
- **v1.0.1** - 添加 frontmatter
- **v1.0.0** - 初始版本

---

## 添加新 Plugin 到 Marketplace

### 步骤 1: 创建 Plugin 目录

```bash
cd /Users/derek/derekrepo/ai-pm-plugin

# 创建新 plugin 目录结构
mkdir -p plugins/ui-reviewer/.claude-plugin
mkdir -p plugins/ui-reviewer/commands
mkdir -p plugins/ui-reviewer/agents
```

### 步骤 2: 创建 Plugin.json

```bash
cat > plugins/ui-reviewer/.claude-plugin/plugin.json << 'EOF'
{
  "name": "ui-reviewer",
  "description": "UI implementation review agent for design consistency",
  "version": "1.0.0",
  "author": {
    "name": "Derek7552",
    "email": "dameh0108@163.com"
  },
  "homepage": "https://github.com/Derek7552/ai-pm-plugin",
  "repository": "https://github.com/Derek7552/ai-pm-plugin",
  "license": "MIT",
  "keywords": ["ui", "design", "review", "consistency"]
}
EOF
```

### 步骤 3: 添加 Commands

```bash
cat > plugins/ui-reviewer/commands/review-ui.md << 'EOF'
---
description: Review UI implementation against design specifications
---

# Review UI Implementation

Analyzes your UI implementation and compares it against design specifications.

## 使用方式

请提供：
1. 设计稿截图或链接
2. 实现代码路径
3. 需要重点检查的方面

## 检查内容

- 布局一致性
- 色彩准确性
- 字体和间距
- 响应式行为
- 可访问性标准
EOF
```

### 步骤 4: 更新 Marketplace.json

```bash
vim .claude-plugin/marketplace.json

# 在 plugins 数组中添加：
{
  "plugins": [
    {
      "name": "wechat-writer",
      ...
    },
    {
      "name": "ui-reviewer",
      "description": "UI implementation review agent for design consistency",
      "version": "1.0.0",
      "author": {
        "name": "Derek7552",
        "email": "dameh0108@163.com"
      },
      "source": "./plugins/ui-reviewer",
      "homepage": "https://github.com/Derek7552/ai-pm-plugin",
      "category": "design"
    }
  ]
}
```

### 步骤 5: 提交和推送

```bash
git add plugins/ui-reviewer .claude-plugin/marketplace.json
git commit -m "feat: add ui-reviewer plugin for design consistency checks"
git push origin main
```

### 步骤 6: 用户安装

```bash
# 更新 marketplace
/plugin marketplace update ai-pm-tools

# 安装新 plugin
/plugin install ui-reviewer@ai-pm-tools

# 使用
/ui-reviewer:review-ui
```

---

## 最佳实践

### 1. 版本管理

```bash
# 使用语义化版本
# MAJOR.MINOR.PATCH
# 1.0.0 -> 1.0.1 (bug fix)
# 1.0.1 -> 1.1.0 (new feature)
# 1.1.0 -> 2.0.0 (breaking change)

# 为每个版本打 tag
git tag v1.0.3
git push origin v1.0.3
```

### 2. 文档维护

每个 plugin 应该包含：
- ✅ `README.md` - 使用说明
- ✅ 清晰的 command 描述
- ✅ Agent 工作流程说明
- ✅ 示例和用法

### 3. 测试流程

```bash
# 1. 本地测试
claude --plugin-dir ./plugins/wechat-writer

# 2. 验证配置
cat .claude-plugin/marketplace.json | jq .
cat plugins/wechat-writer/.claude-plugin/plugin.json | jq .

# 3. 检查 frontmatter
grep -A 2 "^---$" plugins/wechat-writer/commands/*.md

# 4. 提交前确认
git diff
git status
```

### 4. 命名规范

- **Plugin 名称**：小写，连字符分隔（`wechat-writer`）
- **Command 文件**：小写，连字符分隔（`wechat-share.md`）
- **Agent 名称**：小写，连字符分隔（`wechat-writer`）
- **Marketplace 名称**：小写，连字符分隔（`ai-pm-tools`）

---

## 参考资料

### 官方资源

- [Claude Code 官方文档](https://code.claude.com/docs)
- [官方 Plugin Marketplace](https://github.com/anthropics/claude-plugins-official)
- [Plugin 开发指南](https://code.claude.com/docs/en/plugins)

### 实战案例

- [ai-pm-plugin](https://github.com/Derek7552/ai-pm-plugin) - 本指南的实战示例
- [wechat-writer plugin](https://github.com/Derek7552/ai-pm-plugin/tree/main/plugins/wechat-writer) - WeChat 文章写作助手

---

## 附录

### 完整配置文件模板

#### marketplace.json

```json
{
  "name": "your-marketplace-name",
  "description": "Your marketplace description",
  "owner": {
    "name": "Your Name",
    "email": "your@email.com"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "description": "Plugin description",
      "version": "1.0.0",
      "author": {
        "name": "Author Name",
        "email": "author@email.com"
      },
      "source": "./plugins/plugin-name",
      "homepage": "https://github.com/username/repo",
      "category": "productivity"
    }
  ]
}
```

#### plugin.json

```json
{
  "name": "plugin-name",
  "description": "Plugin description",
  "version": "1.0.0",
  "author": {
    "name": "Author Name",
    "email": "author@email.com"
  },
  "homepage": "https://github.com/username/repo",
  "repository": "https://github.com/username/repo",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}
```

#### command.md

```markdown
---
description: Short command description
---

# Command Title

Detailed command instructions...

## Usage

1. Step 1
2. Step 2

## Examples

...
```

---

**文档版本**：v2.0
**最后更新**：2025-12-29
**作者**：Derek
**基于**：anthropics/claude-plugins-official 官方规范
