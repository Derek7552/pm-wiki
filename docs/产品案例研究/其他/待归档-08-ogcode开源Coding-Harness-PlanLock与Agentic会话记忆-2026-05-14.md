---
name: ogcode 开源 Coding Harness：Plan Lock 与 Agentic 会话记忆
description: ogcode 是新出现的开源 AI 编程 Harness，主打"Plan 优先 + TDD + DAG 任务并行 + 人工介入关键节点"工作流，并通过"Agentic Session Memory"声称在长会话中节省约 70% Token，与 claude-code、opencode 形成差异化路线
type: project
---

# ogcode 开源 Coding Harness：Plan Lock 工作流与 Agentic 会话记忆

> 来源：作者 Prasenjeet Symon 推文/帖子（无完整原文 URL，仅有项目仓库 [prasenjeet-symon/ogcode](https://github.com/prasenjeet-symon/ogcode)）
> 提炼日期：2026-05-14
> 分类：产品案例研究/其他

## TL;DR

ogcode 是一款 MIT 协议、完全本地、面向**团队与生产环境**的开源 Coding Harness。它把"Plan 模式 + TDD"作为强制默认入口：先让 planner agent 出一份完整 TDD 设计文档，再由 task planner 拆成"DAG 安全"的任务图，多个可配置的 agent 并行执行；复杂或关键任务可一键派给人类同事。完成后自动开 PR、归档 TDD，下次复用而不是再去全仓搜索。⚠️ 待验证：作者宣称的"Agentic Session Memory"在长会话中节省约 70% Token——目前只有作者自测数据，未见第三方复现。

## 核心观点

### 观点 1：Plan 强制前置 + TDD 归档，是与 claude-code / opencode 最关键的差异化

claude-code、opencode 这类通用 Harness 默认让模型直接动代码，Plan/Spec 只是可选模式。ogcode 反过来——**Plan 模式是默认入口**：用户描述需求 → 模型出 plan → 用户审阅 → 点击 "Lock Plan" → planner agent 生成完整的 TDD（Technical Design Document）→ 再进入执行。任务完成后 TDD 不会被丢弃，而是**归档为可检索的设计资产**，下次改 bug 或加功能时优先读归档 TDD，而不是重新对全仓做语义搜索。作者宣称这条路径更便宜也更不容易跑偏（"faster, cheaper, always on track"），核心动机是把 AI 编程从"一锤子生成"扳回到"软件工程式迭代"。

### 观点 2：DAG 任务编排 + 人在环（HITL），目标是把 AI 编程推向生产级团队场景

Lock Plan 之后，task planner agent 会把 TDD 拆成一组**DAG 安全**（即依赖关系清晰、可识别可并行执行的）的任务节点。每个节点由相应的 coding agent 接手，可并行推进。对于复杂或关键任务，用户**一键转派给真人同事**——这就是作者反复强调的"human in the loop on critical things only"。ogcode 默认场景不是"个人玩具"，而是"团队 + 生产环境"：任务完成自动开 PR，agent 在日常 standup 中用自然语言汇报进度，用户像跟队友一样给反馈。这是它和单机 IDE 插件型 Harness 在定位上的根本区别。

### 观点 3：Agentic Session Memory——把"全量历史"换成"按需检索"，从 Harness 内核改写上下文

⚠️ 待验证：ogcode 提出的 Agentic Session Memory 不是把消息塞进 prompt，而是在 agent 循环层**主动抽取、存储、检索**当前 query 真正需要的上下文片段。作者列出三点收益：① 长会话约 70% Token 节省；② 无实际会话长度/代码库规模上限（"Infinite Context"）；③ 每轮只检索相关记忆，准确率反而更高。

作者特别回应了"这能不能用 Skills 实现"的问题：**不能**——Skills 是宿主 Harness 提供的扩展点，而要实现按需上下文必须改 agent loop 本身，所以他先尝试 fork opencode 但因架构限制放弃，最后**从零重写**。这一点解释了为什么 ogcode 不是另一个 fork，而是独立工程。

## 关键知识点

### 1. ogcode 的核心工作流（Plan-Lock-DAG-Archive）

完整链路：

1. **用户描述需求** — 不是"帮我写一个 X"，而是"帮我规划一个 X"
2. **AI 出 Plan** — 类似多数 Harness 的 plan mode 输出
3. **用户审阅 → Lock Plan** — 一旦锁定，进入受控执行轨道
4. **planner agent 生成 TDD** — 完整的技术设计文档（不是 to-do list，而是设计契约）
5. **task planner agent 拆分 DAG** — 任务节点 + 依赖关系，并发安全
6. **执行 agent 并行推进** — 可配置 agent 池，按任务类型分配
7. **人在环开关** — 复杂/关键任务一键转给人类同事
8. **完成 → 自动 PR + TDD 归档** — TDD 成为下一次需求的检索源

### 2. 配置点（用户可干预的部分）

- **执行 agent 池**：可配置参与的 agent，理论上可按能力域分配（例如 UI/UX 一个 agent、C++ 重型工程另一个）
- **关键任务派人**：每个 DAG 节点都可以"一键转人"
- **多 Provider 支持**：MIT 协议、完全本地、支持多模型供应商（具体清单需看 repo README）

### 3. Agentic Session Memory（核心实验性能力）

| 维度 | 传统 Harness（如 claude-code / opencode） | ogcode |
|------|----------|--------|
| 上下文构造 | 每轮把会话历史完整塞入 prompt | 抽取-存储-检索，按 query 召回相关记忆 |
| Token 消耗 | 随会话线性增长 | 与会话长度近似解耦 |
| 长会话表现 | 容易撞 Token/上限、丢失早期上下文 | 声称无实际上限 |
| 改造位置 | Skills/Hooks 等扩展点 | **agent loop 内核** |

⚠️ 待验证：~70% Token 节省、"Infinite Context"等数据**目前只有作者自测**，未见第三方复现。作者本人也承认"Actual savings vary based on codebase complexity and conversation patterns"。引用时应保留这一限定。

### 4. 远期愿景：实时 LLM Benchmark + Agent 团队管理

作者把 ogcode 的下一步定位为**"用真实任务实时给 LLM 打分"**的开放基础设施：

- 用户为 agent 池里每个 agent 绑定专长（UI/UX、C++、…）+ 模型（高端/低端）+ 系统提示词
- 再指派一个"高端模型 reviewer"作为 senior agent，对所有任务执行情况打 1–10 分并写反馈
- 这些评分/反馈反过来给低端模型作为提示，提升后续任务质量
- 全球用户的真实任务汇聚后，相当于**实时世界级 LLM 基准测试**，作者计划按周发布榜单（"未定")

