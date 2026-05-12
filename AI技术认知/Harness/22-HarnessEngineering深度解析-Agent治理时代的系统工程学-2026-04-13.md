# Harness Engineering 深度解析——Agent 治理时代的系统工程学

> 来源：文章《深度解析：Harness Engineering》（文字输入，无 URL）
> 提炼日期：2026-04-13
> 分类：AI 方法论

## TL;DR

Harness Engineering 是让 AI Agent 从"能跑"到"能治"的外循环系统工程学。模型能力（内循环质量）解决"单步智力"，Harness（外循环质量）解决"长期可治性"——两者不可互换。评估一个 Agent 效果时，真正评估的是 model + harness 的组合。护城河正在从模型质量上移到 harness 与系统设计。

## 核心观点

**1. 模型越强，Harness 越重要，而不是越不重要**

模型推理能力解决"单步质量"，但长任务的可靠性不会因为单步更聪明就自动获得。一个能解 IMO 金牌题的模型，仍然会在四小时的全栈开发任务中途"忘记自己在干什么"。Agent 的五大根本挑战（状态持久性、目标一致性、行动可验证性、熵增抑制、人机边界）每一个都不能靠更聪明的模型单独解决。Harness 随模型边界外移而"移动"而不是消失——旧的 evaluator 变成冗余，但新能力边界催生新 harness 需求。

**2. Harness 是外循环系统，不是更长的 system prompt**

模型推理是"内循环"——给定上下文生成下一步。Harness 是"外循环"——决定何时启动内循环、给它什么上下文、如何验证输出、何时回退、何时停止。单个 prompt 解决不了跨 session 状态、验证门、工具发现、失败恢复和持续熵控。把 Harness 当成"一个更长的 system prompt"是当下最常见的失败模式。Harness 也不是框架（LangChain 是框架），而是一门实践，就像 DevOps 不是工具而是工程文化。

**3. 护城河从模型质量上移到 Harness 设计**

最硬的证据：LangChain 在保持底层模型不变的情况下，仅通过修改 harness，把 deepagents-cli 在 Terminal Bench 2.0 上从 52.8% 提升到 66.5%（+13.7 分），排名从 Top 30 外围拉到 Top 5。当 GPT/Claude/Gemini 在核心能力趋同时，决定产品成败的是 harness 质量，不是模型差异。

## 关键知识点

### AI 工程五幕演化史

| 时间 | 阶段 | 核心矛盾 | 工程产物 | 教训 |
|------|------|----------|----------|------|
| 2022.11-2023 | 生成 | 能说不能做 | Prompt Engineering | 信息密度最大化 |
| 2023-2024 | 连接 | 能连不能治 | Function Calling / LangChain | 连接≠编排，编排≠治理 |
| 2024 | 推理 | 单步更强但长任务不稳 | MCP / Context Engineering | 单步质量≠任务可靠性 |
| 2025 | 行动 | Agent 能跑但频繁崩坏 | Claude Code / Codex / Cursor | 能力超过基础设施，产生断裂 |
| 2026- | 治理 | 从"能干"到"不翻车" | Harness Engineering | 系统设计成为核心竞争力 |

**Harness Engineering 术语出现时间线**：
- 2026.02.05：Mitchell Hashimoto 在 My AI Adoption Journey 写出"Engineer the Harness"，被认为是术语进入主流的起点
- 2026.02.11：OpenAI 以 Harness Engineering: Leveraging Codex in an Agent-First World 为题发布工程文章
- 2026.03：Anthropic 发布《Harness Design for Long-Running Application Development》，将二角色架构升级为三角色
- 2026.04：Thoughtworks / Fowler 体系将方法论抽象为 2×2 控制矩阵，方法论完整成形

### Agent 的五大根本挑战

| 挑战 | 本质 | 为什么模型解决不了 |
|------|------|------------------|
| 状态持久性 | 跨时间、跨 session 记住做过什么 | 模型无状态，context window 有上限 |
| 目标一致性 | 长任务中防止漂移、提前宣布完成 | 缺少外部锚点，无法稳定校准"真正完成" |
| 行动可验证性 | 区分"做了"和"做对了" | 自我评价天然存在自我表扬和误判倾向 |
| 熵增抑制 | 持续产出累积冗余、漂移、不一致 | 模型复制已有模式，包括坏模式 |
| 人机边界 | 何时自主、何时交人 | 没有可靠的"不确定性自觉" |

### Harness 精确定义

> **Harness = 让模型能够作为 Agent 行动起来的外循环系统**

包含：计划分解、持久状态、工具编排、验证门控、反馈回路、回退机制、人机交接点、审计日志。

**重要区分**：agent harness（运行时外循环）≠ evaluation harness（评测流水线）。本文讨论的是前者。

### 三层工程抽象（递进关系）

```
Prompt Engineering  →  Context Engineering  →  Harness Engineering
单次调用如何问           每一步喂什么信息           整条流水线怎么运转
```

Context Engineering 是 Harness Engineering 的子集；Harness 还额外包含多步结构、工具中介、验证门和 durable state。

