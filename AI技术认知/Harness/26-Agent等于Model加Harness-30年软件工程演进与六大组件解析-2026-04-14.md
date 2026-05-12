---
title: Agent = Model + Harness — 30年软件工程演进与六大组件解析
date: 2026-04-14
category: AI方法论
tags: [Harness, Agent工程, 软件架构, 复杂性管理, Claude Code]
source: Datawhale（黄佳，新加坡科研机构AI研究员，《动手做AI Agent》《Agent设计模式》作者）
---

## 核心命题

> **Agent = Model + Harness**

模型智力已经在线（2026年中外大模型能力均已超越普通人类水平），现在的竞争不在模型本身，而在 Harness——**包裹模型运行的全部基础设施**。

DeepMind Agents 团队的实验已验证：固定同一个模型，仅替换 Harness，性能可产生巨大差异。Harness 是战略级别的资产。

---

## 历史必然性：30 年软件工程演进

软件工程的本质是**驾驭复杂性**，核心手段永远是**抽象 + 结构化**。复杂性的中心每隔数年就发生转移：

| 年代 | 代表作 | 驾驭的对象 | 核心问题 |
|------|-------|----------|---------|
| 1994 | GOF《Design Patterns》 | 对象 | 类的生命周期、对象职责与协作 |
| 2002 | Martin Fowler《企业应用架构模式》+ Eric Evans《DDD》 | 企业架构 | 系统分层、业务边界、领域模型 |
| 2010 | 微服务时代 | 分布式通信 | 几十个微服务间的消息传递、一致性 |
| 2017 | Martin Kleppmann《DDIA》 | 数据系统 | 数据分区、复制、时间空间维度流动 |
| **2026** | **Harness Engineering** | **智能体（不确定性系统）** | **可控性、自主性与人类监督的平衡** |

**关键洞察**：Agent 是历史上第一次需要驾驭**概率机器**——你给它输入，不一定按你的预期输出。Harness 就是驾驭 Agent 的缰绳。

---

## Agent 工程的三次跃迁

```
2023  Prompt Engineering
      ↓ 怎么让模型理解我（CoT、角色设定）

2024-2025  Context Engineering
           ↓ 给模型什么深度，就得到什么深度（RAG、企业知识库）

2026  Harness Engineering
      ↓ 设计可控的系统：循环策略、工具、质量审核、分发治理
```

Context Engineering 是必要但不充分的，Harness Engineering 的核心词是：**可控**。

---

## Harness 六大核心组件

| 组件 | 功能 | 类比 |
|------|------|------|
| **Agentic Loop** | 接受输入 → 工具执行循环 → 返回结果，复杂行为从简单循环中涌现（源自 ReAct 论文） | 心脏 |
| **Tool System** | 调用外部工具和 API，扩展 LLM 的行动范围进入现实世界 | 手脚 |
| **Memory & Context Management** | 上下文压缩、记忆管理（Claude Code 在此领域领先） | 记忆 |
| **Guardrails** | Allow / Deny / Ask，权限控制缰绳 | 刹车 |
| **Hooks** | 守卫机制，事件前后拦截执行（如防止上传 .env 文件） | 哨兵 |
| **Session** | 会话连续性与运行时机制控制 | 骨骼 |

> 底层是无状态的纯推理大模型；Harness 做的是把大模型的大脑变成 Agent 的身体。

---

## Harness 解决的五大落地难题

1. **无限循环问题** — Agentic Loop 设置终止条件
2. **上下文爆炸问题** — 压缩策略与滑动窗口管理
3. **权限失控问题** — Guardrails 的 Allow/Deny/Ask 三级控制
4. **质量不可控问题** — 循环内嵌入质量审核节点
5. **成本不透明问题** — Token 追踪与预算约束

---

## 当前 Harness 生态格局

**纵深型（深度工程开发）**
- **Claude Code**：公认 #1，少而精的工具设计、极强的 Context 压缩能力；Sub-agent、Skill、Topic 分类、MCP 均由其率先提出
- **Codex（OpenAI）**：代码能力极强，开源，适合做 review；常见搭配：Claude Code 编码 + Codex review

**横向型（自动化运营）**
- **OpenClaw、Hermes**：对接 WhatsApp、飞书等，适合做自动运营、信息采集

**其他玩家**
- Cursor、Windsurf：编码 IDE（Claude Code 出现前的主流）
- OpenCode：Claude Code 开源平替，配合 DeepSeek 成本低，适合简单任务

---

## 工程师的能力转型

**码农 vs 工程师的本质区别：**
- 码农：写代码 → 可被 Agent 替代
- 工程师：设计并驾驭复杂系统 → 不可替代

**Agent 时代工程师的核心能力：**
1. 系统复杂性的理解深度（IT 系统理解有多深，走多远的分水岭）
2. 抽象和结构化思维（把混乱中的本质抓出来）
3. 驾驭不确定性（设计可控系统而非任由 Agent 失控）
4. 业务深度（懂业务是护城河，AI 越强，业务理解越稀缺）
5. 深度交互能力（你给模型的深度决定你从模型得到的深度）

**一句话**：你做的事情永远不是在给系统编码，你是在设计并控制这个系统。

---

## 关联笔记

- [06-Anthropic构建高效Agent-五种工作流与克制哲学](./06-Anthropic构建高效Agent-五种工作流与克制哲学-2026-04-03.md)
- [16-Coding-Agent-Harness-规模化落地的四大杠杆与反馈闭环](./16-Coding-Agent-Harness-规模化落地的四大杠杆与反馈闭环-2026-04-10.md)
- [17-汤道生-AI正式进入Harness时代-发动机线束驾驶员三角框架](./17-汤道生-AI正式进入Harness时代-发动机线束驾驶员三角框架-2026-04-13.md)
- [22-HarnessEngineering深度解析-Agent治理时代的系统工程学](./22-HarnessEngineering深度解析-Agent治理时代的系统工程学-2026-04-13.md)
