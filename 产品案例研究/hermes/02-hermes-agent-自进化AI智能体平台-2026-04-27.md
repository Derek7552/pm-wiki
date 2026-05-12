---
title: Hermes Agent — 自进化 AI 智能体平台
source: https://github.com/nousresearch/hermes-agent
date: 2026-04-27
tags: [AI-Agent, 自进化, Skill系统, 多平台, RL训练, 开源]
---

# Hermes Agent — 自进化 AI 智能体平台

> 一句话定位：**一个自带学习闭环、多平台接入、模型无关的开源 AI Agent，能从经验中创建 Skill、跨会话记忆，且可用于 RL 训练数据生成。**

## 1. 项目概况

| 维度 | 数据 |
|------|------|
| Stars | 118K+ |
| 语言 | Python (核心) + TypeScript (TUI/Web) |
| 协议 | MIT |
| 版本 | v0.11.0 |
| 核心代码量 | run_agent.py 12.8K行, cli.py 11K行 |
| 创建时间 | 2025-07-22 |
| 维护者 | Nous Research |

## 2. 目标用户画像

| 用户类型 | 核心需求 |
|----------|----------|
| **独立开发者/OPC** | 一个不绑定笔记本、能在 VPS 上 7×24 运行的 AI 助手，通过 Telegram/Discord 随时交互 |
| **AI 研究员** | 用 Atropos RL 环境生成 Agent 轨迹数据，训练下一代 tool-calling 模型 |
| **极客/自部署用户** | 不想被锁定在 Claude/OpenAI 生态，需要支持 200+ 模型的自由切换 |
| **团队** | 多平台 gateway 统一入口，Slack/Discord/钉钉/飞书全覆盖 |

## 3. 核心处理流程

```
用户消息 (CLI / Telegram / Discord / ...)
    │
    ▼
┌─────────────────────────────────────────┐
│           Gateway / CLI 入口             │
│  (session管理, PII脱敏, 平台路由)        │
└────────────────┬────────────────────────┘
                 │
    ▼
┌─────────────────────────────────────────┐
│         AIAgent.run_conversation()       │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ System Prompt 组装                │   │
│  │ SOUL.md + Skills索引 + Memory    │   │
│  │ + Context Files + 环境提示       │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ Tool-Calling Loop (同步)         │   │
│  │                                  │   │
│  │ while iterations < max:          │   │
│  │   response = LLM.chat()          │   │
│  │   if tool_calls:                 │   │
│  │     for call in tool_calls:      │   │
│  │       result = handle_call()     │   │
│  │       messages.append(result)    │   │
│  │   else:                          │   │
│  │     return response.content      │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 后处理                           │   │
│  │ Memory同步 / Skill自动创建       │   │
│  │ / Trajectory保存 / Context压缩   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 4. 架构设计七维分析

### 4.1 自进化闭环 — 最核心的差异化

Hermes 的学习闭环由三层构成：

1. **Skill 自动创建**：完成复杂任务后，Agent 自主将成功方法沉淀为 Skill（Markdown 格式，存入 `~/.hermes/skills/`）。Skill 在后续使用中还会 self-improve
2. **记忆系统**：MemoryManager 协调内置 Provider + 一个外部 Provider（如 Honcho）。内置记忆用 `<memory-context>` 标签注入系统提示，带防注入清洗
3. **跨会话检索**：FTS5 全文搜索 + LLM 摘要，实现"想起来上次怎么做的"

**产品启发**：Skill 是"程序性记忆"（how to do），Memory 是"陈述性记忆"（what I know）——两层分离的设计比单一记忆文件更贴合认知模型。

### 4.2 模型无关 + Provider 适配层

- 核心通过 OpenAI SDK 统一，针对不同 Provider 做适配器：`anthropic_adapter.py`, `gemini_native_adapter.py`, `bedrock_adapter.py`, `codex_responses_adapter.py`, `moonshot_schema.py`
- 支持 Ollama、NVIDIA NIM、小米 MiMo、智谱 GLM、Kimi、MiniMax 等中国厂商
- Tool call 解析器针对不同模型格式：`hermes_parser`, `qwen_parser`, `deepseek_v3_parser`, `llama_parser`, `glm45_parser` 等

**产品启发**：不做模型锁定 = 长期用户信任。适配层的粒度决定了"能接多少模型"的上限。

### 4.3 多平台 Gateway 架构

```
hermes gateway start
    │
    ├── Telegram adapter
    ├── Discord adapter
    ├── Slack adapter
    ├── WhatsApp adapter
    ├── Signal adapter
    ├── 钉钉/飞书/企微/QQ Bot
    ├── Home Assistant
    ├── Email / SMS
    └── Webhook (通用)
