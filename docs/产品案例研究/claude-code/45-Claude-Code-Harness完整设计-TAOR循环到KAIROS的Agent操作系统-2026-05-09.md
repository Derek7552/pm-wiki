# Claude Code Harness 完整设计——TAOR 循环到 KAIROS 的 Agent 操作系统

> 来源：Founder Park《看看 Claude Code 怎么做 Harness，这才是 Agent 工程化的真正难点》（用户直接提供正文）；二手分析依据 Vikash Rungta 逆向工程博客 + Hacker News 讨论 + 公开镜像仓库 nirholas/claude-code
> 提炼日期：2026-05-09
> 分类：技术趋势

## TL;DR

Claude Code 源代码泄露暴露了一个**完整生产级 Agent Harness** 的设计全貌：约 1900 个 TypeScript 文件、超 512000 行代码、Bun 运行时 + React/Ink 终端 UI、QueryEngine + 工具注册表 + 数十条斜杠命令 + 持久化记忆 + IDE 桥接 + MCP + 远程会话 + 插件 + Skills + 后台/并行任务层。它**不是"LLM + 命令行包装"，而是软件工作的操作系统**——围绕模型堆叠权限、记忆、后台任务、IDE 桥接、MCP 管道、多 Agent 编排。Vikash Rungta 把这个东西命名为 Harness：本地运行时外壳，把 LLM（Brain）包裹在工具、记忆、编排逻辑（Body）里。Claude Code 验证了 Agent 三代际的终点（Chatbot → Workflow → Autonomous Agent），其设计哲学集中在五个非共识点上：**运行时越笨架构越稳定**（TAOR Loop 50 行 + 4 个能力原语 Read/Write/Execute/Connect 而非 100 个工具）、**Context Window 是稀缺资源**（50% 自动压缩 + 子 Agent 隔离 + 14 cache-break 向量防御）、**记忆是索引不是存储**（六层加载 + 主动自我编辑 + 子 Agent MEMORY.md）、**权限是 UX 设计**（五档信任光谱 + 23 项 bash 安全检查 + cch=00000 五字节 API DRM）、**未来是常驻 Agent**（KAIROS 未发布模式 + /dream 夜间记忆蒸馏 + GitHub Webhook + 5 分钟 Cron）。

## 核心观点

### 观点一：真正的工程难点在 Harness，不在模型

Claude Code 的核心价值不是 Claude 模型本身，而是**包裹模型的本地运行时外壳**：QueryEngine、工具注册表、斜杠命令、持久化记忆、IDE 桥接、MCP、Skills、Plugin、后台任务层。Agent 经历三个代际演进：第一代 Chatbot（无状态问答）；第二代 Workflow（n8n / LangChain 用代码驱动 DAG，代码决定模型下一步）；第三代 Autonomous Agent（**模型控制循环，运行时只是执行器**）。Claude Code 是第三代的商业化代表。结论：**真正难的是 Harness——给任何支持工具调用的 LLM 提供文件系统、shell、分层记忆、声明式扩展能力，并在可组合权限约束的有界自主循环里运行**。这一论断和 44 号笔记 MCP 协议的"分层互补"结论同构——MCP 给能力、Skills 给知识、API 打底、CLI 管本地、Plugin 做分发，五层叠加才是完整的 Agent 工程交付。

### 观点二：运行时越笨，架构越稳定——智能下沉到模型，确定性留给框架

