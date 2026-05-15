# Claude Code 源码 Harness 视角深度解读

> 来源：基于泄露 Claude Code 源码的 Harness 工程分析
> 提炼日期：2026-04-03
> 分类：技术趋势

## 核心观点

1. **"模型即智能体，代码即缰绳"（The model is the agent, the code is the harness）**。Claude Code 不试图通过规则引擎或工作流编排模拟智能，而是完全信任模型的决策能力，将全部工程精力投入到提供清晰、丰富、安全的操作环境。这是工业级 Agent 产品的核心设计哲学。

2. **Harness = Tools + Knowledge + Observation + Action + Permissions**。Claude Code 的 512K+ 行 TypeScript 代码本质上就是这个公式的工业级实现：40+ 原子工具、按需技能加载、三层上下文压缩、六种多智能体模式、四级权限系统。

3. **Harness 工程师的工作不是"编程智能"，而是"为智能构建世界"**。Agent 的能力上限由模型智能水平决定，而非被 Harness 限制——前提是 Harness 设计不拖后腿。

## 关键知识点

### 整体架构公式

```
Claude Code = one agent loop
  + tools (bash, read, write, edit, glob, grep, browser...)
  + on-demand skill loading
  + context compression
  + subagent spawning
  + task system with dependency graph
  + team coordination with async mailboxes
  + worktree isolation for parallel execution
  + permission governance
```

### 核心循环：QueryEngine（46K 行）

- **流式响应处理**：实时渲染模型思考过程
- **工具调用循环**：stop_reason == "tool_use" 时执行工具 → 追加 tool_result → 再次调用模型 → 直到 "end_turn"
- **扩展思考模式**：工具执行前进行更深层推理
- **重试+Token 计数**：应对 API 错误和成本控制

### 工具系统：三大设计原则

1. **原子性**：每个工具只做一件事（FileRead 只读、FileEdit 只编辑）
2. **可组合性**：Grep → FileRead → FileEdit 自然链式调用
3. **自我描述性**：Zod v4 Schema 定义输入输出，ToolSearchTool 实现延迟工具发现（节省上下文）

### 工具分层体系（40+ 个工具）

| 层次 | 工具示例 |
|------|----------|
| 行动层 | BashTool, FileWriteTool, FileEditTool |
| 感知层 | FileReadTool, GlobTool, GrepTool, WebFetchTool, LSPTool |
| 知识层 | SkillTool |
| 协调层 | AgentTool, TaskCreate/Update, SendMessage, TeamCreate/Delete |
| 认知层 | EnterPlanMode / ExitPlanMode |
| 隔离层 | EnterWorktree / ExitWorktree |
| 扩展层 | MCPTool |
| 调度层 | CronCreate, RemoteTrigger, Sleep |

### 知识系统：按需加载 + 渐进式披露

- Skills 以 .md 文件存储，YAML frontmatter + 知识体
- 模型判断需要时通过 SkillTool 加载，避免上下文浪费
- **三层渐进式披露**：
  - L1 Metadata（触发描述）→ L2 Body（详细信息）→ L3 References（参考资料）

### 上下文管理：三层压缩策略

1. **子智能体隔离**：SubAgent 有独立 messages[]，主会话只收结果摘要
2. **上下文压缩**：接近窗口限制时自动压缩早期对话为摘要
3. **任务持久化**：任务状态存磁盘，/resume 恢复

### 多智能体协调：六种架构模式

| 模式 | 适用场景 |
|------|----------|
| Pipeline | 顺序依赖（设计→前端→后端→测试） |
| Fan-out/Fan-in | 并行独立任务（多维度代码审查） |
| Expert Pool | 根据任务类型动态选择专家 |
| Producer-Reviewer | 生成+验证交替 |
| Supervisor | 中心化动态调度 |
| Hierarchical Delegation | 自顶向下递归拆分 |

- **Worktree 隔离**：每个子智能体在独立 Git Worktree 中工作，完成后 merge 回主分支
- **JSONL Mailbox**：基于文件的异步邮箱通信
- **自主任务认领**：团队成员空闲时自动扫描任务面板

