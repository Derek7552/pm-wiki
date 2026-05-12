# Coding Agent Harness：让 AI Coding Agent 在大规模组织内稳定工作的工程框架

> 来源：[The Coding Agent Harness: How to Actually Make AI Coding Agents Work at Scale](用户提供原文)
> 提炼日期：2026-04-10
> 分类：AI方法论

## TL;DR

作者认为，AI coding agent 能否稳定产出，不取决于单一模型、IDE 或供应商，而取决于围绕 agent 构建的 **agent harness**：一整套上下文、工具、约束与验证机制。所谓 context engineering，是理论；agent harness，则是把这套理论真正工程化落地的实现。

这套方法的核心不在“让模型更聪明”，而在“让模型每次都处在对的上下文里、拿到对的工具、接受可执行的反馈”。文章把关键抓手归纳为四个杠杆：custom rules、MCP servers、skills、spec driven development，并强调 feedback loop 是让整个系统真正收敛的外部闭环。

## 核心观点

### 1. AI coding agent 的问题，本质上不是模型能力问题，而是“组织化上下文供给”问题

很多团队用 coding agent 效果不稳定，直觉上会归因于模型不够强、IDE 不够好，或者 provider 不够可靠。但作者的判断是：这些都不是一线瓶颈，真正的差异来自 agent harness，也就是团队为 agent 提供了怎样的上下文、工具链和行为边界。

作者用“第一天入职的天才新人”来类比 AI agent：能力强、反应快，但对代码库、架构、规范、流程和组织知识几乎一无所知。现实里，没有人会让一个刚入职的新同学在没有 onboarding 的前提下直接去改复杂系统；但很多团队却默认 AI 可以在极少背景信息下正确完成任务。

因此，context engineering 的意义不是“优化 prompt”，而是像组织 onboarding 一样，系统性提供环境、规则、流程、工具和监督。只有这样，模型能力才能被稳定释放，而不是靠偶发灵感碰运气。

### 2. 约束 AI coding agent 的关键资源不是推理能力，而是 context window

文章强调，当前主流 coding agents——包括 Claude Code、Cursor、Codex——虽然产品形态不同，但内部都共享类似循环：**Read → Plan → Code → Validate → Iterate**。问题在于，这个循环中的每一步都会消耗同一份有限资源：context window。

Context window 不是抽象配置项，而是 agent 当下可操作的“工作台”。系统提示、custom rules、tool schema、对话历史、文件读取结果、终端输出、API 响应、模型自己生成的代码，全都在竞争这个空间。任何与当前任务不相关但被塞进上下文里的内容，都会挤压真正有用的信息。

作者进一步指出，随着上下文膨胀，模型会出现 recall 下降、推理偏移、忽略约束等现象，也就是很多人说的 context rot。甚至有研究认为，当上下文利用率达到约 **60%** 以后，继续塞更多信息不但不会更好，反而会让 agent 表现变差。也就是说，agent harness 的本质工作，是在有限窗口里做精细化信息调度，而不是盲目堆料。

### 3. 真正有效的 harness 不是单一技巧，而是“多杠杆协同 + 反馈闭环”的系统工程

文章将 agent harness 总结为四个核心杠杆：custom rules、MCP、skills、spec driven development。这四者分别解决不同层面的问题：规则约束、外部能力、按需知识/流程注入、任务定义质量。

但作者特别强调，仅靠把这些东西堆上去还不够。真正让 agent 持续进化的，是 context engineering 之外的 feedback loop：测试、lint、类型检查、构建脚本、review agent、hooks 等一切能给出 pass/fail 信号的机制。它们让 agent 不必完全依赖人类逐条指出错误，而可以通过结构化反馈自我修正。

因此，harness 不是“写几份规则文件”这么简单，而是一个围绕 agent 生命周期搭建的收敛系统：前面用 context 把方向校准，后面用反馈把结果收紧。只有这两端同时存在，AI coding agent 才能真正规模化进入组织流程。

## 关键知识点

### 1. Context engineering 是理论，agent harness 是工程实现

作者给出的定义非常值得记住：
- **Context engineering**：在模型生成第一个 token 前，设计并控制它所能看到的一切
- **Agent harness**：把 context engineering 真正落到工具、规则、流程和反馈机制中的结构化系统

这一区分很重要，因为很多团队停留在“会写 prompt”层面，却没有把上下文管理做成可迭代、可部署、可规模复制的工程体系。文章的真正贡献，是把“上下文怎么设计”变成“组织里怎么落地”。

### 2. Context window 的六类主要消耗项

文中明确点出了会持续挤占 agent 上下文的几类内容：
1. **System prompt / custom rules**：每轮都会注入，若不相关就是长期浪费
2. **Tool definitions**：每接一个 MCP server，就会增加 schema 占用
3. **Conversation history**：历史消息线性累积
4. **Tool results**：文件内容、终端输出、API 返回都可能非常长
5. **Agent output**：模型自己写出的代码与解释也占上下文
6. **长链迭代带来的堆积**：每多一次循环，窗口都进一步膨胀