Claude Code 的 Orchestrator 被故意设计得**极其"愚蠢"**：只驱动 TAOR 循环（Think-Act-Observe-Repeat）、执行工具调用、感知结果。**所有推理、决策、何时停止全部交给模型**。运行时不知道代码是什么、不知道文件在哪，它只是跑循环，让模型决定下一步。TAOR 循环核心逻辑约 50 行，给模型无限操作空间。这与早期 LangChain "在框架层做聪明编排"的路线形成鲜明对比——LangChain 把编排逻辑写进代码、用复杂 Orchestrator 控制 LLM 每一步；Claude Code 反过来下放所有推理权给模型。同理工具层只提供 **4 种能力原语：Read / Write / Execute / Connect**，其中 Bash 是通用适配器，让模型用 git/npm/docker 等任何人类开发者会用的工具，自己组合完成。**核心论断：随着模型变强，脚手架应变薄而非变厚；硬编码脚手架应随模型能力提升而被主动删除——如果每次模型升级都要往框架里加更多脚手架，说明在对抗模型而非利用模型**。

### 观点三：Context Window 不是越大越好，是越干净越好——稀缺资源主动管理

Context Collapse 是 Agent 系统最普遍的失败模式：对话拉长 → 上下文被填满 → 记忆退化 → 幻觉出现 → Agent 在自己的噪音里迷失方向。Claude Code 把 Context Window 当成**需要主动管理的稀缺资源**，构建三层防御：**Auto-Compaction**（约 50% 触发，LLM 摘要替换原始对话轮次）+ **Sub-Agent 隔离**（独立 TAOR + 独立 maxTurns + 独立 compaction + 独立 MEMORY.md，子任务 token 消耗对主 Context 完全透明）+ **Prompt Cache 经济学**（promptCacheBreakDetection.ts 追踪 14 个 cache-break 向量，DANGEROUS_uncachedSystemPromptSection() 函数命名本身即文档，多个 sticky latches 防模式切换破坏缓存）。最终 Session 不是一次性的——可像 git branch 一样 checkpoint / rollback / fork。**当你为每个 token 付费时，缓存失效不再是计算机科学笑话，更多是财务问题**。这一观点与 44 号 MCP 笔记里"工具定义全量加载导致 token 暴涨 4–32 倍"的痛点完全互补——MCP 是 Agent 接外部工具时的 token 入侵入口，Auto-Compaction + Sub-Agent 隔离是 Agent 自我消化 token 暴涨的防御机制。

## 关键知识点

### 1. Claude Code 系统规模数据

| 维度 | 数值 |
|------|------|
| 文件数 | 约 1900 个 TypeScript 文件 |
| 代码行 | > 512000 行严格类型 TS |
| 运行时 | Bun |
| 终端 UI | React + Ink |
| 模块 | QueryEngine、集中式工具注册表、数十个斜杠命令、持久化记忆、IDE 桥接、MCP 集成、远程会话、插件、Skills、后台和并行任务层 |
| 镜像仓库 | nirholas/claude-code（公开） |

**类比定位**：Claude Code 是"用于软件工作的操作系统"，而非"LLM + CLI 包装"。

### 2. Agent 三代际演进框架

| 代际 | 形态 | 控制权 | 代表 |
|------|------|--------|------|
| 第一代 | Chatbot | 无状态问答，用户控制 | ChatGPT 早期 |
| 第二代 | Workflow | 代码控制 LLM 每步 | n8n、早期 LangChain |
| 第三代 | Autonomous Agent | **模型控制循环，运行时只是执行器** | Claude Code |

### 3. TAOR Loop 核心设计哲学

**循环结构**：Think → Act → Observe → Repeat。

**核心逻辑约 50 行**——Orchestrator 极其"愚蠢"：
- 只驱动循环、执行工具调用、感知结果
- **所有推理、决策、何时停止全部交给模型**
- 运行时不知代码是什么、不知文件在哪

**4 种能力原语（不要造 100 个工具）**：

| 原语 | 含义 | 实现方式 |
|------|------|---------|
| Read | 读取 | 文件、URL、命令输出等 |
| Write | 写入 | 文件创建/修改 |
| Execute | 执行 | Bash 通用适配器 → git / npm / docker / 任何 shell 工具 |
| Connect | 连接 | MCP、API、远程服务 |