### Harness 六大工程构件

**① Durable State Surfaces（持久状态面）**

问题：长任务跨 session 需要续航，context window 有限。

Anthropic 解法：
- Initializer agent 创建 `init.sh`、`claude-progress.txt`、初始 git commit
- 把高层需求展开成 200+ 条具体 feature，全部初始标记为 failing
- 每个 coding agent 只做增量推进，session 结束时留 clean state
- 规则：agent 只能改 feature passes 状态，不能修改测试定义本身

更深发现：**context anxiety**——即使用了 compaction，agent 仍因"上下文太满"而行为退化。解决方案是 context reset（给新 agent 全新 context，通过外化状态工件续航），而非更好的 compaction。

**设计原则**：状态 ≠ "保存聊天记录"。真正的 durable state 是 agent 冷启动后 30 秒内能读取、理解、续航的结构化工件。

---

**② Decomposition & Plans（分解与计划）**

Anthropic 三角色架构（2026.03 升级版）：
- **Planner**：把一两句描述扩展成完整 product spec 和分步 feature list，不直接写代码
- **Generator**：逐 feature 落地，每完成一个 commit
- **Evaluator**：独立评估 generator 产出，标记 pass/fail，给出改进建议

OpenAI 对应物：PLANS.md、Implement.md、Documentation.md

**设计原则**：计划必须是一等工件——写入文件系统、被版本管理、可被后续 agent 读取、被验证门引用。存在于对话里的计划本质上不是计划，只是一次想法。

---

**③ Feedback Loops（反馈回路）：Guides × Sensors 2×2 矩阵**

| | Computational（确定性，便宜快） | Inferential（推断性，贵慢） |
|--|--|--|
| **Guides（行动前约束）** | 代码规范检查、类型校验 | AI 评估代码设计合理性 |
| **Sensors（行动后反馈）** | 测试套件、linter 结果 | AI 评估 UI 美观度、代码风格 |

关键洞察：
- 只有 guides 无 sensors → 规则生效与否无从知晓
- 只有 sensors 无 guides → 不断重复同样错误再纠正
- Evaluator 不是永远必要的：当底模能力跨过阈值后从"必要部件"退化为"额外开销"
- 好的 harness 是与模型能力边界共同演进的可裁剪系统

---

**④ Legibility（感知面建设）**

核心判断（OpenAI）：**凡是不在 agent 运行时可见范围内的知识，就等于不存在。**

具体实践：
- 给每个 git worktree 启动独立浏览器实例，通过 CDP 让 agent"看到"UI
- 把 logs、metrics、traces 全部暴露给 agent 查询
- 设计原则、产品意图、ADR（架构决策记录）、已知技术债全部进 repo

⚠️ 注意：超长的 AGENTS.md 会快速腐烂、挤占上下文——更好的做法是把它变成目录索引，真正知识拆散到结构化文档里。

---

**⑤ Tool Mediation（工具中介）**

问题：数十个 MCP 服务器、上百个工具，直接塞进上下文导致 token 暴增和迷失。

Anthropic 核心思路：**不要让模型直接调用工具，让模型写代码来调用工具。**

| 模式 | 工具定义 | 中间结果 | 效率 |
|------|----------|----------|------|
| 直接调用 | 全加载进上下文 | 在模型内循环 | 低 |
| 代码执行 | 沙箱内按需发现 | 只把最终结果回传模型 | 高 |

实践发现：精简到最小必要工具集比给 agent 全量工具效果更好。

---

**⑥ Entropy Control（熵增控制）**

问题：全自动 agent 代码库不断复制既有模式，包括糟糕的模式。

OpenAI 方案演进：
- 初期：人每周花约 20% 时间清理"AI slop"（冗余代码、过时文档、不一致命名）
- 系统化后：documentation consistency agents 定期验证、refactor agents 计划清理技术债、architectural enforcement 通过 CI 机械维护模块边界

**设计原则**：Harness 不只负责"让 agent 跑起来"，还负责持续抑制 agent 放大的系统噪声——这是它与简单框架最本质的区别。

### Harnessability（可 harness 度）

一个系统天然有多容易被 agent 驯化，是 agent 时代的关键变量：
- **高 harnessability**：强类型、测试完备、边界清晰、文档版本化、运行时可观测
- **低 harnessability**：知识散落在人脑、聊天工具、口耳相传中

工程基础设施质量（CI 完善度、文档结构化、架构边界清晰）已不只是"工程素养"问题，而是直接决定 agent 能在系统上走多远。

### 人机交互四次断裂

| 范式 | 交互假设 | 控制权分配 |
|------|----------|------------|
| CLI | 人适应机器（精确指令） | 人 100% |
| GUI | 机器用视觉隐喻呈现自身 | 人主导 |
| App | 人在预设路径中选择 | 系统主导选项，人做选择 |
| Agent | 机器理解意图，自主决定怎么做 | 人保留目标设定和关键决策点 |

**工程后果**：指令驱动时代 bug = "系统没正确执行指令"（传统测试可覆盖）；意图驱动时代 bug = "系统误解了意图"或"选择了糟糕执行路径"（需要新的验证约束反馈机制）。

