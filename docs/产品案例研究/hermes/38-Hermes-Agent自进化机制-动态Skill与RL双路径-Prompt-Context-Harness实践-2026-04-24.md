# Hermes Agent 自进化机制：动态 Skill 与 RL 双路径 + Prompt/Context/Harness 实践

> **来源**：阿里技术公众号「项目深度解析」系列第3篇（基于 Hermes Agent 源码分析）
> **日期**：2026-04-24
> **标签**：#Agent架构 #自进化 #强化学习 #SkillGeneration #HarnessEngineering

---

## 一句话总结

Hermes Agent 通过**动态 Skill 生成（外挂式经验沉淀）+ RL 训练闭环（权重内化）**两条路径实现"自进化"，在继承 OpenClaw/Claude Code 的 Prompt/Context/Harness 基础设计上，增加了比例阈值压缩、模型异构适配、14 类错误自愈等差异化工程实践。

---

## 核心知识点

### 1. "内外"双路径自进化体系

| 路径 | 机制 | 特点 | 类比 |
|------|------|------|------|
| **外部路径：动态 Skill 生成** | 每次任务后自动复盘 → 抽象为结构化 Skill 文件 | 即时生效、可人工干预、可解释 | "记笔记" |
| **内部路径：RL 训练闭环** | Teacher 模型蒸馏 → GRPO 算法训练 → 模型权重更新 | 深层能力提升、需算力、异步 | "练内功" |

**关键区别**：Skill 生成不改变模型权重，只是扩充外部知识库；RL 训练才是真正改变模型本身的能力。

### 2. 动态 Skill 生成机制

#### 触发机制
- `_iters_since_skill` 计数器：连续 **10 轮对话**未创建/修改 Skill → 系统主动"催促"
- 与 OpenClaw/Claude Code 的区别：后者 Skill 是**静态的**（预先编写/安装），Hermes 是**动态生成 + 持续优化**

#### 后台审查 Agent（`_spawn_background_review`）
每次主 Agent 回复后，后台异步 Fork 轻量级 Agent 实例，从三个维度复盘：

| 审查维度 | Prompt | 产出 |
|----------|--------|------|
| 记忆审查 `_MEMORY_REVIEW_PROMPT` | 这段对话有什么值得记住的？ | 长期记忆 |
| 技能审查 `_SKILL_REVIEW_PROMPT` | 这个任务模式值得变成 Skill 吗？ | 新 Skill / 更新 Skill |
| 综合审查 `_COMBINED_REVIEW_PROMPT` | 有什么可以改进的？ | 优化建议 |

> **设计模式**：前台即时响应 + 后台异步进化，用户无感知。

### 3. RL 训练闭环（Research-Ready Pipeline）

#### 四阶段流程

```
① 任务定义 → ② 轨迹捕获 & 数据合成 → ③ 渐进式训练 & 评估 → ④ 模型固化/迭代
```

#### Agent 轨迹组织
- 统一采用 **ShareGPT 格式**（`from: system/human/gpt/tool`），兼容 LLaMA-Factory/FastChat/OpenChat 等主流训练框架
- "gpt" 标签是**行业历史约定**，非 GPT 模型训练时框架会自动映射到正确的 assistant token
- 三个核心预处理函数：
  - `save_trajectory`：JSONL 追加存储
  - `convert_scratchpad_to_think`：`<REASONING_SCRATCHPAD>` → `<think>` 格式标准化
  - `has_incomplete_scratchpad`：质检过滤截断数据

#### 批量数据生成（`batch_runner.py`）
- Teacher 模型默认 `claude-opus-4.6`，并行处理提示词
- **工具集随机采样**：每次随机不同工具组合，避免死记硬背
- **零推理过滤**：`<REASONING_SCRATCHPAD>` 和 `reasoning` 都为 0 的样本直接丢弃
- SWE 垂直场景有专门的 `mini_swe_runner.py`