**核心论断**：
- 运行时越笨，架构越稳定
- 脚手架应随模型能力提升而**主动删除**
- 如果每次模型升级都要往框架里加更多脚手架，说明在对抗模型

### 4. Context 三层防御机制

**第一层 Auto-Compaction（约 50% 触发）**：
- 用 LLM 摘要替换原始对话轮次
- 释放空间同时保留关键决策
- 不是简单截断，是有损压缩

**第二层 Sub-Agent 隔离**：
- 独立 TAOR 循环
- 独立 maxTurns 上限
- 独立 compaction 机制
- 独立 MEMORY.md
- 主 Agent 派出后只等 summary 返回——子任务 token 消耗对主 Context 完全透明

**第三层 Prompt Cache 经济学**：
- promptCacheBreakDetection.ts 追踪 **14 个 cache-break 向量**
- 函数命名 `DANGEROUS_uncachedSystemPromptSection()` 本身即文档（"加东西要小心，会破坏缓存"）
- 多个 sticky latches 防模式切换破坏缓存锁定
- 当为每个 token 付费时，缓存失效是财务问题

**Session 持久性**：会话可像 git branch 一样 checkpoint / rollback / fork。

### 5. 六层记忆系统加载顺序

记忆是**索引**，不是存储——能从代码库重新推导的信息绝不应被存储。

| 层 | 内容 | 存储位置 |
|----|------|----------|
| 1 | Managed Policy（组织级策略） | 企业 / 团队层面统一规范 |
| 2 | Project CLAUDE.md | 当前项目特定指令和上下文 |
| 3 | User Preferences | 个人层面习惯偏好 |
| 4 | Auto-Memory | Agent 从历史交互学到的用户模式（自动写入 MEMORY.md） |
| 5 | Session | 当前会话临时信息 |
| 6 | Sub-Agent Memory | 各子 Agent 独立维护的专项记忆（`~/.claude/agent-memory/<name>/MEMORY.md`，下次调用自动加载前 200 行） |

**Auto-Memory 循环**：Agent 学习用户工作模式 → 写入 MEMORY.md → 未来会话自动加载 → 用户不需要反复解释相同事情。

**主动自我编辑**：系统不仅记录，还会重写、去重、剪除互相矛盾的信息——**过期且无效的记忆是负债而非资产**。

### 6. 权限系统五档信任光谱

| 档位 | 含义 | 信任级别 |
|------|------|---------|
| **plan** | 只读，完全不能写入 | 最低 |
| **default** | 编辑和 shell 操作前都需询问 | 标准 |
| **acceptEdits** | 自动批准文件编辑，shell 操作仍询问 | 中 |
| **dontAsk** | 自动批准白名单内所有操作 | 高 |
| **bypassPermissions** | 跳过所有检查，仅限托管组织 | 最高 |

**bashSecurity.ts 的 23 项编号安全检查**：
- 18 个被阻止的 Zsh 内置命令
- 防御 Zsh equals expansion（`=curl` 绕过对 curl 的权限检查）
- unicode 零宽字符注入
- IFS null-byte 注入
- HackerOne 审查期间发现的恶意 token 绕过

**核心论断**：权限设计更像 UX 设计——可组合的信任光谱让 Agent 适应从"什么都要确认的高度受限企业环境"到"全速运行的个人开发环境"完全不同的场景。**这是从 Demo 进入企业生产环境的门槛**。

### 7. API 层身份验证 — cch=00000 五字节 DRM

**机制**：
- system.ts 里每个 API 请求包含 `cch=00000` 占位符
- 请求离开进程前，**Bun 原生 HTTP 栈（用 Zig 编写，运行在 JS 运行时之下）**把五个零替换成计算出的哈希值
- 服务端验证哈希，确认请求来自真实的 Claude Code 二进制文件

