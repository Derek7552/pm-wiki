# Agent Memory 架构：Raw Ledger + Views + Policy 三件套

> 来源：阿里妹导读（作者个人技术实践与独立思考）
> 提炼日期：2026-04-10
> 分类：AI方法论

## 核心观点

**Memory 不是存储，而是闭环系统**：Memory 的本质是"把历史转成当前可用信息"的通道，价值不在于存了多少，而在于历史到当前决策的通道是否有效。最小闭包是 `Raw Ledger → Views → Policy → Commit → Provenance` 的完整闭环，三者缺一不可。

**System 2 是必要的外置记忆系统**：记忆能力与 LLM 通用 Agent 能力相对正交，把记忆能力外置为 System 2 可换来可插拔、可迁移、可归因等工程好处，值得牺牲一定理论上限。

**非参数化 Memory 可以逼近参数化效果**：通过 JitRL（优势函数加性调制 logits）+ UMEM（语义邻域迁移）等机制，非参数化方案可逼近 fine-tune 效果，上限由三类瓶颈决定：接口带宽、检索聚合误差、policy 可学习性。

## 关键知识点

### 三大核心命题

**命题 A：Memory = 可被决策利用的外部状态（非存储）**
- "存了很多历史"不等于能力，能力来自历史能否影响当前决策分布
- Memory 输出要么进入上下文（证据/摘要/子图），要么直接参与决策（logits 调制）

**命题 B：Memory 最小闭包 = (Ledger, Views, Policy) 三件套**
| 组件 | 类比 | 职责 |
|------|------|------|
| Raw Ledger | 账本/黑匣子 | 追加式记录所有写入/更新/删除动作，append-only |
| Derived Views | 缓存+索引+物化视图 | 面向检索的派生状态（向量/BM25/KG/TKG/timeline/skill index），lossy 但可回指 Ledger |
| Policy | 调度器/控制回路 | 决定何时读/写/更新/遗忘，输出必须是可记录/可回放的 Action 序列 |

**命题 C：基本单位是 event 序列，但 event 流 ≠ 可用系统**

最通用的 Ledger event 包含：
- scope（用户/会话/任务）
- 时间戳
- 输入观测（messages/环境状态）
- 系统动作（含 Memory Tool 动作）
- 记忆变更（ADD/UPDATE/DELETE/NONE）
- 反馈信号（可选：reward/评分/任务成败）
- 决策元数据（可选：candidate_set/provenance/early stop 阈值）

> event 是 Ledger 的数据形态；views/policy 是能力形态

### System 1 + System 2 架构

```
User/Env IO → System 1 (LLM + tools + planner) → Output
                    ↑
              retrieved_context + provenance
                    ↑
              memory_tool(query, ctx)
                    ↓
System 2: Agentic Memory (Slow Loop)
  PreThink → Retrieve(loop) → Evidence Accumulate → Early Stop(conf≥τ)
                ↓
          Memory Infra
           - Raw Ledger
           - Derived Views (Vector/BM25/KG/Timeline)
          Guarantee: 100% provenance
          Sandbox: N 策略并行
          Observability: trace/log/metrics
```

**为什么记忆能力与 LLM Agent 能力"相对正交"：**
- 同一 base model 接入不同 RAG/长期记忆策略，长程任务表现显著不同
- 同一套记忆 infra 可服务多种不同 base model（可迁移）
- 分别优化两块时不会出现大规模互相干扰与能力退化

### 非参数化逼近参数化的三类瓶颈

| 瓶颈 | 说明 | 治理方向 |
|------|------|----------|
| 接口带宽 | token 预算/注意力容量有上限，外部记忆再大也没用 | 记忆固化压缩、分层记忆、latent token 提高信息密度 |
| 检索聚合误差 | views 是近似结构，错检/漏检/时序冲突污染修正项 Δ | 可观测+可溯源+可回放，迭代降低误差 |
| policy 可学习性 | 写多污染、写少学不到；UPDATE/DELETE 错一次会滚雪球 | RL 训练 + protocol 候选集合约束 + sandbox A/B |

> policy 是最常被低估的瓶颈

### 时序是架构的结构维度（非 metadata）

**Bi-temporal 双时态：**
- `valid_time`：事实在世界中何时为真
- `transaction_time`：系统何时写入/更正（与 append-only ledger 一致）
- 两者不等价：今天可以纠正上周的事实

**遗忘的三层抑制机制（顺序不可颠倒）：**
1. `validity gating`：硬门控，不在有效窗口内的事实不进候选集
2. `tombstone`：可审计抑制，append-only 撤回某条记忆的可见性
3. `decay`：软权重，在有效集合内做偏好排序

**时间地基瓶颈（新增第四类）：**
- 时间归一化在 fast path 错了 → 上层所有 view 被污染
- LLM 天然倾向合理化错误时间，很难自洽修复
- 时间解析/归一化应作为一等公民组件：非 LLM、可重放、输出置信度

