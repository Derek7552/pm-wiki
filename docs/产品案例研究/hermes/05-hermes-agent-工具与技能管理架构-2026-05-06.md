---
title: Hermes Agent — 工具与技能管理架构深度拆解
source: https://github.com/nousresearch/hermes-agent
date: 2026-05-06
tags: [AI-Agent, 工具系统, Skill系统, Registry模式, 渐进式披露, 开源]
related: 02-hermes-agent-自进化AI智能体平台-2026-04-27.md, 04-hermes-agent-自进化机制深度拆解-2026-05-06.md
---

# Hermes Agent — 工具与技能管理架构深度拆解

> 一句话总结：**Hermes 的工具系统是一个"注册-发现-分组-过滤-分发"五阶段 pipeline，技能系统是一个"渐进式披露"三层架构——两者协同让 70+ 工具和无限量 Skill 在不膨胀上下文的前提下按需加载。**

---

## 1. 核心概念区分：Tool vs Skill

在 Hermes 中，**Tool** 和 **Skill** 是两个截然不同的概念，但深度协作：

| 维度 | Tool（工具） | Skill（技能） |
|------|-------------|--------------|
| **本质** | 可执行的函数（代码） | 可注入的知识（Markdown 文档） |
| **存储** | `tools/*.py`，Python 代码 | `~/.hermes/skills/*/SKILL.md`，Markdown |
| **注册方式** | `registry.register()` 自注册 | 文件系统扫描，自动发现 |
| **调用者** | LLM 通过 function calling | 用户通过 `/slash-command` 或 LLM 通过 `skill_view` 工具 |
| **运行时效果** | 执行代码，返回结果 | 注入到对话上下文，影响 LLM 行为 |
| **生命周期** | 随代码部署，人工维护 | Agent 可自主创建/修改，Curator 自动整理 |
| **数量** | ~70 个内置 + MCP 动态 | 无上限（bundled + hub + user + agent-created） |

**关键洞察**：Tool 给 Agent 「能力」（能做什么），Skill 给 Agent 「知识」（该怎么做）。两者通过两个桥梁工具连接——`skills_list` 和 `skill_view` 本身是 Tool，但它们的功能是加载 Skill。

---

## 2. Tool 系统架构

### 2.1 全景流程

```
┌─────────────────────────────────────────────────────────┐
│                    启动阶段                               │
│                                                          │
│  tools/*.py 文件                                         │
│    │  AST 扫描发现 registry.register() 调用              │
│    ▼                                                     │
│  discover_builtin_tools()                                │
│    │  import 触发 register()                             │
│    ▼                                                     │
│  ToolRegistry (单例)                                     │
│    │  _tools: {name → ToolEntry}                         │
│    │  _toolset_checks: {toolset → check_fn}              │
│    │  _generation: 缓存失效计数器                         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    初始化阶段                              │
│                                                          │
│  AIAgent.__init__(enabled_toolsets, disabled_toolsets)    │
│    │                                                     │
│    ▼                                                     │
│  get_tool_definitions()                                  │
│    │ ① resolve_toolset() → 展平为 tool names             │
│    │ ② enabled - disabled = 目标集合                      │
│    │ ③ registry.get_definitions() → check_fn 过滤        │
│    │ ④ 动态 Schema 调整（execute_code, discord等）        │
│    ▼                                                     │
│  self.tools = [{type:"function", function:{...}}]        │
│  self.valid_tool_names = {"terminal", "web_search", ...} │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    运行阶段                               │
│                                                          │
│  LLM response.tool_calls                                 │
│    │                                                     │
│    ├── 并行判断 _should_parallelize_tool_batch()         │
│    │   ├── 只读工具 → 并行 (ThreadPool, max 8)           │
│    │   └── 交互/写入工具 → 串行                           │
│    │                                                     │
│    ▼                                                     │
│  handle_function_call(name, args)                        │
│    │ ① 参数类型强制转换 ("42" → 42)                      │
│    │ ② pre_tool_call 插件钩子（可阻断）                   │
│    │ ③ Guardrail 策略检查（可阻断）                       │
│    │ ④ registry.dispatch(name, args) → handler()         │
│    │ ⑤ post_tool_call 钩子（观测性）                      │
│    │ ⑥ transform_tool_result 钩子（可改写）               │
│    ▼                                                     │
│  tool_msg = {role:"tool", content: result, tool_call_id} │
│    → append to messages → 下一轮 LLM 调用                │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Tool 注册机制

**核心文件**：`tools/registry.py`

每个工具文件遵循 **5 部分结构**：

```python
# 1. 实现函数
def terminal_tool(command, background=False, ...):
    """核心逻辑，返回 JSON 字符串"""
    result = execute(command)
    return json.dumps({"success": True, "output": result})