**工程巧思**：
- 用等长占位符 → 替换不改变 Content-Length 头部 → 不需要缓冲区重新分配
- 整个计算过程在 JS 层之下 → 对运行在 JS 里的任何代码完全不可见
- 本质：**HTTP 传输层实现的 API 调用 DRM**

**法律含义**：这是 Anthropic 此前向 OpenCode 发律师函背后的技术基础——不只是要求第三方工具不要使用 API，二进制文件本身通过加密证明自己的身份。OpenCode 社区被迫诉诸会话拼接技巧 + 认证插件。

### 8. 多 Agent 编排两层架构

**第一层 Sub-Agent（主从关系）**：

| 内置预设 | 模型 | 工具 | 用途 |
|---------|------|------|------|
| **Explore** | Haiku（速度快、成本低） | 只读（Read、Grep、Glob） | 文件发现、代码库探索 |
| **Plan** | 继承主 Agent | 只读 | 代码库研究、规划前信息收集 |
| **General-purpose** | 继承主 Agent | 全套 | 复杂多步骤操作 |

**自定义子 Agent 配置**（`.md` 文件 + YAML frontmatter）：
- 模型：sonnet / opus / haiku / inherit
- 权限模式
- maxTurns
- 可用工具白名单 + 禁用工具黑名单
- 预加载 Skills

**存储位置**：`~/.claude/agents/`（用户级）/ `.claude/agents/`（项目级）/ `--agents` CLI 参数。

**前后台模式**：
- 前台：阻塞主对话，权限询问透传给用户
- 后台：与主对话并发，权限启动前预收集，未预批准的权限请求工具调用直接失败、Agent 继续运行
- `Ctrl+B`：把前台 Agent 切换到后台

**第二层 Agent Teams（实验性）**：

| 维度 | Sub-Agent | Agent Teams |
|------|-----------|-------------|
| 关系 | 主从（Lead 派遣 Sub） | 平等独立 Claude Code 实例 |
| 协调 | summary 返回 | 共享文件系统 + 共享 Task List |
| 通信 | 单向（Sub→Lead） | 单播 / Broadcast / Idle 通知 |
| 启用 | 默认 | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |

**Agent Teams 协调机制**：
- Shared Task List（所有 Agent 可见任务状态，完成后自主认领下一个未分配任务）
- 单播 Message（发给特定 Teammate）
- Broadcast（成本随团队规模线性增长）
- Automatic Idle Notification（Teammate 完成停止时自动通知 Lead）

**质量门控 Hooks**：
- **TeammateIdle**：Teammate 即将进入空闲时触发，返回 exit code 2 可发反馈让它继续工作
- **TaskCompleted**：任务即将被标记完成时触发，返回 exit code 2 可阻止完成并要求修复

### 9. KAIROS 未发布模式（功能门控）

**特征清单**（main.tsx 代码路径）：
- `/dream` 技能：夜间记忆蒸馏（nightly memory distillation）
- 每日 append-only 日志
- GitHub Webhook 订阅
- 后台 Daemon 工作进程
- 每 5 分钟 Cron 调度刷新

**产品形态意义**：
- 现有 Claude Code = **召唤式 Agent**：你打开终端它来帮你，关掉就停
- KAIROS = **常驻后台 Agent**：在后台持续运行 + GitHub Webhook 感知代码库变化 + 每晚记忆蒸馏 + 第二天预热好

**对外宣告**：Claude Code 产品野心已远超"LLM + 命令行包装"，朝"终端操作系统级 Agent"方向前进。

### 10. 两个争议性彩蛋

**Anti-Distillation 机制（claude.ts 第 301-313 行）**：
- `ANTI_DISTILLATION_CC` 标志
- 启用时 API 请求携带 `anti_distillation: ['fake_tools']` 参数
- 服务端向系统提示中**静默注入虚假工具定义**
- 目的：污染录制 API 流量训练竞品的训练数据
- 通过 GrowthBook 功能标志 `tengu_anti_distill_fake_tool_injection` 控制
- 仅对第一方 CLI 会话激活

