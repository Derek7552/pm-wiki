# Anthropic《Building Effective Agents》原文——五种工作流 + Agent 设计原则

> 来源：Anthropic 官方博客《Building Effective Agents》（Erik S. & Barry Zhang，2024-12-19）
> 提炼日期：2026-05-13
> 分类：AI技术认知 / Agent

## TL;DR

Anthropic 在与数十个客户团队共建 Agent 后，得出反直觉结论：**最成功的实现都没用复杂框架**，而是用「简单可组合的模式」。文章先把 agentic system 拆成 workflows（写死代码路径）vs agents（模型自主决策）两类，然后给出一套**渐进复杂度的模式目录**：增强 LLM（基础块）→ 5 种工作流（链式 / 路由 / 并行 / 协调-工人 / 评估-优化）→ 自主 Agent。最后给出 3 条 agent 设计铁律：保持简单、可视化规划步骤、把 ACI（Agent-Computer Interface）当 HCI 一样精雕。

## 核心观点

### 观点 1：Workflows 和 Agents 是两类东西，按可预测性选择

Anthropic 把所有「agentic systems」分成两类：

- **Workflows**：LLM + 工具被「预先写好的代码路径」编排——可预测、稳定、可调试。
- **Agents**：LLM **自己** 决定流程和工具使用——灵活、能处理开放问题，但成本高、可能复合错误。

**选择原则**：先用最简方案（甚至连 agentic 都不需要），单次 LLM 调用 + retrieval + few-shot 通常就够了。任务定义清晰 → workflow；任务开放、需要模型驱动决策且能容忍延迟和成本 → agent。Agent 的自主性意味着**更高成本和复合错误风险**，必须在沙箱里大量测试 + 加护栏。

### 观点 2：不要急着上框架，先理解原语

主流 agent 框架（Claude Agent SDK / AWS Strands / Rivet / Vellum）的价值是封装 LLM 调用、工具解析、链路编排这些底层活；但它们也带来**多层抽象**，使 prompts 和 responses 被遮蔽、调试困难，还会诱导开发者**为了用框架而堆复杂度**。Anthropic 的明确建议：**直接用 LLM API 起步**，很多模式几行代码就能写完；如果要用框架，必须看懂底层代码——「对底层假设错了」是客户最常见的错误来源。

### 观点 3：构建 Agent 的 3 条核心原则

文章结尾把所有经验浓缩成 3 条不可妥协的原则：

1. **保持设计简单（Maintain simplicity）**——Agent 本质就是「LLM 在循环里用工具」，不要为了显得复杂而加抽象层。
2. **优先透明性（Prioritize transparency）**——显式展示 agent 的规划步骤，让人类能看到它在想什么、为什么这么决定。
3. **精雕 ACI（Agent-Computer Interface）**——投入 HCI 同等的工程精力到工具文档和测试上，把自己塞进模型的视角看「这个工具描述够不够清楚」。

## 关键知识点

### 一、Augmented LLM（基础构件）

所有 agentic system 的基本积木是「增强型 LLM」，标配 3 项能力：

| 能力 | 含义 |
|------|------|
| Retrieval（检索） | 模型自己生成搜索查询、获取外部信息 |
| Tools（工具） | 模型选择并调用工具与环境交互 |
| Memory（记忆） | 模型决定保留哪些信息跨步骤复用 |

**实施重点**：①能力要为具体场景裁剪；②给 LLM 一个**易用且文档完备的接口**。一种推荐做法是 **MCP（Model Context Protocol）**——只需简单的客户端实现就能接入不断扩张的第三方工具生态。

### 二、五种 Workflow 模式

#### 1. Prompt Chaining（提示链）

**结构**：把任务拆成顺序步骤，每一步 LLM 处理上一步的输出，中间可加程序化「gate」做校验。

**何时用**：任务能干净地拆成固定子任务，**用延迟换准确性**（每次调用更简单）。

**例子**：
- 写营销文案 → 翻译成另一种语言
- 写文档大纲 → 校验大纲是否满足要求 → 基于大纲写文档

#### 2. Routing（路由）

**结构**：先分类输入，再分发到专门的下游任务/prompt/工具。

**何时用**：任务有**明确的几类**，分开处理更好；对单一输入类型的优化不该影响其它类型。分类可以由 LLM 做，也可以用传统分类模型。

**例子**：
- 客服查询：通用问题 / 退款 / 技术支持各走不同流程和工具
- 简单问题路由到 Haiku 4.5（便宜），复杂问题路由到 Sonnet 4.5（强）——优化性价比

#### 3. Parallelization（并行化）

两种变体：
- **Sectioning（分块）**：把任务切成独立子任务并行跑
- **Voting（投票）**：同任务跑多次得到多样化输出