# 2. OpenAI Schema（LLM 看到的接口定义）
TERMINAL_SCHEMA = {
    "name": "terminal",
    "description": "Execute shell commands...",
    "parameters": {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "..."},
            "background": {"type": "boolean", "description": "..."}
        },
        "required": ["command"]
    }
}

# 3. 可用性检查函数（30s TTL 缓存）
def check_terminal_requirements():
    return shutil.which("bash") is not None

# 4. Handler 包装器
def _handle_terminal(args, **kw):
    return terminal_tool(
        command=args.get("command"),
        background=args.get("background", False),
        task_id=kw.get("task_id"),
    )

# 5. 模块级注册（import 时触发）
registry.register(
    name="terminal",
    toolset="terminal",
    schema=TERMINAL_SCHEMA,
    handler=_handle_terminal,
    check_fn=check_terminal_requirements,
    emoji="💻",
    max_result_size_chars=50000,
)
```

**ToolEntry 数据结构**：

| 字段 | 类型 | 用途 |
|------|------|------|
| `name` | str | 工具标识符（如 `web_search`） |
| `toolset` | str | 所属分组（如 `web`） |
| `schema` | dict | OpenAI function calling JSON Schema |
| `handler` | callable | 执行函数 `(args, **kw) → str` |
| `check_fn` | callable | 可用性检查 `() → bool`，30s TTL 缓存 |
| `requires_env` | list | 需要的环境变量 |
| `is_async` | bool | handler 是否返回协程 |
| `emoji` | str | UI 显示图标 |
| `max_result_size_chars` | int | 单工具输出上限 |

**关键设计**：
- **防覆盖**：非 MCP 工具不能覆盖已注册的同名工具（`registry.register()` line 226-278）
- **Generation 计数器**：每次 register/deregister 递增，作为 Schema 缓存 key 的一部分，确保动态注册的 MCP 工具能被及时发现
- **线程安全**：RLock 保护，支持 MCP 刷新时的并发注册

### 2.3 Toolset 分组体系

**核心文件**：`toolsets.py`

Toolset 是工具的**逻辑分组**，支持两层结构：

```
原子 Toolset（叶节点）：
  "web" → ["web_search", "web_extract"]
  "terminal" → ["terminal"]
  "file" → ["read_file", "write_file", "search_files"]

组合 Toolset（可嵌套）：
  "debugging" → ["terminal", "process"] + includes: ["web", "file"]
  
平台级 Toolset（预设集合）：
  "hermes-cli" → 30+ 核心工具
  "hermes-discord" → 核心工具 + ["discord", "discord_admin"]
  "hermes-telegram" → 核心工具 + ["telegram"]
```

**启用/禁用逻辑**（`model_tools.py:335-484`）：
```
最终工具集 = resolve(enabled_toolsets) - resolve(disabled_toolsets) ∩ check_fn()==True
```

### 2.4 70 个工具文件分类

| 类别 | 工具文件 | 说明 |
|------|---------|------|
| **核心框架** | `registry.py`, `__init__.py` | 注册与发现 |
| **终端/代码** | `terminal_tool.py`, `code_execution_tool.py` | Shell 执行（6 种后端：local/Docker/SSH/Modal/Daytona/Singularity） |
| **文件操作** | `file_tools.py`, `file_operations.py`, `file_state.py` | 读/写/搜索/补丁 |
| **浏览器** | `browser_tool.py`, `browser_cdp_tool.py`, `browser_camofox.py`, `browser_supervisor.py`, `browser_dialog_tool.py` | Web 自动化（含反指纹） |
| **视觉/媒体** | `vision_tools.py`, `image_generation_tool.py`, `tts_tool.py`, `transcription_tools.py` | 图像/语音分析与生成 |
| **委派** | `delegate_tool.py`, `mixture_of_agents_tool.py` | 子 Agent 并行，MoA 多模型协同 |
| **记忆** | `memory_tool.py`, `session_search_tool.py` | 持久记忆 + 历史检索 |
| **技能** | `skills_tool.py`, `skill_manager_tool.py`, `skill_usage.py`, `skill_provenance.py`, `skills_guard.py`, `skills_hub.py`, `skills_sync.py` | 完整的 Skill 生命周期 |
| **平台适配** | `discord_tool.py`, `send_message_tool.py`, `feishu_doc_tool.py`, `feishu_drive_tool.py` | 消息/文档平台 |
| **调度** | `cronjob_tools.py`, `kanban_tools.py` | 定时任务 + 多 Agent 看板 |
| **安全** | `approval.py`, `tool_guardrails.py`, `path_security.py`, `url_safety.py`, `tirith_security.py` | 多层防护 |
| **MCP** | `mcp_tool.py`, `mcp_oauth.py`, `mcp_oauth_manager.py` | Model Context Protocol 桥接 |
| **其他** | `homeassistant_tool.py`, `rl_training_tool.py`, `todo_tool.py`, `web_tools.py` | 智能家居/RL 训练/任务管理 |

### 2.5 工具执行流中的安全层

```
LLM tool_call
    │
    ▼