#### 轨迹压缩（`trajectory_compressor.py`）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `target_max_tokens` | 15250 | 压缩后 Token 上限 |
| `protect_last_n_turns` | 4 | 尾部保护轮数 |
| `summarization_model` | `gemini-3-flash` | 轻量摘要模型 |

**压缩算法**：头部保护区（首轮系统/人类/助手/工具）+ `[CONTEXT SUMMARY]` 摘要替换中间区 + 尾部保护区（最后4轮）

#### GRPO 算法（源自 DeepSeek R1）
- 核心思路：同一问题生成 8~16 个回答 → 奖励函数打分 → 学习多产高分/少产低分
- **不需要单独训练 Reward Model**，用规则化奖励函数即可

#### 奖励函数设计黄金法则

| 维度 | 权重 | 衡量 |
|------|------|------|
| 正确性 | **2.0** | 最终答案是否正确 |
| 格式规范 | 0.5 | 是否遵循结构 |
| 渐进格式 | 0~0.5 | 部分符合也给分 |

- 组合 3~5 个奖励函数，正确性权重最高
- 通过 `ToolContext` 机制可做**真实验证**（编译代码、访问网络等），不仅是文本匹配

#### RL 训练的真正目的
> **不是从用户数据中学习，而是知识蒸馏** —— 把大模型（Claude Opus）的 Agent 能力压缩到小模型（Qwen 3~4B）

- **降本**：本地部署无 API 费用
- **提速**：小模型推理快
- **合规**：数据不出机器
- 不直接用用户数据训练的原因：**隐私问题** + **质量参差不齐会把模型训废**

---

### 4. Prompt Engineering 差异点

#### 模型异构工具使用强制指导

```
agent.tool_use_enforcement 配置：
├── "auto"（默认）→ 根据模型名自动判断
├── true → 强制注入
├── false → 不注入
└── ["gpt", "gemini"] → 只对列表中的模型注入
```

| 模型 | 问题 | 注入策略 |
|------|------|----------|
| Claude | 天然擅长工具调用 | 一般不需额外提醒 |
| GPT/Codex | "只说不做" | 强制"用工具执行，不要只描述" |
| Gemini/Gemma | 路径粗糙 | 强调绝对路径、先读后改、并行调用 |

#### 生态兼容（极低迁移成本）
- **OpenClaw**：直接读取 `AGENT.md`/`SOUL.md`/`USER.md`
- **AI Coding**：支持 `CLAUDE.md`/`.cursorrules`/`.cursor/rules/*.mdc`
- **多 IM 平台**：WhatsApp/Slack 等适配提示词

---

### 5. Context Engineering 差异点

#### 比例阈值压缩（vs OpenClaw 绝对阈值）

| 特性 | OpenClaw | Hermes |
|------|----------|--------|
| 触发方式 | 固定 Token 数（如 18K/20K） | **占窗口比例**（默认 50%） |
| 泛化能力 | 切模型需调配置 | 自动适配任意窗口大小 |
| 例子 | 达到 18K Token 触发 | 200K 窗口 × 50% = 100K 时触发 |

#### 两种压缩对比

| 特性 | 上下文实时压缩 | 离线轨迹压缩 |
|------|----------------|--------------|
| 运行时机 | 对话进行中 | 对话结束后 |
| 目的 | 保持对话可继续 | 准备训练数据 |
| Token 目标 | 降到窗口 50% 以下 | 精确到 15250 |
| Token 计数 | 粗略（4字符≈1Token） | HuggingFace Tokenizer 精确 |
| 总结器 | 同模型 | Gemini Flash |

#### Memory 混合架构

| 层级 | 存储 | 内容 | 特点 |
|------|------|------|------|
| 内部记忆 | `MEMORY.md`/`USER.md` + SQLite | 长期事实 + 完整对话历史 | 稳定可控、可人工编辑 |
| 外部记忆 | Mem0/Honcho/Hindsight 等 | 向量检索、语义关联 | 跨系统迁移、弹性扩展 |

- Memory 注入时用 `<memory-context>` 标签包裹，避免模型混淆
- SQLite 存完整对话历史（OpenClaw 存 Chunk 索引），为 Skill 生成和 RL 训练提供数据资产

