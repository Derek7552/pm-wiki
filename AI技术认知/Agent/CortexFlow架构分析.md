# CortexFlow Agent 架构分析

## 架构定位

**CortexFlow 采用 ReAct (Reasoning + Acting) 架构，并结合 ReWOO 的并行执行优化**

这是一种混合架构，既保留了 ReAct 的灵活性和动态决策能力，又通过并行执行提升了效率。

## 核心架构模式

### 1. ReAct 循环（核心）

CortexFlow 的 Agent 执行遵循标准的 ReAct 模式：

```
用户任务
  ↓
Thought（思考）：分析问题，制定计划
  ↓
Action（行动）：调用工具执行
  ↓
Observation（观察）：获取执行结果
  ↓
Thought（思考）：分析结果，决定下一步
  ↓
[循环直到完成任务]
  ↓
Final Answer（最终答案）
```

**实现证据**：
- Agent 引擎通过 Claude Agent SDK 实现 ReAct Loop
- 支持多轮推理和工具调用（max_iterations 可配置）
- 每个 Phase 都有明确的决策点，支持动态调整

### 2. 并行执行优化（借鉴 ReWOO）

在 Flow 层面支持节点并行执行：

```python
config = Config(
    agent=Config.Agent(
        max_parallel=3,        # 最多 3 个节点并行
        max_iterations=100,    # Flow 执行最大迭代次数
    )
)
```

**Flow YAML 并行语法**：
```yaml
nodes:
- id: start
  on_success:
  - goto: ["scan_sqli", "scan_xss", "scan_ssrf"]  # 并行 3 个扫描
```

这种设计允许：
- 多个独立的漏洞扫描并行执行
- 多目录代码审计并行处理
- 提升整体执行效率

## 三层智能体架构

CortexFlow 采用分层设计，将能力从原子到复杂逐层组合：

```
┌─────────────────────────────────────┐
│  L3: Orchestrators（编排智能体）      │
│  web-pentest-flow, code-audit-flow   │
│  - 协调多个 Agent                     │
│  - 支持并行执行                       │
│  - 管理全局状态                       │
└──────────────┬──────────────────────┘
               │ 通过 Cortex 协调
┌──────────────▼──────────────────────┐
│  L2: Agents（领域智能体）              │
│  recon-agent, vuln-scan-agent        │
│  - 执行 ReAct 循环                    │
│  - 调用多个 Skills                    │
│  - 领域专家能力                       │
└──────────────┬──────────────────────┘
               │ 调用
┌──────────────▼──────────────────────┐
│  L1: Skills（原子能力）                │
│  http-request, code-analysis         │
│  - 单一职责                           │
│  - 可复用                             │
│  - 工具封装                           │
└──────────────────────────────────────┘
```

### L1: Skills（原子能力）

- **定义**：单一、可复用的原子能力
- **示例**：http-request, code-analysis, vuln-detect
- **特点**：
  - 单一职责原则
  - 工具函数封装
  - 可被多个 Agent 复用

### L2: Agents（领域智能体）

- **定义**：组合多个 Skills 的领域专家
- **示例**：recon-agent, vuln-scan-agent, exploit-agent
- **特点**：
  - 执行 ReAct 循环
  - 领域知识沉淀
  - 支持动态决策

### L3: Orchestrators（编排智能体）

- **定义**：协调多个 Agents 完成复杂任务
- **示例**：web-pentest-flow, code-audit-flow
- **特点**：
  - 多 Agent 协作
  - 支持并行执行
  - 全局状态管理

## 与标准架构对比

| 特性 | ReAct | ReWOO | CortexFlow |
|------|-------|-------|------------|
| **推理模式** | Thought → Action → Observation 循环 | Planning → Execution → Solving | ✅ ReAct 循环 |
| **执行方式** | 串行，每次等待结果 | 并行，一次性规划 | ✅ 支持并行（可配置） |
| **动态调整** | ✅ 可根据中间结果调整 | ❌ 无法调整计划 | ✅ 支持决策点动态调整 |
| **工具调用** | 每次调用 LLM | 减少 LLM 调用 | ✅ 多轮 ReAct Loop |
| **LLM 成本** | 高（每步都调用） | 低（减少调用次数） | 中（可通过并行优化） |
| **适用场景** | 复杂推理，需要动态决策 | 可预先规划的任务 | ✅ 安全测试（需要动态决策） |
| **可解释性** | ✅ 推理过程可追溯 | ✅ 计划清晰 | ✅ 推理过程可追溯 |
| **容错能力** | ✅ 可根据错误调整 | ❌ 规划错误导致整体失败 | ✅ 支持错误恢复 |

## 核心实现细节

### 1. ReAct Loop 实现

