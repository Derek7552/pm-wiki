# Barry 构建 Agent 三铁律——AI Engineer Summit 升级版

> 来源：Barry（Anthropic《Building Effective Agents》作者）AI Engineer Summit 分享
> 提炼日期：2026-05-13
> 分类：AI技术认知 / Agent

## TL;DR

Barry 把 agent 实践浓缩成 3 条铁律：（1）别什么都用 agent 做——用 4 问判断清单筛场景；（2）尽可能保持简单——agent 只有"环境/工具/system prompt"3 个组件，迭代阶段别加复杂度；（3）用 agent 视角去想——把自己塞进 10-20K token 的 context window，立刻能看到 agent 缺什么信息。文末附 3 个未解决的开放问题：budget-aware、self-evolving tools、异步 multi-agent 通信。

## 核心观点

### 观点 1：Agent 不是万能锤，先用 4 问判断要不要上

Agent 在「模糊问题空间」里才发光，能画出完整决策树的任务直接写 workflow 更便宜可控。判断 agent 适用性需要 4 个问题逐条问自己，缺一不可：任务复杂度、任务价值、关键能力是否 de-risk、错误成本与错误发现难度。Coding 任务是四项全中的甜蜜点（任务模糊、价值高、模型能力强、unit test + CI 让错误容易发现），这才是 agent 该上的场景。

### 观点 2：成功 agent 的代码 backbone 几乎一模一样，简单是设计纪律

Anthropic 内部对 agent 的定义只有一句话："模型在循环里使用工具"——只有 3 个组件（环境、工具、system prompt），然后模型在循环里跑。Barry 强调他们看到的成功 agent 哪怕产品形态完全不同，代码层 backbone 几乎一致。iteration 阶段千万别加复杂度，先把这 3 个组件迭代到位，缓存/并行/进度展示这些优化等行为稳定了再做。

### 观点 3：Agent 视角是排查问题的最强武器

很多 builder 用自己的视角设计 agent，然后 agent 出错时一脸困惑。正确做法是把自己放进 agent 的 context window：你只有 10-20K token，只能看到一份 system prompt + 工具描述 + 最近几个 observation。做一遍这个练习就能立刻看到 agent 缺什么信息——屏幕分辨率、推荐动作、进度状态，这些都是从 agent 视角推出来的需求。

## 关键知识点

### 1. 判断要不要用 Agent 的 4 问清单

| # | 问题 | 怎么用 | 反信号（别用 agent） |
|---|------|--------|---------------------|
| 1 | **任务复杂度** | 任务在"模糊问题空间"才用 agent | 能画出完整决策树 → 写 workflow，每个节点单独优化 |
| 2 | **任务价值** | 任务能 cover token 成本 | 客服系统每单预算 10 美分 → 3-5 万 token 上限，常见情况用 workflow 就够 |
| 3 | **关键能力 de-risk** | 主路径每一步模型都做得好 | 某一步是瓶颈，不会 fatal 但成本和延迟翻倍 |
| 4 | **错误成本 + 错误发现难度** | 错误便宜或容易发现，敢放手 | 错误贵 + 难发现 → 加 read-only / human-in-the-loop（但会限制 scale） |

**判断锚点**：如果你看到这个问题第一反应是"不计 token，把活干完"——这才是 agent 的甜蜜点。

**Coding agent 为什么四项全中**：任务模糊 ✓、价值高 ✓、模型能力强 ✓、unit test + CI 让错误容易发现 ✓。

### 2. Agent = 3 个组件 + 循环

Anthropic 内部定义："模型在循环里使用工具"。

| 组件 | 含义 |
|------|------|
| 环境（Environment） | agent 跑在哪儿（OS / 浏览器 / 代码仓库 / 业务系统） |
| 工具（Tools） | agent 怎么 take action 和拿反馈 |
| System prompt | 目标 / 约束 / 期望行为 |

**迭代纪律**：先把 3 个组件迭代到位，再考虑缓存、并行、进度展示等优化。**行为稳定前不要叠复杂度**。

### 3. 把自己塞进 Agent Context Window 的思维练习

**练习规则**：你只有 10-20K token，你只看得到那一份 system prompt + 工具描述 + 最近几个 observation。

**Barry 的 computer use agent 案例**——做一遍练习你立刻知道是什么体验：

1. 拿到一张静态截图 + 一段写得糟糕的任务描述，然后你点击一下
2. 点击执行的 3-5 秒里，相当于你闭着眼睛操作电脑
3. 睁开眼，看到下一张截图——你刚做的事可能成功，也可能把电脑关机了，你不知道
4. 循环重新开始