┌───────────────────────┐
│ Plugin pre_tool_call   │ ← 插件可阻断执行
│ (hermes_cli/plugins)   │
└──────────┬────────────┘
           │ pass
           ▼
┌───────────────────────┐
│ Guardrail 策略检查     │ ← 基于配置的策略引擎
│ (tool_guardrails.py)   │
└──────────┬────────────┘
           │ pass
           ▼
┌───────────────────────┐
│ Approval 危险命令审批  │ ← 交互式确认（rm -rf 等）
│ (approval.py)          │   子 Agent 自动拒绝
└──────────┬────────────┘
           │ approved
           ▼
┌───────────────────────┐
│ registry.dispatch()    │ ← 实际执行
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Post-tool observation  │ ← Guardrail 可追加安全备注
│ + transform hook       │ ← 插件可改写结果
└───────────────────────┘
```

### 2.6 并行 vs 串行执行决策

`_should_parallelize_tool_batch()` 基于工具性质智能判断：

| 情况 | 决策 | 原因 |
|------|------|------|
| 单个工具调用 | 串行 | 无需并行开销 |
| 多个只读工具（web_search, read_file） | **并行**（ThreadPool, max 8） | 无副作用，安全并发 |
| 写入不同文件的工具 | **并行** | 路径不重叠 |
| 交互式工具（terminal, clarify） | 串行 | 需要用户交互 |
| 混合场景 | 串行 | 保守策略 |

### 2.7 Agent-Loop-Managed 工具

部分工具的 Schema 由 Registry 持有，但 **实际 dispatch 由 Agent 循环直接处理**（不走 registry.dispatch）：

| 工具 | 原因 |
|------|------|
| `todo` | 需要访问 Agent 的 TodoStore |
| `memory` | 需要访问 Agent 的 MemoryStore |
| `session_search` | 需要访问 Agent 的会话历史 |
| `delegate_task` | 需要 fork 子 Agent |

这些工具在 `run_agent.py` 中有专门的 if-else 分支处理，而非通用 dispatch。

---

## 3. Skill 系统架构

### 3.1 渐进式披露（Progressive Disclosure）

这是 Skill 系统最核心的设计——受 Anthropic Claude Skills 启发，将 Skill 内容分为三个逐步加载的层次：

```
┌─────────────────────────────────────────────┐
│  Tier 1: skills_list()                      │
│  ► 只返回 name + description                │
│  ► 用途：System Prompt 索引、/skills 命令    │
│  ► 成本：极低（每个 Skill ~100 tokens）      │
│                                             │
│  用户/LLM 看到感兴趣的 Skill 后...          │
│                                             │
│  Tier 2: skill_view(name)                   │
│  ► 返回完整 SKILL.md 内容 + frontmatter     │
│  ► 用途：Agent 加载 Skill 指令               │
│  ► 成本：中等（每个 Skill ~500-5000 tokens） │
│                                             │
│  Agent 需要更详细的参考资料时...              │
│                                             │
│  Tier 3: skill_view(name, file_path)        │
│  ► 返回子文件内容 (references/*.md 等)       │
│  ► 用途：按需加载具体参考/模板/脚本          │
│  ► 成本：按需（只加载需要的文件）             │
└─────────────────────────────────────────────┘
```

**为什么这个设计很重要**：
- 如果 500 个 Skill 全部注入 System Prompt → 上下文爆炸（可能 500K+ tokens）
- 渐进式披露让 System Prompt 只包含**名称和描述的索引**（~50K tokens for 500 skills）
- Agent 只在需要时才加载完整内容，大幅节省 token 消耗

### 3.2 Skill 目录与加载

```
~/.hermes/skills/                    # 本地 Skills（最高优先级）
├── my-skill/
│   ├── SKILL.md                    # 核心指令文档（必需）
│   ├── references/                 # 参考资料
│   │   ├── api-docs.md            # API 文档摘录
│   │   └── reproduction-recipe.md  # 复现步骤
│   ├── templates/                  # 可复制修改的模板
│   │   └── config-template.yaml
│   ├── scripts/                    # 可直接运行的脚本
│   │   └── verify.sh
│   └── assets/                     # 静态资源
├── category/                       # 按类别组织
│   └── another-skill/
│       └── SKILL.md
├── .archive/                       # 归档的 Skills（Curator 管理）
├── .usage.json                     # 使用遥测数据
├── .bundled_manifest               # 内置 Skill 清单（hash:name）
└── .hub/
    └── lock.json                   # Hub 安装的 Skill 注册表
```

**四类 Skill 来源**（按优先级）：

| 来源 | 路径 | 谁创建 | Curator 管理 |
|------|------|--------|-------------|
| **本地** | `~/.hermes/skills/` | 用户手动 | 否 |
| **外部目录** | `skills.external_dirs` 配置 | 团队共享 | 否 |
| **Hub 安装** | `~/.hermes/skills/.hub/` | `hermes skills install` | 否 |
| **Agent 创建** | `~/.hermes/skills/`（标记 `created_by: agent`） | Background Review | **是** |
| **Plugin 内置** | Plugin 包内 | Plugin 作者 | 否 |

### 3.3 SKILL.md 格式规范

```yaml
---
name: github-repo-search              # 必需，≤64 字符
description: "Search GitHub repos"     # 必需，≤1024 字符
version: 1.0.0                        # 可选
platforms: [macos, linux]             # 可选，限制 OS

# 条件激活（核心设计）
metadata:
  hermes:
    tags: [github, search]
    related_skills: [github-auth]
    
    # 工具依赖：缺少则隐藏
    requires_toolsets: [web]
    requires_tools: [web_search]
    
    # 降级替代：主工具可用时隐藏
    fallback_for_toolsets: [browser]
    fallback_for_tools: [browser_navigate]
    
    # 持久化配置
    config:
      - key: github.api_token
        description: "GitHub API token"
        default: ""
        prompt: "Enter token"

# 凭证需求
required_environment_variables:
  - name: GITHUB_TOKEN
    prompt: "GitHub personal access token"
    optional: true
---

# 正文：Markdown 格式的指令
```

### 3.4 条件激活机制

Skill 可以声明与工具的依赖关系，实现**智能显隐**：

| 条件 | 效果 | 典型用例 |
|------|------|---------|
| `requires_tools: [X]` | X 不可用 → 隐藏 Skill | 需要浏览器工具的 Skill |
| `requires_toolsets: [X]` | X toolset 不可用 → 隐藏 | 需要终端的 Skill |
| `fallback_for_tools: [X]` | X 可用 → 隐藏 Skill | X 的纯文本降级方案 |
| `fallback_for_toolsets: [X]` | X toolset 可用 → 隐藏 | 无浏览器时的替代方案 |

**决策逻辑**（`_skill_should_show()`）：
- requires_*：**所有**依赖都满足才显示
- fallback_for_*：**任意**主工具可用就隐藏

### 3.5 Skill 调用的两条路径

#### 路径 A：用户通过 Slash Command 调用

```
用户输入: /my-skill do something

1. _looks_like_slash_command() → 确认是命令而非文件路径
2. resolve_skill_command_key("/my-skill") → 规范化命名
3. build_skill_invocation_message(cmd_key, "do something"):
   a. _load_skill_payload(skill_dir) → 读 SKILL.md
   b. 模板替换: ${HERMES_SKILL_DIR} → 绝对路径
   c. 内联 Shell 展开: !`date` → stdout（需 skills.inline_shell: true）
   d. 注入 Skill 配置值（从 config.yaml）
   e. bump_use(skill_name) → 更新使用计数
4. 构造注入消息:
   ┌────────────────────────────────────────────┐
   │ [IMPORTANT: The user has invoked "my-skill"]│
   │                                             │
   │ <SKILL.md 全文（预处理后）>                   │
   │                                             │
   │ [Skill directory: /abs/path]                │
   │ [Skill config: key=value]                   │
   │ [Supporting files: references/api.md, ...]  │
   │                                             │
   │ User instruction: do something              │
   └────────────────────────────────────────────┘
5. 作为 user message 发送给 LLM
```

#### 路径 B：LLM 自主通过工具调用

```
LLM 在 System Prompt 中看到 Skill 索引:
  "Available Skills:
   - my-skill: Does something useful"

LLM 决定需要这个 Skill 的详细知识:
  → tool_call: skill_view(name="my-skill")
  
Agent 执行:
  1. 在 skills/ 目录中查找 my-skill
  2. 读取并返回完整 SKILL.md 内容
  3. bump_view(skill_name) → 更新查看计数
  
LLM 需要参考文件:
  → tool_call: skill_view(name="my-skill", file_path="references/api.md")
  
Agent 执行:
  1. 路径遍历检查（防止 .. 越级）
  2. 读取并返回子文件内容
```

### 3.6 System Prompt 中的 Skill 索引

**核心文件**：`agent/prompt_builder.py`

Agent 启动时，`build_skills_system_prompt()` 构建一个**紧凑的 Skill 索引**注入 System Prompt：

```markdown
# Available Skills

## mlops
- axolotl: Fine-tune LLMs with Axolotl
- vLLM: Serve LLMs with vLLM

## productivity
- github-auth: Authenticate with GitHub
- wiki-manager: Manage personal wiki
```

**两层缓存**：

| 层 | 存储 | 失效条件 |
|----|------|---------|
| In-process LRU | 8-entry OrderedDict | SKILL.md 的 mtime/size 变化 |
| Disk Snapshot | `.skills_prompt_snapshot.json` | 同上 + 进程重启 |

**缓存 Key**：`(skills_dir, external_dirs, available_tools, available_toolsets, platform, disabled_skills)` — 确保不同工具配置下的索引互不干扰。

### 3.7 Skill 使用追踪

**核心文件**：`tools/skill_usage.py`

Sidecar 文件 `.usage.json` 记录每个 Skill 的生命周期数据：

```json
{
  "my-skill": {
    "created_by": "agent",       // agent | user | bundled | hub
    "use_count": 5,              // /slash-command 调用次数
    "view_count": 3,             // skill_view() 调用次数
    "patch_count": 1,            // skill_manage patch 次数
    "last_used_at": "2026-05-06T10:30:00Z",
    "last_viewed_at": "2026-05-06T10:25:00Z",
    "last_patched_at": "2026-05-05T15:00:00Z",
    "created_at": "2026-04-20T08:00:00Z",
    "state": "active",           // active | stale | archived
    "pinned": false
  }
}
```

这个追踪数据被 Curator（自进化 Layer 3）用来做生命周期管理（30 天无活动 → stale → 90 天 → archived）。

### 3.8 Plugin Skills 命名空间

Plugin 内置的 Skill 使用 `plugin:skill-name` 的命名空间语法：

```
/superpowers:writing-plans     ← 调用 superpowers 插件的 writing-plans 技能
/github-auth                   ← 调用本地/hub 的 github-auth 技能
```

Plugin Skill 加载时额外注入 **"Bundle context"**（同插件下的兄弟 Skill 列表），方便 Agent 知道还有哪些相关能力。

---

## 4. Tool × Skill 协同模式

### 4.1 技能相关的 7 个工具

| 工具 | 注册在 | 功能 | 谁调用 |
|------|--------|------|--------|
| `skills_list` | `skills_tool.py` | 列出 Skill 元数据（Tier 1） | LLM / 用户 |
| `skill_view` | `skills_tool.py` | 加载 Skill 全文或子文件（Tier 2-3） | LLM / 用户 |
| `skill_manage` | `skill_manager_tool.py` | CRUD Skill（create/edit/patch/delete/write_file/remove_file） | Background Review / LLM |
| `skills_hub` | `skills_hub.py` | 安装/卸载 Hub 上的公共 Skill | 用户 |
| `skills_sync` | `skills_sync.py` | 同步 Skill 到/从远程存储 | 用户 |
| `skills_guard` | `skills_guard.py` | 安全扫描（注入检测） | 自动（安装时） |
| `skill_usage` | `skill_usage.py` | 追踪使用/查看/修改计数 | 自动（内部） |

### 4.2 从对话到 Skill 更新的完整链路

```
用户对话: "别用那种冗长格式"
    │
    │ （正常对话流，10 轮后触发 Review）
    ▼
Background Review Fork
    │ prompt: "Review the conversation above..."
    │ enabled_toolsets: ["memory", "skills"]
    │
    │ Review Agent 分析信号:
    │   → 用户纠正了格式 = FIRST-CLASS skill signal
    │
    │ Review Agent 调用:
    │   ① skills_list() → 找到相关 Skill
    │   ② skill_view("writing-guidelines") → 读当前内容
    │   ③ skill_manage(action="patch",
    │        name="writing-guidelines",
    │        old_string="...",
    │        new_string="... 简洁优先，避免冗长 ...")
    │
    ▼
下次对话开始
    │ System Prompt 包含 Skill 索引
    │ Agent 自动加载相关 Skill
    │ → 已经知道"简洁优先"
    ▼
用户体验：Agent 自动改进了
```

---

## 5. 关键设计决策与启发

### 5.1 为什么用 Registry 模式而非 Plugin 模式？

Hermes 的工具注册是**自注册**（import 时自动触发），而非典型的 Plugin 模式（由框架扫描并加载）。好处：
- 每个工具文件完全自包含（定义 + Schema + 检查 + 注册）
- 新增工具只需要写一个文件，无需修改任何中心配置
- MCP 工具可以动态注册/注销，Generation 计数器保证缓存一致性

### 5.2 为什么 Skill 是 Markdown 而非代码？

Skill 本质是 **LLM 的 prompt 片段**（怎么做一类任务的指令），而非可执行代码。Markdown 的优势：
- Agent 可以自主创建和修改（不需要 code execution 权限）
- 人类可以直接阅读和编辑
- 支持丰富格式（代码块、表格、列表）
- 天然支持版本控制（Git diff 友好）

代码能力由 Tool 提供，知识由 Skill 提供——**能力与知识分离**是 Hermes 架构的核心哲学。

### 5.3 渐进式披露的 Token 经济学

假设一个 Agent 有 500 个 Skill，每个 SKILL.md 平均 2000 tokens：

| 方案 | System Prompt 成本 | 说明 |
|------|-------------------|------|
| 全部注入 | ~1,000,000 tokens | 不可行 |
| 全部名称+描述 | ~50,000 tokens | Hermes 的 Tier 1 |
| 按需加载全文 | +2,000 tokens/skill | Hermes 的 Tier 2 |
| 按需加载子文件 | +变量 | Hermes 的 Tier 3 |

这个设计让 Skill 库可以**无限扩展**而不膨胀基础上下文。

### 5.4 条件激活的降级策略

`fallback_for_tools` 是一个巧妙的设计：

```yaml
# 这个 Skill 是 browser_navigate 的文本替代方案
# 如果用户有浏览器工具 → 隐藏这个 Skill（用真浏览器更好）
# 如果用户没有浏览器 → 显示这个 Skill（提供替代方案）
fallback_for_tools: [browser_navigate]
```

这让 Skill 系统具备了**优雅降级**能力——无需手动配置，Agent 自动获得当前环境下的最优技能集。

### 5.5 四层安全模型（Tool 侧）

```
Layer 1: Plugin pre_tool_call hook     → 业务级阻断（如"不允许调用这个 API"）
Layer 2: Guardrail 策略引擎            → 规则级阻断（如"不允许 rm -rf /"）
Layer 3: Approval 交互确认             → 人在回路（危险命令需用户确认）
Layer 4: 子 Agent auto-deny            → 子 Agent 的危险命令一律拒绝
```

---

## 6. 对自己产品的启发

### 6.1 渐进式披露是 Agent 知识管理的正确范式
不要在 System Prompt 中塞入所有知识，而是只提供**索引**，让 Agent 按需加载。这不仅节省 token，更重要的是减少了 LLM 的注意力分散——信息过载对 LLM 的影响和对人一样严重。

### 6.2 Tool 与 Skill 的分离是必要的
Tool 给能力（可执行），Skill 给知识（可注入）。把知识硬编码在 Tool 的 description 里会导致：Tool 膨胀、知识无法独立演化、无法由 Agent 自主改进。分离后各自有独立的生命周期。

### 6.3 自注册 + Generation 计数器是动态工具系统的优雅解法
传统 Plugin 系统需要配置文件列出所有插件。自注册让每个工具文件自包含，Generation 计数器保证缓存一致性——即使运行时动态注册了 MCP 工具，下一轮 LLM 调用也能看到新工具。

### 6.4 条件激活 + 降级替代是被低估的设计模式
大多数 Agent 框架只有"有或没有"两种状态。Hermes 的 `requires_tools` + `fallback_for_tools` 让知识库能根据当前环境自动调整——同一个 Agent 在有浏览器和没浏览器的环境下自动切换不同的 Skill 集合，无需任何配置。