**第二层 Server-Side connector-text 摘要（betas.ts 第 279-298 行）**：
- API 缓冲 Assistant 在工具调用之间的推理文本
- 摘要后返回带加密签名的版本
- 后续轮次原始文本可从签名恢复
- 录制 API 流量的人只能拿到摘要、拿不到完整推理链

**Undercover Mode（undercover.ts 约 90 行）**：
- 单向门：Claude Code 在非 Anthropic 内部仓库使用时，指示模型**永远不提及内部代号**（Capybara、Tengu）、内部 Slack 频道、仓库名称、甚至 Claude Code 名字本身
- 第 15 行注释：`There is NO force-OFF. This guards against model codename leaks.`
- `CLAUDE_CODE_UNDERCOVER=1` 可强制开启，但**没有办法强制关闭**
- 外部构建里整个函数被死代码消除为平凡返回

**伦理含义**：Anthropic 员工在开源项目里用 Claude Code 生成的 commit 和 PR 没有任何 AI 参与的标记——商业防御需求 vs AI 透明度伦理之间的权衡。

## 数据与案例

### Claude Code 量化数据

- 源代码：约 1900 个 TS 文件 / > 512000 行
- 内置预设子 Agent：3 种（Explore / Plan / General-purpose）
- 权限信任档位：5 档
- bashSecurity.ts 安全检查：23 项编号
- promptCacheBreakDetection.ts 监控向量：14 个 cache-break 向量
- 自动压缩触发阈值：约 50% Context 使用量
- API DRM 占位符：5 字节（cch=00000）
- KAIROS Cron 调度：每 5 分钟一次

### 三种 LLM 实现混合方式映射（与 42 号 GigaOm 笔记交叉）

Claude Code 三种执行模式与 SecOps 厂商三种 LLM 实现一一对应：

| 模式 | Claude Code 表现 | 对应 SecOps 实现 |
|------|----------------|----------------|
| 设计时 LLM | 模型生成命令、规划路径 | BlinkOps、Mindflow、Tines |
| 确定性包装 | TAOR 循环 + 工具白名单 + 权限询问 | 传统 SOAR LLM 富化层 |
| 自治智能体 | Sub-Agent + Agent Teams | Exaforce、Imperum |

### 与已有笔记的互补关系

- **22 号笔记**（Claude Code 记忆四层拆解）→ 本篇扩展为完整 Harness 全图
- **18 号笔记**（Harness 三层结构：知识 / 约束 / 反馈）→ 本篇是工程化实现样本
- **07 号笔记**（Agent Harness 技术原语拆解）→ 本篇验证四原语 Read/Write/Execute/Connect 的工程哲学
- **44 号笔记**（MCP 协议安全危机）→ 本篇 Connect 原语对应 MCP 接入点；Anti-Distillation 与工具投毒形成"接入端"vs"协议端"的供应链双面镜
- **34 号笔记**（郝建业 Agent 三大底层能力：记忆/安全/Harness）→ 本篇是郝建业理论的工程化对照——记忆六层加载、bashSecurity 23 项检查、TAOR 循环 + 工具注册表，三块能力都有对应实现

> ⚠️ 待验证：Vikash Rungta Substack 博客原文未直接抓取（SSL 障碍）；本文依据用户提供的 Founder Park 编译稿——具体行号、函数名、文件路径需对照源代码或原始博客确认。原始公开镜像 nirholas/claude-code 的真实性与官方发布版本的一致程度也需在引用前核实。

## 启发与思考

### 与个人工作的关联（云起无垠产品总监 / 安全 + AI 方向）