这意味着，很多团队以为自己是在优化 prompt，实际上更该优化的是“哪些信息不该一直存在上下文里”。

### 3. 杠杆一：Custom Rules 是最低门槛、最高 ROI 的起点

Custom rules 指的是像 `CLAUDE.md`、`AGENTS.md`、Cursor rules 这类自动注入上下文的规则文件。作者认为这是大多数团队最该先做的一步，因为它门槛最低，却能快速改变 agent 的默认行为。

适合放进 custom rules 的内容包括：
- 技术栈与架构模式
- 命名规范与代码风格
- 测试哲学
- 代码库中常见坑点
- 已经多次观察到的 agent 反模式

不适合放进去的包括：
- 完整 API 文档
- 空泛废话，如“写干净代码”
- 互相冲突的指令

作者还给出几个非常实操的建议：
- 保持在 **500 行以内**
- 按架构、测试、安全等主题模块化拆分
- 用少量 few-shot example 提升可执行性
- 不要把所有规则都做成 always-on，应该按需加载

这里的关键认知是：custom rules 不是一次性文档，而是随着 agent 犯错不断迭代的“行为调优资产”。

### 4. 杠杆二：MCP 把 agent 从“只懂仓库”升级为“能访问组织知识与系统”的开发成员

没有 MCP 时，coding agent 的能力基本局限于读写文件和执行命令。加上 MCP 后，它能访问更广阔的外部上下文与系统能力，例如：
- 查询数据库结构与数据
- 搜索内部 wiki 与文档
- 获取内部 API 合约
- 调用 CI/CD 或云平台能力
- 读取 Figma 设计稿
- 验证真实实现结果

作者认为，MCP 的本质价值在于：让 agent 能使用和人类开发者接近的信息源与工具面。否则它只是一个“懂代码片段的局部自动机”；接上 MCP 后，它才有机会成为组织级开发流程的一部分。

此外，MCP 不只是信息入口，也能成为验证出口，因为外部系统同样可以返回成功/失败信号，接入 feedback loop。

### 5. 杠杆三：Skills 是最强的 harness 单元，因为它兼具知识注入与可执行逻辑

作者把 skills 描述为 agent harness 中最强大的杠杆。原因在于它不只是静态规则，而是**按需加载的知识 + 可执行脚本 + 可组合行为单元**。

文章强调了 skills 的几个关键特性：
- 只有简短描述常驻上下文，完整内容按需注入，节省 context budget
- 可以封装模板、示例输出、参考文档和执行脚本
- 既可以是 reference skill，也可以是 task skill
- 可以在独立 subagent 中运行，避免主上下文被重任务污染

这说明 skills 的价值不只是“多一份说明书”，而是把复杂、高密度、特定场景下才需要的上下文从 always-on 区域迁移到 on-demand 区域。

### 6. 杠杆四：Spec Driven Development 是最彻底的 harness，因为它直接重写任务输入质量

作者认为，人本身往往是 coding agent 流程中的瓶颈。很多失败并不是 agent 执行错了，而是用户一开始给的任务描述太粗，导致模型只能“猜”。

文章举的例子很典型：用户说“做一个后台新增商品功能”，但没有说明：
- 技术栈是什么
- 后台在哪个模块
- API 合约如何定义
- 数据存储在哪里
- 是否要处理幂等性
- 哪些角色有权限操作

Agent 可能会做出一个“看似能跑的 MVP”，但它未必符合业务的隐含约束。Spec Driven Development（SDD）要解决的正是这个问题：在写代码前，先写清楚规格说明，覆盖功能描述、边界条件、集成方式、验收标准、测试计划等。

作者把 SDD 视为 context engineering 的纯粹形态，因为 spec 本身就成了 agent 的 harness：它在单个或多个文档里，同时承载架构决策、逐步引导和验收约束。

### 7. Feedback loop：所有 pass/fail 信号都是 agent 的外部纠偏系统

作者特别指出，feedback loop 严格来说不属于 context engineering，但它决定整个系统能否真正运转。凡是能输出结构化 pass/fail 信号的机制，都能成为 agent 自修正的依据，例如：
- 测试
- lint
- 类型检查
- 构建脚本
- review agent
- hook

其中一个很有价值的点是 **agent hooks**。如果把验证逻辑挂到 Stop hook，agent 在完成任务前就必须通过这些检查，它不能“建议你去跑一下测试”，而是必须先过门槛。这相当于把规则从软约束升级成了硬约束。

### 8. 组织级实践：MercadoLibre 用标准化规则、内部 MCP 与审查 agent 扩大可用范围

