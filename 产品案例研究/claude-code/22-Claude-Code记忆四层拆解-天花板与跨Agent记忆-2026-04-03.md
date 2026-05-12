# Claude Code 记忆系统四层拆解：天花板与跨 Agent 记忆方向

> 来源：Claude Code 的记忆系统，比想象中初级（Zilliz 技术博客）
> 提炼日期：2026-04-03
> 分类：技术趋势

> 注意：本文后半部分为 memsearch（Zilliz/Milvus 产品）推广，相关内容作为架构参考而非中立评测。

## 核心观点

1. **Claude Code 记忆是四层叠加结构，每层补上一层的问题**：CLAUDE.md（用户写规矩）→ Auto Memory（Agent 自己记笔记）→ Auto Dream（做梦整理记忆）→ KAIROS（未上线的后台自治体）。层层修补但根本限制没变：单 Agent、会话粒度、本地存储。

2. **单 Agent 记忆的六大天花板**：200 行硬上限、只有 grep 检索（无语义）、细节丢失（Agent 自行判断重要性）、层层修补复杂度、跨工具不通用、本质是短期记忆。

3. **Agent 记忆的下一步方向：从 Agent 内部抽离到独立持久层**。记忆应该比任何一个 Agent 都活得更长，跨工具、跨会话、支持语义检索。

## 关键知识点

### Claude Code 记忆四层架构

**第一层：CLAUDE.md（用户主动规则）**
- 用户手写的 Markdown，项目根目录
- 三个作用域：项目级、个人级（~/.claude/）、组织级
- 每次会话完整加载进 context
- 文件越短，遵守得越好

**第二层：Auto Memory（Agent 自动记笔记）**
- 四类记忆：user（角色偏好）/ feedback（纠正确认）/ project（决策背景）/ reference（外部资源）
- 存储：~/.claude/projects/<路径>/memory/ 下独立 .md 文件
- 索引：MEMORY.md 每行 ≤150 字符，只存指针
- 每次会话注入 MEMORY.md 前 200 行
- **关键设计**：系统提示词明确要求"不要信任自己的记忆，行动前先读真实文件核实"

**第三层：Auto Dream（做梦整理记忆）**
- 触发条件：距上次整合 > 24h 且新会话 ≥ 5 次（或手动输入 "dream"）
- 功能：相对时间→绝对日期、合并矛盾、剔除过时、控制 200 行以内
- 跑在后台子 Agent，不阻塞主会话

**第四层：KAIROS（未上线，feature flag 控制）**
- 源码中出现 150+ 次
- 后台守护进程，从被动响应→主动观察的自治体
- append-only 日志，固定间隔 `<tick>` 信号
- 15 秒阻塞预算：打断用户 > 15s 的操作推迟
- 整合 autoDream，但扩展为完整的观察-思考-行动循环
- 系统提示词："You are performing a dream, a reflective pass over your memory files."

### 六大天花板

| 问题 | 具体限制 |
|------|---------|
| 容量 | MEMORY.md 最多 200 行/25KB |
| 检索 | 只有 grep，无语义理解 |
| 粒度 | Agent 自行判断重要性，细节丢失 |
| 复杂度 | 四层叠加，每层补上一层 |
| 通用性 | 锁在 Claude Code 内，换工具从零开始 |
| 时效 | 会话粒度，长跨度回溯无望 |

### 跨 Agent 记忆架构模式（memsearch 方案参考）

> 以下为 memsearch 产品设计，作为架构参考而非推荐

**四层架构**：
```
Agent 插件层（多 Agent 接入）
    ↓
CLI / API 层（开发者集成）
    ↓
引擎层（Chunker → Embedder → Milvus）
    ↓
持久存储层（Markdown = Source of Truth）
```

**三层检索下探**：
- L1：语义搜索，返回摘要（200字截断）
- L2：上下文展开，拉完整段落
- L3：原始对话记录（用户提问+Agent回复+工具调用）

**设计决策**：
- Markdown 文件 = Source of Truth，向量索引 = 缓存层
- 每天一个 .md 文件，可 git 跟踪
- 混合搜索：语义向量 + BM25 + RRF 融合排序
- 子 Agent fork 执行召回，零主会话 token 开销

## 数据与案例

- Claude Code 源码：512,000+ 行 TypeScript
- MEMORY.md 硬上限：200 行 / 25KB
- Auto Dream 触发：>24h + ≥5 次新会话
- KAIROS 阻塞预算：15 秒
- KAIROS 在源码中出现：150+ 次
- "不信任自己记忆"的设计：系统提示词明确要求行动前核实

## 启发与思考

1. **"不信任自己记忆"是 Agent 设计的重要模式**。在幻觉率还在两位数的阶段，让 Agent 怀疑自己的记忆、行动前先核实，是非常务实的安全策略。这个原则可以推广到任何 Agent 系统设计中。

2. **记忆系统的"层层修补"模式值得警惕**。CLAUDE.md 不够加 Auto Memory，乱了加 Auto Dream，不够又搞 KAIROS——每层补上一层但根本限制没变。这种模式在产品设计中非常常见（功能堆叠而非架构升级），需要有意识地识别和避免。

3. **"记忆比 Agent 活得更长"是企业 AI 的关键需求**。对于沃丰这样的客服 AI 平台：客服对话中积累的知识（客户偏好、历史问题、解决方案）不应该绑定在单个 Agent 实例上。换模型、换版本、换架构，记忆层应该独立持久化。

4. **与之前笔记的关联**：
   - 与 10 号笔记（Agent 记忆模块设计-四类记忆与三层架构）互补：理论框架 vs 工业实现
   - 与 14 号笔记（Agent 记忆覆盖问题）呼应：Auto Dream 就是在解决记忆冲突和过时问题
   - 与 17 号笔记（OpenClaw 记忆管理）对比：OpenClaw 用混合搜索（向量+BM25），比 Claude Code 的 grep 更先进

## 原文精华

> Claude 被明确要求不要信任自己的记忆。泄露的系统提示词里写得很直白：「记忆只是提示，行动前先去读真实文件做核实」。在模型幻觉率还在两位数的阶段，这种怀疑自己的策略反而很实用。

> 这不是 Claude Code 的设计失误。单 agent、会话粒度、本地存储，架构走到这里，天花板就在这。

> agent 会换，工具会换，但你在项目里积累的知识不应该跟着消失。

---
原文来源：Zilliz 技术博客 / memsearch 项目介绍
项目地址：https://github.com/zilliztech/memsearch