### 权限系统：四级模式

| 模式 | 行为 |
|------|------|
| default | 每次工具调用前用户审批 |
| plan | 规划只读，执行需审批 |
| auto | 低风险自动批准，高风险需审批 |
| bypassPermissions | 跳过所有检查（沙箱环境） |

细粒度维度：工具类型、操作类型、文件路径模式、命令白名单

### 性能优化

- **并行预取**：启动时并行预取 MDM 设置、Keychain 凭据、GrowthBook 初始化
- **懒加载**：OpenTelemetry、gRPC 等重模块动态 import()
- **死代码消除**：Bun 的 bun:bundle 特性标志实现编译时剔除
- **特性标志**：PROACTIVE、KAIROS、BRIDGE_MODE、DAEMON、VOICE_MODE 等

### Harness 工程师五大职责

1. **实现工具**：给 Agent 双手（原子性、可组合、自描述）
2. **策划知识**：给 Agent 专业知识（按需加载、渐进式披露）
3. **管理上下文**：给 Agent 清洁记忆（隔离、压缩、持久化）
4. **控制权限**：给 Agent 安全边界（多级模式、细粒度规则）
5. **收集训练信号**：改进下一代 Agent（感知-推理-行动序列）

## 数据与案例

- Claude Code 源码：约 1,900 个文件、512,000+ 行 TypeScript
- QueryEngine.ts 约 46K 行，Tool.ts 约 29K 行，commands.ts 约 25K 行
- 约 40 个工具实现、约 50 个斜杠命令、约 140 个 React+Ink TUI 组件
- 技术栈：Bun + TypeScript (strict) + React/Ink + Commander.js + Zod v4 + ripgrep + MCP SDK + Anthropic SDK + OpenTelemetry + GrowthBook

## 启发与思考

1. **"循环属于 Agent，机制属于 Harness"是最重要的设计原则**。所有 Harness 机制在循环之上层层叠加，但不改变循环本身。这意味着 Agent 系统的复杂度管理关键在于：保持核心循环简单，把复杂性推到 Harness 各子系统中。

2. **工具的"延迟发现"（ToolSearchTool）是上下文工程的高级技巧**。不在系统提示中预加载所有工具描述，而是让 Agent 运行时动态发现——直接解决 Token 预算问题。

3. **六种多智能体模式可以直接对应企业 AI 场景**：客服系统用 Expert Pool（根据问题类型选专家），内容审核用 Producer-Reviewer，复杂工单用 Hierarchical Delegation。

4. **"最好的 Agent 产品来自于理解自己的工作是 Harness 而非智能的工程师"**——这句话可以作为 AI 产品团队的座右铭。PM 的工作也是一样：不是去"设计智能"，而是为智能设计操作环境。

5. **Harness 架构具有跨领域通用性**：同样的模式可应用于地产管理、农业、酒店运营、医学研究、制造业、教育等——改变的只是工具、知识和权限。

## 原文精华

> The model is the agent. The code is the harness. Claude Code 不试图通过复杂的规则引擎、决策树或工作流编排来模拟智能——它完全信任 Claude 模型的决策能力，将全部工程精力投入到为模型提供一个清晰、丰富、安全的工作环境中。

> Prompt plumbing "agents" are the fantasy of programmers who don't train models. They attempt to brute-force intelligence by stacking procedural logic — massive rule trees, node graphs, chain-of-prompt waterfalls — and praying that enough glue code will somehow emergently produce autonomous behavior. It won't. You cannot engineer your way to agency. Agency is learned, not programmed.

> 最好的 Agent 产品来自于那些理解"自己的工作是 Harness，而非智能"的工程师。当我们将工程精力从"试图编程智能"转向"为智能构建世界"时，Agent 系统的能力上限将由模型本身的智能水平决定，而非被差劲的 Harness 设计所限制。

---
原文来源：基于 Claude Code 泄露源码的 Harness 工程分析报告