```python
class ClaudeCodeAdapter(BaseAdapter):
    """
    封装 Claude Agent SDK

    职责：
    1. 格式转换（MPI ↔ SDK）
    2. 调用 SDK 的 query() 函数
    3. 处理异步-同步转换

    不包含：
    - ReAct Loop 实现（由 SDK 提供）
    - 工具执行逻辑（由 SDK + Tool Runtime 提供）
    """

    @property
    def capabilities(self) -> set[str]:
        return {"chat_completion", "react_loop", "tool_execution", "code_sandbox"}
```

**关键点**：
- ReAct Loop 由 Claude Agent SDK 提供
- 支持多轮推理和工具调用
- 自动处理 Thought-Action-Observation 循环

### 2. 决策点设计

每个 Phase 都有明确的决策点：

```markdown
### 决策点
- **目标不可达** (`error.type == 'TARGET_UNREACHABLE'`) → 终止测试
- **发现高价值目标** → 标记优先测试
- **检测到 WAF** → 调整后续测试策略（降低频率）
- **成功完成** → 进入漏洞扫描阶段
```

这体现了 ReAct 的核心优势：**根据中间结果动态调整策略**

### 3. 并行执行机制

```python
# Flow 节点并行执行配置
config = Config(
    agent=Config.Agent(
        max_parallel=3,        # 最多 3 个节点并行
        max_iterations=100,    # Flow 执行最大迭代次数
    )
)
```

**并行场景**：
- ✅ 多个独立的漏洞扫描（SQLi/XSS/SSRF）
- ✅ 多目录代码审计
- ✅ 多主机渗透测试

**串行场景**（设置 max_parallel=1）：
- 需要依赖前序结果的任务
- 需要严格顺序的操作

### 4. Optional 依赖等待机制

支持可选依赖等待（v1.15.0+）：

```yaml
nodes:
  - id: report
    type: agent
    ref: report-agent
    depend_on:
      required: []                    # 必需依赖
      optional: [scan_sqli, scan_xss] # 可选依赖，等待完成
```

**工作原理**：
- 节点被激活时检查 optional 依赖状态
- 如果依赖未完成，增加等待计数并推迟执行
- 达到限制后，使用 `None` 作为依赖输出继续执行

## 架构优势

### 1. 灵活性（来自 ReAct）

- ✅ 支持动态决策，根据中间结果调整策略
- ✅ 推理过程可解释，便于调试
- ✅ 容错能力强，可根据错误调整

### 2. 效率（来自 ReWOO 优化）

- ✅ 支持节点并行执行，提升整体效率
- ✅ 可配置并发数，平衡资源和性能
- ✅ 减少等待时间，加速任务完成

### 3. 可维护性（来自三层架构）

- ✅ 分层清晰，职责明确
- ✅ Skills 可复用，降低重复开发
- ✅ Agent 可组合，快速构建新能力
- ✅ Orchestrator 可编排，灵活应对复杂场景

### 4. 可扩展性

- ✅ 支持多模型（Claude、OpenAI、DeepSeek 等）
- ✅ 支持自定义工具
- ✅ 支持多执行器（Claude Code、Cursor）

## 适用场景

### 最适合的场景

1. **安全测试**（渗透测试、漏洞挖掘）
   - 需要动态决策（根据发现调整策略）
   - 需要多步骤推理（侦察 → 扫描 → 利用）
   - 可并行执行（多个漏洞类型同时测试）

2. **代码审计**
   - 需要深度分析（理解代码逻辑）
   - 需要多轮推理（发现问题 → 验证 → 报告）
   - 可并行处理（多个目录同时审计）

3. **CTF 解题**
   - 需要灵活应对（不同题型不同策略）
   - 需要多步骤推理（分析 → 尝试 → 调整）

### 不太适合的场景

1. **简单查询任务**
   - 过于复杂，ReAct 循环开销大
   - 建议使用简单的 LLM 调用

2. **完全可预先规划的任务**
   - 如果任务步骤完全确定，ReWOO 更高效
   - CortexFlow 的动态决策能力用不上

## 总结

CortexFlow 是一个**混合架构**，核心是 **ReAct**，优化借鉴 **ReWOO**：

- **ReAct 提供灵活性**：动态决策、可解释、容错强
- **ReWOO 提供效率**：并行执行、减少等待
- **三层架构提供可维护性**：分层清晰、可复用、可扩展

这种设计非常适合**安全测试**这种需要动态决策的复杂场景，既保证了灵活性，又通过并行执行提升了效率。

## 参考资料

- CortexFlow 项目：`/home/clouditera/derek-wiki/CortexFlow/`
- Agent 架构知识库：`职业发展/产品方向/AI智能体/05-Agent架构与实践知识库.md`
- ReAct 论文：《ReAct: Synergizing Reasoning and Acting in Language Models》
- ReWOO 论文：《ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models》