作者来自 MercadoLibre，文中给出了一些大规模实践细节：
- 正在面向近 **20,000** 名开发者、数千个仓库推广相关实践
- **Spec Driven Development** 已有约 **4,000** 名开发者开始采用，但日常习惯改变仍然困难
- 组织维护覆盖 **9+ 技术栈** 的标准化 rules，团队在此基础上叠加仓库级规则
- 自建内部 MCP，对接内部云平台、SDK、RAG 业务知识和应用文档
- 构建独立的代码审查 agent，在 CI 中自动分析每个 PR

这里最值得注意的是：作者并不是在讲“一个厉害的 prompt”，而是在讲一个真正能够跨技术栈、跨仓库、跨团队复制的工程治理方案。

## 数据与案例

### 1. 规模数据：MercadoLibre 的组织级 rollout

文中披露的几个关键规模信息：
- 正在面向 **近 20,000 名开发者** 推广 AI coding agent harness
- 覆盖 **数千个代码仓库**
- Spec Driven Development 已获得 **约 4,000 名开发者** 的内部采用
- 组织内部需要维护 **9+ 技术栈** 对应的标准化规则体系

这些数字说明，作者讨论的不是个人技巧，而是企业级 AI 编程体系的工程化问题。

### 2. 典型失败案例：需求描述过粗导致 agent 交付“错得合理”的实现

文章中的 backoffice 新增商品例子很典型：
- 用户只说“增加一个后台新增功能”
- agent 基于现有代码与 MySQL 存储实现了一个看似可工作的 MVP
- 但再次点击按钮时，出现重复插入
- 问题根因不是 agent 不会写代码，而是初始输入未说明幂等性与角色权限等隐含业务约束

这个案例说明，很多“AI 写错了”的问题，本质是系统没有把隐性业务规则显式化。

### 3. 代码审查 agent 的组织收益

MercadoLibre 的做法是把独立 review agent 接入 CI，对所有 PR——无论人写还是 AI 写——做自动分析，并返回优先级排序后的问题列表。这样带来的结果包括：
- 人类 reviewer 更少花时间找风格或规范问题
- 更聚焦高层设计与架构决策
- 更早发现 bug，降低进入生产的风险
- review 周期更快
- 质量控制能力能随 PR 数量扩展，而不是只依赖 reviewer 人数扩展

这体现了 feedback loop 不只是修 bug，也是在重构组织审查成本曲线。

> ⚠️ 待验证：文中关于“上下文利用率约 60% 后会明显变差”的说法来自作者引用的研究与外部博客线索，并非在当前材料中给出原始实验细节。若后续用于正式对外输出，建议补查原始研究来源。

## 启发与思考

### 1. 对 AI 编程产品的启发：竞争焦点会从“模型谁更强”转向“谁的 harness 更工程化”

如果这篇文章的判断成立，那么未来 coding agent 的差距不会主要来自模型榜单，而会来自 harness 设计能力。谁能把规则、技能、工具、规范、审查和反馈更低成本地组合起来，谁就更有机会在企业场景拿到稳定结果。

### 2. 对团队落地的启发：第一步不要做大而全平台，先从 custom rules 和 skills 开始

作者的建议非常务实：先从最简单的 custom rules 或 coding best practices 技能做起。这背后的逻辑是，组织在早期最缺的往往不是花哨自动化，而是把已有隐性规范显性化。规则和技能先跑起来，后面再逐步接 MCP、spec 流程和 hooks，落地阻力更小。

### 3. 对 PM / 平台团队的启发：Spec 是连接业务语义与 agent 执行质量的核心中介层

很多团队把 spec 当成“给人看”的文档，而这篇文章提示：在 agent 时代，spec 更像机器可执行的上下文编排层。谁能把隐性业务规则、异常路径、角色边界、测试口径写成结构化 spec，谁就能显著降低 agent 的猜测成本。

### 4. 对组织治理的启发：AI coding agent 的规模化，不是工具部署问题，而是工程制度升级问题

当你要在成千上万人、数千仓库里推广 agent，问题就不再是“要不要用某个 IDE 插件”，而是：
- 规则如何分层治理
- 工具如何合规接入
- 反馈如何自动执行
- 不同技术栈如何建立最低统一标准
- 组织知识如何通过 MCP / skill 进入 agent 回路

这本质上更像一次新的开发平台治理工程，而不是普通工具采购。

## 原文精华

> The difference isn't the model, the IDE, or the provider. It's the agent harness: the structured system of context, tools, and guardrails you engineer around the agent so it performs reliably, every single time.

> Your AI coding agent is a brilliant new hire on day one. Fast, eager, and with zero context about your codebase, your conventions, or your architecture.

> The best agent harnesses are designed with this reality at the center: inject the right context at the right moment, avoid polluting the window with irrelevant information, and structure long-running tasks to keep it lean.

> Context engineering isn't just a set of techniques. It's an emerging engineering discipline. And the agent harness is its tangible output.

---
原文链接：用户提供原文（未附原始 URL）