1. **"运行时越笨架构越稳定"是云起 Agent 产品的核心反共识**：当前国内大多数安全 Agent 产品仍在用 LangChain 风格的"代码驱动 DAG"做编排，框架越来越厚、Agent 行为越来越受限。云起应主动反向——把推理决策下放给 Claude/GPT-5 等基座模型，自身只做 50 行核心循环 + 4 个能力原语 + 安全工具注册表。这与 33 号笔记翁家翌 Heuristic Learning 路线哲学一致："经验存进代码而非权重"，但 HL 是策略代码，Claude Code 是 Harness 代码——两者互补，云起可以把"安全规则 / payload / 检测器"作为 HL 的策略代码，把"执行器 / 权限 / 记忆 / 编排"作为 Harness。
2. **Context 即稀缺资源是云起 SaaS 化的定价线**：客户购买云起 AI 安全产品时，**真正的成本不是席位费而是 token 消耗**。云起销售对话应直接问客户"你现在 Agent 跑一次完整漏洞扫描消耗多少 token / 多少美元"，把 Auto-Compaction + Sub-Agent 隔离 + Prompt Cache 经济学打包成"Token 优化套件"独立计费——参考 Anthropic 内测 Tool Search 减少 85%+ token 开销 / Programmatic Tool Calling 减少 37% token 消耗的数据。
3. **六层记忆架构是云起客户私有化部署的现成蓝图**：政企客户最关心的是"不同部门 Agent 用不同记忆、不串档"。Claude Code 六层（Managed Policy / Project / User / Auto-Memory / Session / Sub-Agent）可直接对应"集团策略 / 业务系统 / 安全工程师 / 历史经验 / 当前调查 / 子智能体专项"。云起的 PRD 应强制要求按此六层结构设计记忆模块，每层独立 MEMORY.md。
4. **权限五档信任光谱是合同分级的现成标准**：云起做政企客户时，给不同层级用户配置不同权限档位（合规审计员 = plan / 一线 SOC = default / 资深安全工程师 = acceptEdits / 红蓝对抗演练 = dontAsk / 应急响应紧急通道 = bypassPermissions）。把 23 项 bash 安全检查作为合同附件附录——这是云起 SOC 平台与开源工具的差异化壁垒。
5. **cch=00000 API DRM 启示云起做客户端身份认证**：当云起的 Agent 客户端被部署到客户内网，如何防止客户内部其他工具伪造云起客户端调用云起 API？Claude Code 的"五字节占位符 + Zig 原生 HTTP 栈替换 + 服务端验证哈希"是直接可借鉴的方案。本质是**HTTP 传输层 DRM**——比通常的 API Key + IP 白名单更难绕过。
6. **Anti-Distillation 机制对应"防止云起 Agent 行为被竞品蒸馏"**：当云起的 Agent 行为日志被客户导出（合法合规需求），如何防止竞品借此训练同类产品？可借鉴"fake_tools 注入 + 推理文本服务端摘要"两层机制。
7. **KAIROS 路线是云起下一代产品形态**：当前云起 SaaS 是"召唤式"——客户登录平台、点击运行扫描。下一代应是"常驻式"——客户的 GitHub / GitLab / 内网代码仓 webhook 接入云起，云起的 Agent 在后台持续运行、夜间记忆蒸馏、第二天提供主动告警。这与 40 号笔记 OpenChronicle "Proactive Agent" 思路同构。

### 可落地的行动项