**何时用**：子任务能并行加速；或需要多视角/多次尝试来提升置信度；复杂任务里每个考量交给独立 LLM 调用聚焦处理。

**例子**：
- Sectioning：一个 LLM 处理用户查询，另一个并行筛查不当内容；自动 evals 中每个 LLM 评一个维度
- Voting：多 prompt 审查代码漏洞；多 prompt 评估内容是否不当（投票阈值调假阳/假阴平衡）

#### 4. Orchestrator-Workers（协调-工人）

**结构**：一个中心 LLM 动态拆分任务、分派给 worker LLMs、再综合结果。

**何时用**：**子任务无法提前预测**（比如 coding 任务——要改几个文件、每个文件怎么改取决于任务本身）。

**关键区别（vs 并行化）**：拓扑相似，但子任务不预定义，由协调者根据具体输入临时决定。

**例子**：
- 跨多个文件做复杂修改的 coding 产品
- 多源信息搜索与综合分析

#### 5. Evaluator-Optimizer（评估-优化）

**结构**：一个 LLM 生成响应，另一个 LLM 评估并给反馈，循环改进。

**何时用**两个信号成立时最有效：
1. 人类清晰表达反馈能可证明地提升响应质量
2. LLM 自己能给出有价值的反馈

**例子**：
- 文学翻译——细微之处译者初稿抓不住，评估者能给出有用批评
- 复杂搜索——多轮搜索 + 分析，评估者决定是否继续搜

### 三、Autonomous Agent（自主 Agent）

**前提能力**：理解复杂输入、推理与规划、可靠用工具、错误恢复——这些能力成熟了 agent 才能在生产中跑。

**典型流程**：
1. 从人类命令或交互讨论开始
2. 任务明确后，agent **独立规划和操作**，必要时回到人类求信息/判断
3. 执行中**每一步都要从环境拿 ground truth**（工具结果、代码执行输出）评估进度
4. 在 checkpoint 或遇阻时**暂停求人类反馈**
5. 任务完成或达到 stopping condition（如最大迭代数）时终止

**实现的真相**：agent 实现往往**很简单**——本质就是「LLM 基于环境反馈在循环里用工具」。所以**工具集与文档设计是关键**，比 prompt 本身更重要（见下文 ACI）。

**何时用**：开放问题、步骤数无法预测、不能写死路径、对模型判断有一定信任度。**沙箱测试 + 护栏不可省**。

**例子**：解决 SWE-bench 任务的 coding agent；computer-use 参考实现。

### 四、Agents in Practice（两类落地场景）

**最有价值的 agent 应用满足 4 个特征**：需要对话 + 行动、有清晰的成功标准、能形成反馈闭环、能整合有意义的人类监督。

#### A. 客户支持（Customer Support）

- 对话流天然 + 需要外部信息和动作
- 工具能拉取用户数据、订单历史、知识库
- 退款/工单等动作可程序化执行
- 成功度量清晰（用户定义的"解决"）
- **商业模式信号**：多家公司采用「按成功解决次数计费」——对 agent 效果有信心才敢这么收

#### B. 编码 Agent（Coding Agents）

为什么编码特别合适：
- 代码可用自动化测试验证
- agent 能用测试结果作为迭代反馈
- 问题空间定义清晰
- 输出质量可客观度量
- Anthropic 自家 agent 已能仅凭 PR 描述解决 SWE-bench Verified 真实问题

**但**：自动化测试只验功能，更宏观的系统对齐仍需人类 review。

### 五、Prompt Engineering Your Tools（ACI 原则）

工具定义和规范应享受**与整体 prompt 同等的工程关注**。

**3 条格式选择原则**：
1. 给模型足够 token「思考」，别让它把自己写进死角
2. 格式贴近模型在互联网文本里见过的自然形态
3. 没有「格式 overhead」——例如不要让它精确数几千行代码的行号，不要让它在 JSON 里转义代码

**4 条 ACI（Agent-Computer Interface）设计实践**：

| # | 实践 | 含义 |
|---|------|------|
| 1 | 换位思考 | 把自己当成模型——只看工具描述和参数，用起来明显吗？需要"想一下"的工具模型也会犯错。好工具定义应包含**示例用法、边界情况、输入格式要求、与其它工具的清晰界限** |
| 2 | 像写新人 docstring | 改参数名/描述让事情更显然，尤其在工具相似时 |
| 3 | 在 workbench 测试 | 跑大量样本看模型怎么用、犯什么错、迭代 |
| 4 | Poka-yoke（防呆设计） | 改参数让"犯错变难"——例如 SWE-bench agent 中，工具改成**强制要求绝对路径**后，模型在切换目录后再也不出错了 |