```

每个平台一个 adapter 文件，Session 管理统一在 `gateway/session.py`。关键设计：
- **SessionSource** 数据类追踪消息来源（平台/chat_id/thread_id），用于路由回复
- **PII 脱敏**：sender_id 和 chat_id 自动 SHA256 哈希，日志中不出现原始 ID
- **Cron 调度**：内置 croniter，定时任务可投递到任何平台

### 4.4 上下文管理 — 可插拔引擎

`ContextEngine` 抽象基类定义了压缩接口，默认实现是 `ContextCompressor`：
- 保护前 3 轮 + 后 6 轮，中间部分压缩为摘要
- 支持插件替换（如 LCM 长期上下文记忆）
- `trajectory_compressor.py` 专门为 RL 训练做轨迹压缩，保护训练信号质量

### 4.5 工具系统 — 40+ 内置工具

工具通过 `tools/registry.py` 自动发现注册，按 Toolset 分组启用/禁用。核心工具：

| 类别 | 工具 |
|------|------|
| 终端 | terminal（支持 6 种后端：local/Docker/SSH/Modal/Daytona/Singularity） |
| 浏览器 | browser_cdp, browser_camofox（反指纹） |
| 文件 | file_tools, file_operations |
| 代码 | code_execution（Python 脚本 RPC） |
| 委派 | delegate_task（子 Agent 并行，隔离上下文） |
| 记忆 | memory, session_search |
| 技能 | skill_manager（CRUD Skill） |
| Web | web_tools, image_generation |
| 通讯 | send_message（跨平台发消息） |
| 安全 | approval（危险命令审批）, path_security, url_safety, skills_guard |

**子 Agent 设计亮点**：
- 子 Agent 禁止递归委派、禁止写共享记忆、禁止跨平台发消息
- 父级只看到委派结果摘要，不看中间过程 = 零上下文成本

### 4.6 RL 训练集成 — Research-Ready

`environments/` 目录集成 Atropos RL 框架：
- `HermesAgentBaseEnv` 抽象基类，子类只需实现 `format_prompt()` + `compute_reward()`
- 支持 VLLM ManagedServer 直接训练
- `batch_runner.py` 并行生成轨迹数据
- 工具线程池默认 128 workers，支持 89 并发 eval 任务

**产品启发**：开源 Agent 同时做"产品"和"研究基础设施"，用产品积累用户数据反哺模型训练——这是 Nous Research 的飞轮策略。

### 4.7 安全模型

四层防护：
1. **命令审批**：危险命令需用户确认，子 Agent 默认 auto-deny
2. **路径安全**：`path_security.py` 防止文件越权访问
3. **Skill 安全扫描**：`skills_guard.py` 对 Hub 安装的 Skill 做注入检测
4. **上下文注入检测**：`prompt_builder.py` 扫描 AGENTS.md/SOUL.md 中 10+ 种注入模式（prompt override、隐藏 div、凭据外泄 curl 等）

## 5. 竞争格局定位

```
                    模型锁定 ◄────────────► 模型无关
                        │                      │
        Claude Code ────┤                      │
        Codex ──────────┤                      │
                        │                      │
                        │         Hermes ──────┤
                        │         Agent        │
                        │                      │
     单平台(CLI) ◄──────┼──────────────────────┼──────► 多平台
                        │                      │
                        │                      │
                        └──────────────────────┘
```

| vs | Hermes 优势 | Hermes 劣势 |
|----|-------------|-------------|
| Claude Code | 模型自由、多平台、Skill 自进化、可 RL 训练 | 单文件 12K 行巨石架构，不如 CC 模块化；无 IDE 集成 |
| Codex (OpenAI) | 不绑 OpenAI、可自部署、社区 Skill 生态 | OpenAI 模型在 coding benchmark 上更强 |
| Cursor/Windsurf | 不是 IDE 插件、随时随地可用 | 不适合重度 IDE workflow |

## 6. 落地评估

| 维度 | 评估 |
|------|------|
| 部署复杂度 | 低 — 一行 curl 安装，`hermes setup` 向导式配置 |
| 最低成本 | $5 VPS 即可运行；Modal/Daytona serverless 闲时接近零成本 |
| 成熟度 | 高 — 118K stars，v0.11，10 个 Release Notes 累计 30 万字 |
| 风险 | 巨石架构（run_agent.py 12K行）维护压力大；社区贡献者需要消化大量上下文 |

## 7. 产品经理关键启发

### 7.1 Skill = Agent 的程序性记忆
不是"记住什么"，而是"记住怎么做"。Skill 用 Markdown 存储、支持自动创建和自我改进，比代码插件轻得多。**启发**：任何 Agent 产品都应该区分"知识记忆"和"技能记忆"。

### 7.2 多平台 ≠ 多产品
一个 gateway 进程统一所有平台，Session 抽象让 Agent 不感知消息来源。**启发**：Agent 的价值不在界面而在能力，界面只是接入层。

### 7.3 开源 Agent 的飞轮
产品收集用户交互 → 轨迹压缩为训练数据 → RL 训练更好的 tool-calling 模型 → 产品更强。这是 Nous Research 的核心商业模式：**开源 Agent 是模型训练的数据引擎**。

### 7.4 安全是产品而非功能
上下文注入检测、子 Agent 权限隔离、PII 自动脱敏——这些不是"加分项"，而是 Agent 能在生产环境跑起来的前提。

### 7.5 巨石的代价
`run_agent.py` 12K 行、`cli.py` 11K 行——单文件巨石在早期快速迭代有优势，但 118K stars 后贡献者门槛极高。**反面教材**：如果你的开源项目预期快速增长，早期就要拆模块。