- **PRD 模板第三次升级**：在云起 Agent 类产品 PRD 强制章节里新增"TAOR 循环行数审计"——评审标准是核心循环 ≤ 100 行，超过则视为"框架对抗模型"，需要重构。
- **Token 经济学独立模块**：云起内部测算所有产品的 token 消耗模型，建立"Auto-Compaction 触发阈值 / Cache-Break 向量数 / Sub-Agent token 隔离率"三项核心指标，作为下季度产品 OKR。
- **六层记忆架构 PoC**：选一个云起当前安全 Agent 模块，按六层记忆架构重构，验证"客户合规策略 / 项目记忆 / 用户偏好 / 自动学习 / 当前会话 / 子 Agent 专项"六层是否能在政企场景跑通。
- **权限信任光谱合同模板**：起草《云起 SOC Agent 权限分级合同附件》，按 plan / default / acceptEdits / dontAsk / bypassPermissions 五档定义合规约束、责任归属、SLA。
- **客户端 DRM PoC**：与云起后端团队 PoC HTTP 传输层 DRM 方案——客户端编译时嵌入二进制签名 / 服务端验证 / 等长占位符无 Content-Length 变化。
- **常驻 Agent 产品规划立项**：在云起下一年度产品 Roadmap 里新增"常驻式安全 Agent"产品线，对标 KAIROS 的 GitHub Webhook + 夜间记忆蒸馏 + Cron 调度形态——这是下一代企业安全 SaaS 的形态分水岭。

### 值得进一步探索

- **TAOR 50 行循环的极限边界**：什么场景下"运行时越笨"会失效？当任务跨越 24 小时、跨越百万级文件、跨越多 Agent 协作时，是否需要更厚的脚手架？34 号笔记郝建业指出 Montezuma 反例（86 步硬编码动作序列）——TAOR 是否也有同类失败模式？
- **六层记忆架构在多租户 SaaS 下的工程化**：每客户每用户每会话都维护独立记忆栈，存储成本与检索延迟如何平衡？Claude Code 是单机本地形态，云起做 SaaS 必须解决多租户隔离 + 记忆共享的张力。
- **cch=00000 DRM 的国密改造路径**：Bun + Zig 是 Claude Code 的技术栈选择，云起做政企客户时是否需要国密算法替代 + 国产芯片栈兼容？这决定了 DRM 路线的可行性。
- **Anti-Distillation 与 AI 透明度的法律边界**：fake_tools 注入和服务端摘要本质上是"对客户隐瞒部分推理过程"，在欧盟 AI Act / 国内《生成式人工智能服务管理暂行办法》下是否构成违规？这是云起做出海或政企客户时必须回答的合规问题。
- **KAIROS 与 MCP A2A 协议的协同**：KAIROS 是单 Agent 常驻形态，A2A 是 Agent 间协议——常驻 Agent 间通过 A2A 协调（如 SOC 调查 Agent + 漏洞挖掘 Agent + 报告撰写 Agent 24/7 协同）是否可行？这是云起做"多 Agent 安全产品矩阵"的技术前提。

## 原文精华

> "Claude Code 更像是一个用于软件工作的操作系统，围绕模型堆叠了权限管理、记忆层、后台任务、IDE 桥接、MCP 管道和多代理编排。"

> "总结来讲：运行时越笨，架构越稳定。把智能下沉到模型，把确定性留给框架。"

> "随着模型变得更强，脚手架应该变薄，而不是变厚。硬编码的脚手架应该随着模型能力提升而被主动删除，架构随时间推移越来越薄。如果你每次模型升级都要往框架里加更多脚手架，说明你在对抗模型，而不是利用模型。"

> "Context 不是越大越好，而是越干净越好。"

> "当你为每个 token 付费的时候，缓存失效不再是计算机科学笑话，更多的是一个财务问题。"

> "记忆是索引，不是存储。能从代码库中重新推导出的信息，绝不应该被存储。"

> "权限设计更像是 UX 设计。"

> "现有的 Claude Code 是一个召唤式 Agent：你打开终端，它来帮你，你关掉终端，它就停了。但 KAIROS 描绘的是下一代形态：Agent 在后台持续运行……第二天一早已经'预热'好了。"

> "There is NO force-OFF. This guards against model codename leaks."（undercover.ts 第 15 行）

---
原文链接：原文为用户直接粘贴正文；Founder Park《看看 Claude Code 怎么做 Harness，这才是 Agent 工程化的真正难点》；二手分析依据 Vikash Rungta 逆向工程博客 + Hacker News 讨论 + 公开镜像仓库 nirholas/claude-code