**Anthropic 的实际投入**：构建 SWE-bench agent 时，**优化工具花的时间比优化整体 prompt 还多**。

## 数据与案例

### 案例 1：SWE-bench Coding Agent

- **任务**：基于 PR 描述解决真实 GitHub Issue，涉及多文件编辑
- **模式选型**：Orchestrator-Workers + Agent（步骤数依赖具体任务）
- **关键工具优化**：
  - 早期：工具用相对路径 → agent 切换目录后犯错
  - 修复：强制工具使用**绝对路径** → 模型「完美使用」该方法
- **教训**：工具优化 > prompt 优化

### 案例 2：客户支持商业化信号

多家公司采用「**按成功解决次数计费**」的 usage-based pricing 模型——这种收费方式只有当公司对 agent 解决率有强信心时才敢推，是 agent 商业化成熟的市场信号。

### 案例 3：模型路由的成本优化

按任务难度路由：
- 简单/常见问题 → Claude Haiku 4.5（成本低）
- 困难/罕见问题 → Claude Sonnet 4.5（能力强）

**目的**：在同一系统内同时优化性能和成本。

### 案例 4：MCP 协议作为工具接入标准

Anthropic 推出的 **Model Context Protocol**：开发者通过简单的客户端实现，就能接入不断扩张的第三方工具生态——降低 agent 与外部系统集成的成本。

## 启发与思考

### 1. PM 视角：复杂度是技术债务

文章传达的核心 PM 启示是「**复杂度只有在可证明改善结果时才该加**」。这反过来给 PM 一条工作纪律：

- 立项时先问「能不能用单次 LLM 调用解决」
- 再问「能不能用 workflow 解决」
- 最后才考虑「需要真正的 agent 吗」

每加一层复杂度都要承担：更高 token 成本、更高延迟、更难调试、更可能复合错误。

### 2. 五种 workflow 是 PM 的「设计语言」

把这 5 种模式吃透，PM 评审技术方案时就有了**共同语言**：
- 听到「我们要并行跑 3 个 LLM 做评估」→ Voting 模式，问投票阈值
- 听到「我们让大模型决定调哪个工具」→ 路由模式，问分类准确率
- 听到「主 agent 拆任务给子 agent」→ Orchestrator-Workers，问子任务边界怎么定

### 3. ACI 是 Agent 时代的「产品设计」

文章对工具设计的强调（「ACI 投入要比照 HCI」）实际上是在告诉 PM：**Agent 的"用户"不只是人类，还有 LLM 自己**。工具描述、参数名、错误反馈——这些都是 PM 应当像设计前端界面一样仔细打磨的"接口"。Poka-yoke（防呆）思想直接迁移：让 agent 难以犯错比让它聪明更重要。

### 4. 与 Barry 升级版的关系

本文是**原始博客（2024-12-19）**，给出**模式目录 + 工程原则**。
Barry 的 AI Engineer Summit 升级版（已归档笔记《Barry 构建 Agent 三铁律》）则把工程经验进一步**浓缩成 3 条铁律 + 4 问判断清单**，并新增 3 个开放问题（budget-aware / self-evolving tools / 异步 multi-agent）。

两份内容的最佳读法：**原文学模式目录 → 升级版学决策框架**。

### 5. 可落地的行动项

- 评估手里的 agent / workflow 项目：用 5 种工作流模式给每个项目打标，看看是不是匹配最简模式
- 检查工具文档：能否通过新人 docstring 测试（描述 + 示例 + 边界）
- 引入 ACI 工程纪律：让工程师为每个工具做 Poka-yoke 设计 + workbench 多样本测试
- 加 stopping condition：所有自主 agent 加上最大迭代数等终止条件，防止失控

## 原文精华

> "Consistently, the most successful implementations weren't using complex frameworks or specialized libraries. Instead, they were building with simple, composable patterns."

> "Workflows offer predictability and consistency for well-defined tasks, whereas agents are the better option when flexibility and model-driven decision-making are needed at scale."

> "Agents can handle sophisticated tasks, but their implementation is often straightforward. They are typically just LLMs using tools based on environmental feedback in a loop."

> "One rule of thumb is to think about how much effort goes into human-computer interfaces (HCI), and plan to invest just as much effort in creating good agent-computer interfaces (ACI)."

> "Success in the LLM space isn't about building the most sophisticated system. It's about building the right system for your needs."

> 3 条核心原则：
> 1. Maintain simplicity in your agent's design.
> 2. Prioritize transparency by explicitly showing the agent's planning steps.
> 3. Carefully craft your agent-computer interface (ACI) through thorough tool documentation and testing.

---
原文链接：https://www.anthropic.com/research/building-effective-agents