#### @符号上下文注入（Context Injection）
绕过工具调用直接"硬注入"上下文：`@file:main.py` / `@diff` / `@url:...` 等，省去 Agent 推理+工具执行的中间环节。

---

### 6. Harness Engineering 差异点

#### 14 类结构化错误分类与自愈

| 错误类型 | 典型场景 | 恢复策略 |
|----------|----------|----------|
| `auth` / `auth_permanent` | API Key 无效/账号封禁 | 重试/终止 |
| `billing` | 额度用完 | 通知用户 |
| `rate_limit` / `overloaded` | 限流/服务器忙 | 退避重试 |
| `context_overflow` | 消息太长 | 触发压缩 |
| `timeout` / `server_error` | 网络/5xx | 重试 |
| `model_not_found` / `format_error` | 配置错误 | 修正 |
| `thinking_signature` / `long_context_tier` | Anthropic 特有 | 特殊处理 |

#### 子 Agent 沙箱隔离

```python
DELEGATE_BLOCKED_TOOLS = {
    "delegate_task",   # 防递归
    "clarify",         # 防嵌套提问
    "memory",          # 防操纵记忆
    "send_message",    # 防消息劫持
    "execute_code"     # 防代码执行权限升级
}
MAX_CONCURRENT_CHILDREN = 3   # 最多3个并行子Agent
MAX_DEPTH = 2                 # 最多2层嵌套
```

#### 安全护栏
- **防 Prompt 注入**：内置检测机制
- **Skill 安全扫描**：加载前静态代码分析

#### 全生命周期 Hook
`on_agent_start` → `on_turn_start` → `on_tool_call` → `on_tool_result` → `on_pre_compress` → `on_memory_write` → `on_delegation` → `on_agent_end` → `on_session_end`

---

## 关键洞察

### Agent 发展三阶段
1. **早期 Agent**：被动式一问一答
2. **自主 Agent**（OpenClaw/Claude Code）：自主规划+工具调用，完成复杂长周期任务
3. **自进化 Agent**（Hermes）：执行中学习，越用越强

### "自进化"的边界与误区
- ❌ **Hermes 不会自动从用户对话数据训练模型**（营销号误导）
- ✅ RL 训练本质是 **Teacher 模型知识蒸馏到小模型**
- ✅ 动态 Skill 才是面向用户场景的即时进化手段
- 如果要用历史对话提升模型，需**人工导入 + Teacher 参考合成 + 质量把关**

### 设计哲学：站在巨人肩膀上的增量创新
- Prompt/Context/Harness 三层与 OpenClaw/Claude Code **高度相似**
- 差异化集中在：**自进化机制**、**模型异构适配**、**比例阈值压缩**、**生态兼容**
- 竞争策略：支持 OpenClaw 无缝迁移，降低用户切换成本

---

## 与已有知识的关联

- **Agent Harness 六层架构**（笔记 #06/#07）→ Hermes 的 Hook/错误分类/子 Agent 隔离是 Harness 层的典型实现
- **Agent 记忆模块设计四类记忆**（笔记 #10）→ Hermes 的内外双驱 Memory 架构是实际落地案例
- **Claude Code 源码 Harness 解读**（笔记 #19）→ 对比参照，Hermes 继承了四级权限和多 Agent 模式
- **OpenClaw 架构深度拆解**（笔记 #17）→ Hermes 在沙箱隔离/记忆搜索上的继承与演进
- **RAG Chunk 切分三代演进**（笔记 #04）→ 轨迹压缩的"头尾保留+中间摘要"与 Chunk 切分的语义感知思路同源
- **Karpathy AutoResearch 可验证性原则**（笔记 #20）→ Hermes RL 训练的 ToolContext 真实验证机制与"可验证性"理念一致
- **所有 Agent 都是 CodingAgent**（笔记 #21）→ Hermes 的 Skill 动态生成验证了"CodingAgent + Skill 颠覆垂直 SaaS"的判断