**consolidation 的第一原则：不跨越变更点**
- 不带时间结构的固化 → 抽象跨期混合 → current 变得不可靠

### 程序性记忆（Procedural Memory）：从"知道"到"会做"

**ProcMEM（中科院 2026.02）的 Skill-MDP 三阶段：**

1. **生成（语义梯度）**：对技能的触发/执行/终止做事后归因，产出自然语言更新建议（非参数化梯度上升，更新对象是技能文本而非权重）
2. **验证（PPO Gate）**：用历史轨迹估计候选技能是否提升高优势动作概率且不偏离原技能，过滤激进候选
3. **维护（在线得分）**：按技能对回报的边际贡献累计得分，长期为非正则淘汰，容量超限则剪枝冗余技能

经验记忆三要素：可执行性 + 可复用性 + 非参数化优化

### Memory 整合层（Integration Layer）

**核心问题：外部记忆与 LLM 内部表示的"阻抗匹配"**

- 传统路径：外部内容 → 文本化 → 拼接上下文 → 模型重新编码（有损耗）
- 新方向（2026）：Machine-Native 记忆形态，绕开文本中间层

| 工作 | 思路 | 注意点 |
|------|------|--------|
| LycheeMemory | 压缩为潜层 token 直接注入 KV-Cache | 可读性弱，更需要 provenance 兜底 |
| MemAdapter | 生成式子图检索 + 零样本跨范式对齐 | 对齐质量不足时错误隐蔽，需 sandbox A/B |

**Memory tokens 三要素（缺一不可）：**
1. 表示（Representation）：machine-native/latent，压缩且保真
2. 对齐（Alignment）：异构记忆映射到 LLM 语义空间
3. 控制与治理（Governance）：注入哪些/多少/何时，出错可溯源回滚

### 架构五件套（Linux 风格抽象）

| 组件 | 类比 | 核心职责 |
|------|------|----------|
| 内核（Kernel） | scheduler + syscall dispatcher | Policy 慢回路，把查询编译为 Memory "系统调用"序列，决策可记录/回放 |
| 文件系统（File System） | storage plane | Raw Ledger + Derived Views，承载时序一致性、语义压缩、分层固化，保留可溯源链路 |
| 可执行文件（Executable） | skill plane | 经验固化为可执行/可验证/可治理的技能单元，复用"怎么做" |
| 总线接口（Interface） | context bridge | 外部状态低开销低失真注入推理核心，支持可观测与溯源 |
| 学习引擎（Learning Engine） | online adaptation | 不更新权重的前提下，把交互反馈转化为优势调制/技能演化/检索策略改进 |

## 数据与案例

- **InfMem 自适应早停**：当累积证据置信度达阈值立即停止检索，推理速度提升 3.9 倍
- **SimpleMem 固化**：约 1/4 Token 消耗击败全量上下文模型（长时序多轮对话）
- **Zep/Graphiti TKG**：时序 KG 相比传统 RAG 在长时序记忆评测上提升 18.5% 准确率
- **MAGMA 时间骨干消融**：移除时间骨干后评判分数从 0.700 降至 0.647
- **ProcMEM**：技能池可压缩到数百 token 级别，跨任务/跨 LLM 主干仍可复用

## 启发与思考

- **设计 Memory 系统时，先问"policy 是否可训练/可 A/B"**，而不是先选存储后端——policy 是最容易被低估的瓶颈
- **时序不是加个时间戳就完了**：bi-temporal + time-sliced recall 需要在架构层硬约束，不能指望 LLM 自洽处理时间冲突
- **遗忘的设计要分三层**：validity gating → tombstone → decay，顺序不能错
- **评估 Memory 系统健康度的思路**：分别定位三类瓶颈（带宽/检索误差/policy），在 sandbox 中各自对应可观测指标
- **对 PM 的启发**：如果在做 AI 产品中涉及"用户记忆/个性化"功能，需要从架构层就设计 Ledger + Views + Policy，而不是一个向量库 + prompt

## 原文精华

> Memory 的价值不在于"存了多少历史"，而在于这条从历史到当前决策的通道是否有效。

> event 是 Ledger 的数据形态；views/policy 是能力形态。

> 非参数化 Memory 的真正"上限瓶颈"往往不是存储后端，而是 policy：写多了污染、写少了学不到；UPDATE/DELETE 做错一次，长期就会滚雪球。

> consolidation 的第一原则不是更抽象，而是不跨越变更点。

> 过程记忆的关键不是"存下来"，而是"可执行 + 可验证 + 可治理"。

---
原文来源：阿里妹导读（用户粘贴）
涉及论文：AgeMem、InfMem、ProcMEM、JitRL、UMEM、SimpleMem、Zep/Graphiti、MAGMA、LycheeMemory、MemAdapter、MemWeaver