**练习产出**：立刻看到 agent 需要什么——
- 屏幕分辨率信息（知道怎么点）
- 推荐动作 + 限制（避免不必要的探索）
- 进度状态（避免重做已经做过的事）

### 4. 让 Claude 理解 Claude——偷懒招

Barry 团队高频使用的调试 / 设计技巧：

| 给 Claude 看的东西 | 问它什么 |
|-------------------|---------|
| 你的 system prompt | 里面有歧义吗？你能照着做吗？ |
| 工具描述 | 这个工具的参数够不够？是不是缺什么？ |
| Agent 的完整 trajectory | 你为什么在这一步做了这个决定？我应该补什么信息让你做得更好？ |

### 5. Barry 的 3 个开放问题（下一年的关键方向）

| # | 开放问题 | 核心张力 |
|---|---------|---------|
| 1 | **Budget-aware Agent** | agent 的成本和延迟不像 workflow 那样可控——怎么定义 + 执行 token / 时间 / 钱 的 budget |
| 2 | **Self-evolving Tools** | 已经能用模型迭代工具描述了，下一步 agent 能不能设计 + 改进自己的工具，让 agent 变成通用助手 |
| 3 | **Multi-agent 异步通信** | 现在系统都是同步的"user-assistant 回合制"，怎么扩展到异步通信，让 agent 之间能识别对方——Barry 认为这是接下来一年最大的开放问题 |

## 数据与案例

- **客服系统预算锚点**：每单 10 美分预算 → 单次任务 token 上限约 3-5 万 token，超过这个量级要用 workflow 处理常见情况
- **Coding agent 案例**：模糊任务 ✓ + 价值高 ✓ + 模型能力强 ✓ + unit test/CI 让错误容易发现 ✓，是 4 项全中的甜蜜点
- **Computer use agent 体验数据**：每次点击执行 3-5 秒内 agent 处于"闭眼操作"状态，循环结束才能从下一张截图判断是否成功

## 启发与思考

### 与现有 Agent 工程实践方向的连接

- **"先 workflow 再 agent"是克制哲学的延伸**：与 [Agent架构与协作模式](./Agent架构与协作模式-2026-05-12.md) 中的 "Anthropic 复杂度递进决策树" 是同一套思想——Barry 在这里给了更落地的 4 问清单作为决策入口
- **3 个组件 + 循环 vs Harness 十二维**：Anthropic 的极简定义和阿里 [Agent工程实践与落地](./Agent工程实践与落地-2026-05-12.md) 的十二维 Harness 不矛盾——3 个组件是 backbone，十二维是生产环境上要补的配套设施
- **Agent 视角练习可以制度化**：在 PRD / Spec 评审环节，强制把自己当成 agent，看一遍 prompt + 工具 + 最近 observation，能挖出大量"用户视角才看得到、agent 视角看不到"的信息缺口

### 可落地的行动项

1. **判断清单做成 review checklist**：每次决定"用 agent 还是 workflow"时，4 个问题逐条打分，避免一上来就上 agent
2. **建立"Claude 看 Claude"的调试惯例**：把 system prompt / 工具描述 / 失败的 trajectory 直接喂给 Claude，让它指出歧义和缺失
3. **预算上限作为产品参数**：每个 agent 任务上线前先算单次成本上限，超出 token 预算的高频路径强制切到 workflow

### 值得探索的方向

- **Budget-aware 的具体落地形态**：token 预算可以做成"硬上限 + 软提示"两层，超过软上限触发压缩/降级，超过硬上限直接中断
- **工具自我演化的边界**：让 agent 改 system prompt 风险最低、改工具描述次之、改工具实现风险最高——演化路径应该分级
- **异步 multi-agent 协议**：当前的 sub-agent 模式本质是同步阻塞调用，真正的异步通信需要类似 actor model 的消息机制

## 原文精华

> "Anthropic 内部对 agent 的定义只有一句话：模型在循环里使用工具。"

> "如果你看到这个问题第一反应是'不计 token，把活干完'——那是 agent 的甜蜜点。"

> "他们看到的成功 agent，哪怕产品形态完全不同，代码层面的 backbone 几乎一模一样。"

> "把自己放进 agent 的 context window：你只有 10-20K token，你只看得到那一份 system prompt + 工具描述 + 最近几个 observation。"

> "点击执行的 3-5 秒里，相当于你闭着眼睛操作电脑——睁开眼，看到下一张截图，你刚做的事可能成功，也可能把电脑关机了，你不知道。这就是 computer use agent 每秒在经历的事。"

> "怎么扩展到异步通信，让 agent 之间能识别对方——是接下来一年最大的开放问题。"

---
原文链接：（用户提供的文字稿，AI Engineer Summit 现场分享，无公开链接）