### 三层 Agent 演进路径

| 层级 | 时间 | 特征 | 工程抽象 | 天花板 |
|------|------|------|----------|--------|
| Level 1：Chatbot | 2022-2023 | 无状态、单次对话 | Prompt Engineering | 能说不能做 |
| Level 2：Agent IDE | 2024-2025 | 多步任务、工具调用 | Context Engineering + 轻量 Harness | 长任务不稳、多 agent 无标准 |
| Level 3：AgentOS | 2026- 萌芽 | always-on、跨工具、跨身份 | 系统层（调度、内存、隔离） | 仍在研究阶段 |

**关键定位**：Harness 是 AgentOS 的用户态层（shell/daemon），AgentOS 是内核（调度、隔离、资源管理）。两者是上下层，不是竞争关系。

### 当前五大典型症状

1. **框架丛林**：LangChain/CrewAI/AutoGen 各解一小块，拼凑出脆弱管道而非可治理系统
2. **Chatbot 皮 + Agent 芯**：缺状态管理、任务分解、验证门——demo 好看，生产翻车
3. **工具注册 ≠ 工具治理**：能连不等于会用，精简工具集比全量工具效果更好
4. **一次性规则 vs 可演进约束**：巨大的 AGENTS.md 腐化速度超过维护速度，当一切都重要时什么都不重要
5. **In-the-loop vs On-the-loop**：手改产物（in the loop）vs 改 harness 让系统下次自动更好（on the loop）——大多数团队还停在前者

### 安全新维度：攻击目标从数据变成 Agency

Invariant Labs 在 2025.04 披露 Tool Poisoning Attacks：恶意指令可藏在 MCP 工具描述里（对用户不可见，对模型可见），诱导 agent 执行未授权操作；后续又展示通过不可信 MCP server 联动可信 WhatsApp MCP 实现数据外流。

Harness 权限模型必须从静态"可以/不可以"升级为动态"在什么条件下可以、到什么上限可以、需要人类确认后才可以"。

## 数据与案例

**LangChain Harness 优化效果**（文章内数据）：
- 底层模型不变，仅修改 harness
- deepagents-cli 在 Terminal Bench 2.0：52.8% → 66.5%（+13.7 分）
- 排名：Top 30 外围 → Top 5

**OpenAI Codex Harness Engineering 实践**（来源：OpenAI 2026.02 工程文章）：
- 小团队 + 五个月 + 空仓库 → 内部 beta 产品
- 仓库规模：约百万行代码，约 1,500 个 PR
- 注：初始 scaffold 仍由 Codex 在少量模板引导下生成，非严格意义"零人工手写"
- 核心发现：工程师工作重心转向"设计环境、明确意图、构建反馈回路"

**OpenAI 熵控制成本**：最初人工清理"AI slop"占每周约 20% 时间，后来系统化解决。

## 启发与思考

- **给实践者的三个自检问题**（直接可用）：
  1. 你的 agent 有没有 durable state surfaces？冷启动后能否在 30 秒内续航？
  2. 你的系统有没有 machine-readable acceptance criteria？"完成"是外部结构化验证面，还是 agent 的自我感觉？
  3. 你的 repo、工具、日志、指标、策略，是否对 agent legible and enforceable？

- **In-the-loop 升级到 On-the-loop**：当前遇到 agent 输出问题时，是否能系统化改善 harness 而不是一次性修 bug？这是工程师在 agent 时代的核心能力升级路径

- **Harnessability 评估**：在当前系统里，哪些知识还散落在 Slack/口耳相传中？这些信息对 agent 不可见，等于不存在——可以从最关键的规则开始系统化进 repo

- **安全方向**：构建 harness 时工具权限设计、least privilege 原则、跨工具数据流隔离——安全背景可以在此发力

- **延伸探索**：ASPLOS 2026 AgenticOS Workshop 论文（agent 工作负载的 OS 原语）；Anthropic Demystifying evals for AI agents；Building Effective Agents 指南

## 原文精华

> 模型不是瓶颈，系统才是。

> 状态 ≠ "保存聊天记录"。真正的 durable state 是 agent 可以在冷启动后、没有任何上下文历史的情况下读取、理解、续航的结构化工件。如果你的 agent 冷启动后不能在 30 秒内知道"上次做到哪了、下一步该做什么"，你的状态管理就是失败的。

> 计划必须被提升为一等工件，而不是一次性聊天内容。一个存在于对话里的计划，本质上不是计划——它只是一次想法。

> 凡是不在 agent 运行时可见范围内的知识，就等于不存在。

> 不满意 agent 输出时，低层做法是手改产物；高层做法是改 harness，让系统下次自动做得更好。从 in the loop 到 on the loop，这才是工程师在 agent 时代的核心升级路径。

> 当 GPT、Claude、Gemini 在核心能力上趋同时，决定产品成败的不再是模型差异，而是 harness 质量。护城河重心正在上移到 harness 与系统设计。

---
原文链接：无（文字输入）