### 5. 作者立场（值得记住的两个尖锐判断）

> ⚠️ 待验证（属于个人观点而非事实）：
>
> 1. "All those harness, be it claude-code, opencode will burn your token like water, because they have no interest in saving and optimising token consumption, it is against their business goal." — 作者认为商业 Harness 没有动力优化 Token，是利益冲突。
> 2. ogcode "has nothing to do with money - it support multiple providers and free to use forever." — 强调免费 + 多供应商，作为差异化定位的一部分。

这两点是带立场的论断，引用时要明确标注是作者观点而非客观结论。

## 数据与案例

- **MIT License**、**完全本地**、**多 Provider 支持**（来源：作者帖子，仓库 README 可进一步核实）
- **~70% Token 节省**：作者自测，长会话与复杂任务场景，未公开测试方法（来源：作者帖子；⚠️ 待第三方验证）
- **作者背景与项目来源**：作者本人在帖子里说"我先 fork 了 opencode，但 opencode 的内部设计选型不适合 ogcode 的目标，所以放弃 fork、从零重写"——这是一个有意义的工程决策案例
- **GitHub 仓库**：[github.com/prasenjeet-symon/ogcode](https://github.com/prasenjeet-symon/ogcode)（社区式分发，作者最初通过 DM 给链接，后因请求量大公开）

## 启发与思考

### 1. "Plan 默认 + TDD 归档"是值得 PM 角度认真对待的产品决策

对比看 claude-code：plan mode 是用户**主动**进入的状态；ogcode 把它做成**默认入口**，这不是一个交互细节，而是工作流哲学的反转——**先让模型做软件工程，再让它写代码**。对 AI PM 来讲，这印证了一个判断：高质量 AI 编程产品的关键不是模型多强，而是**工作流的强制约束**。AI 一旦被允许"先写起来再说"，几乎必然走偏。

可落地的反思：我们自己设计 AI 编程/Agent 类产品时，**默认模式**应该是哪一种？是 "AI 立刻动手" 还是 "AI 先出 plan"？默认值就是产品观点。

### 2. TDD 归档作为长期资产，是对"AI 编程上下文崩溃"的另一种解法

主流 Harness 处理上下文崩溃的方式是：① 压缩历史、② 子 agent、③ RAG over codebase。ogcode 选择**显式沉淀产物（TDD）**作为可检索资产。这跟 RAG 的差别是：RAG 检索的是代码（事实），TDD 检索的是**当时的设计意图与决策**——前者告诉你"是什么"，后者告诉你"为什么"。对长生命周期项目而言，意图比事实更稀缺。

值得我们在 pm-wiki 自身这种"长期知识库 + AI 协作"场景里也试一下：每个 commit 之前先沉淀一份决策小卡片，下次让 AI 改的时候优先喂这个，而不是丢整个文件树。

### 3. "Agent 池 + Senior Reviewer + 实时打分"是一种新型团队结构想象

如果这个愿景真做出来，意味着 AI 编程团队的形态从"我和一个全能 agent"变成"我管理一个有专长分工 + 内部评审的 agent 团队"。这对 PM 的能力要求是不同的——**前者要会 prompt，后者要会组织设计**。是否值得 follow，取决于 agent 调度成本是否真能降到值得这么搞的程度。

### 4. 值得追踪的几个开放问题

- TDD 归档对**真实仓库**的检索召回率如何？归档文档过多会不会自己变成新的上下文负担？
- Agentic Session Memory 的具体实现是基于向量检索还是结构化抽取？召回失败时的 fallback 是什么？
- DAG 拆分能不能保证"语义安全"（功能解耦）而不只是"依赖安全"（编译可并行）？真实大型重构里大量耦合点很难只靠依赖图避免冲突。
- "实时 LLM benchmark" 如果真上线，数据归属与隐私如何处理？团队/生产场景里没人愿意把代码任务数据共享出去。

## 原文精华

> "In ogcode, plan mode is the default. Whenever you touch the codebase, you start with planning first — clear, well-documented TDD before a single line of code. Projects move forward one TDD at a time."

> "When tasks finish, ogcode raises PRs automatically and archives the TDD. Next time you fix bugs or add features, it references archived TDDs instead of searching the repo — faster, cheaper, always on track."

> "Instead of sending the entire conversation history per turn to the LLM (which quickly becomes expensive and hits token limits), Ogcode intelligently extracts, stores, and retrieves only the relevant context needed for each query."

> "To achieve what ogcode is trying to do you need to do modification at agent loop level… opencode internal design choice is not suitable for ogcode. Hence started this project from scratch."

---

原文链接：作者帖子（无固定 URL）
项目仓库：https://github.com/prasenjeet-symon/ogcode
