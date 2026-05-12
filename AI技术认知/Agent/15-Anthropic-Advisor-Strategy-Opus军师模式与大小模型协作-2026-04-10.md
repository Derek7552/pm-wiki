# Anthropic Advisor Strategy：让 Opus 做幕后军师，Sonnet/Haiku 做执行者

> 来源：[The advisor strategy](https://claude.com/blog/the-advisor-strategy)
> 提炼日期：2026-04-10
> 分类：AI方法论

## TL;DR

Anthropic 把“大小模型协作”正式产品化了：让 Sonnet 或 Haiku 负责完整执行任务，只在关键卡点时向 Opus 请求高层指导。这样既避免了全程使用大模型的高成本，也比手工编排多模型工作流更简单。

这套 advisor strategy 的核心不是让 Opus 替代执行，而是把最贵的推理能力压缩到少数高难决策点。官方披露的数据表明，在多个 benchmark 上，这种策略不仅提升效果，甚至还能把整体成本压低。

## 核心观点

### 1. Advisor strategy 的本质，是把“大模型能力”从执行层下沉为“按需调用的决策层”

传统多模型协作里，常见做法是让最强模型做总控，把任务拆给多个小模型执行。这种方式的好处是主控强，但坏处是 orchestration 复杂、上下文管理重，而且最贵的模型通常参与时间过长。

Anthropic 的 advisor strategy 反过来设计：由 Sonnet 或 Haiku 作为主执行者，持续调用工具、读取环境、推进任务；只有在遇到高难判断、规划或纠错问题时，才调用 Opus。这样一来，大模型不再负责“跑全程”，而是只承担少数最有价值的决策时刻。

这意味着开发者购买的不是“全程 Opus 输出”，而是“关键节点上的 Opus 判断力”。它更像把最强模型变成一个嵌在执行循环里的战略参谋，而不是总指挥或一线工人。

### 2. 它解决的是 AI 应用里最现实的矛盾：智力强度与调用成本之间的对冲

很多 Agent 应用都卡在一个现实问题上：如果全程用强模型，质量更稳但成本过高；如果全程用轻模型，虽然便宜，但在复杂任务里经常卡在规划、反思、错误恢复等关键环节。

Advisor strategy 通过“平时省、关键时刻花”的机制，试图只在最值得付费的地方使用 Opus。因为昂贵的不是一两次短规划，而是整条长链路的持续高价生成。把最终长文本、工具调用、迭代尝试都交给 Sonnet/Haiku，能显著压低总体 token 成本。

从产品角度看，这并不是单纯的模型切换，而是一种成本结构重组：把高成本 token 从“全链路铺开”改成“只投向关键决策点”。因此它有机会同时提升性能和降低平均成本。

### 3. 这套机制真正降低的是“多模型工程门槛”，而不只是 API 账单

过去很多团队已经在手工做类似方案：小模型执行，卡住后把上下文打包给大模型求建议，再把建议塞回流程里继续跑。但这类实现往往很麻烦，要额外处理上下文裁剪、调用时机、跨模型消息格式、失败恢复和计费监控。

Anthropic 把它做成单次 Messages API 请求内的原生能力后，开发者不需要自己管理多次网络往返，也不需要手写复杂编排层。执行者会自行判断何时请 advisor 出手，系统则自动完成共享上下文传递和结果回接。

因此，这个工具的价值不只是“提升分数”，更在于把原本只有资深 Agent 团队才会玩好的高级编排技巧，压缩成一个低接入成本的官方能力。

## 关键知识点

### 1. 角色分工：执行者与军师各自负责什么

**执行者（Sonnet 或 Haiku）**负责整个任务生命周期，包括：
- 接收用户请求
- 调用工具
- 读取工具结果
- 多轮尝试和修正
- 生成最终对用户可见的输出

**军师（Opus）**只在执行者认为当前问题过难时介入，主要提供：
- 高层计划
- 纠错建议
- 停止信号或方向修正

军师**不会**：
- 自己调用工具
- 直接向用户输出最终答案
- 接管整个任务流程

这个分工非常关键，因为它保证最贵模型的参与范围被严格限制在“思考”而不是“执行”。

### 2. 工作机制：在同一个请求内完成多模型协作

Anthropic 将 advisor 设计成 Messages API 里的一个工具项。执行者模型在主循环中自主判断是否需要调用 advisor；一旦触发，系统会把双方共享的上下文发送给 Opus，请它返回一份指导计划，然后执行者继续后续动作。

它的关键特点有三个：
1. **同一请求内完成**：不需要开发者额外发第二个请求
2. **自动上下文交接**：不用手动拼接给 Opus 的 prompt
3. **执行者自主管理调用时机**：减少人为编排逻辑

这意味着它不是外部“路由器式”调度，而是被内嵌进模型执行循环的原生能力。

### 3. 接入方式：核心只是在 tools 里声明 advisor

官方示例的关键配置包括：
- 请求头增加 Beta 声明：`anthropic-beta: advisor-tool-2026-03-01`
- 在 `tools` 中添加 `advisor_20260301`
- 指定 advisor 使用的模型，例如 `claude-opus-4-6`
- 用 `max_uses` 限制单次请求可咨询的次数

示例结构如下：

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    tools=[
        {
            "type": "advisor_20260301",
            "name": "advisor",
            "model": "claude-opus-4-6",
            "max_uses": 3,
        },
    ],
    messages=[...]
)
```

这里最值得注意的不是语法本身，而是接入复杂度极低：原本需要自己实现的一整层大小模型协作逻辑，被压缩成 tools 里的一个配置项。

### 4. 成本控制机制：用 max_uses 和分模型计费控制预算

官方给出的成本逻辑是分开计费：
- 执行者的 token 按 Sonnet/Haiku 价格计算
- 军师的 token 按 Opus 价格计算

之所以总体可能更便宜，是因为：
- Opus 只输出短计划，通常约 400–700 token
- 长篇输出与工具交互的大头 token 仍由便宜模型承担
- 可以通过 `max_uses` 限制单次请求中 advisor 的最大触发次数

此外，使用明细会单独列出 advisor 的 token 消耗，便于团队做 A/B 测试和预算归因。

### 5. 适用场景：最适合“中高复杂度 + 高并发成本敏感”的 Agent 任务

这套策略特别适合以下场景：
- 任务存在明显的“难点节点”，例如规划、调试、反思、策略选择
- 大多数步骤可以由中小模型完成，但少数节点需要更强推理
- 业务量大，对单次任务成本敏感
- 团队希望提升效果，又不想自己维护复杂多模型 orchestrator

例如：
- Coding Agent 的调试和修复
- Research Agent 的信息整合与取舍
- Browser / Terminal Agent 的长链任务执行
- 高并发客服或任务处理系统中“便宜模型打底、强模型兜底”的结构

## 数据与案例

### 1. SWE-bench Multilingual：效果提升且成本下降

根据官方披露，在 **SWE-bench Multilingual** 上：
- 带 Opus advisor 的 Sonnet 执行者，得分比单独使用 Sonnet **高 2.7 个百分点**
- 平均每任务成本 **降低 11.9%**

这个结果说明，advisor strategy 不是“花更多钱买更高分”，而是有机会通过更合理的 token 分配实现“双优”。

### 2. BrowseComp 与 Terminal benchmark 2.0：Sonnet + Opus 全面优于 Sonnet 单跑

官方还提到，在 **BrowseComp** 和 **Terminal benchmark 2.0** 两项基准上：
- 有 Opus 担任 advisor 的 Sonnet 组合，分数更高
- 花费也低于单独使用 Sonnet

虽然原文摘要里没有展开全部细项数值，但结论很明确：在需要长链工具使用和复杂决策的任务中，轻执行 + 强顾问的组合优于轻模型单兵作战。

### 3. Haiku + Opus：性能翻倍式提升，但仍保持极高性价比

在 **BrowseComp** 中：
- Haiku 单跑成绩：**19.7%**
- 带 advisor 的 Haiku 成绩：**41.2%**

这意味着带 advisor 后成绩**翻倍以上**。同时：
- 该组合相对单跑 Sonnet，单次任务成本**下降 85%**
- 尽管最终分数仍比单用 Sonnet **低 29%**，但成本只是一小部分

这组数据特别适合高并发场景的产品决策：当目标不是绝对最强表现，而是“在可接受效果下把成本压到最低”，Haiku + Opus 可能是更优解。

### 4. 军师输出长度与计费结构

原文提到，advisor 通常只输出一份约 **400–700 token** 的简短指导计划。这个细节很重要，因为它解释了为什么引入 Opus 后成本不一定上升：真正烧钱的是长链执行和最终生成，而不是几次短规划。

> ⚠️ 待验证：文中部分 benchmark 的完整数值表未在当前整理材料中完整呈现，若后续需要做对外分享，建议直接回看官方原文图表，避免遗漏对比条件或误读坐标轴。

## 启发与思考

### 1. 对 Agent 产品设计的启发：不要把“最强模型”默认放在主流程里

很多团队做 Agent 时的默认思路，是先选最强模型做主控，再想办法压缩成本。Advisor strategy 提供了一个反向设计思路：先让便宜模型承担主流程，再把最贵能力做成一种“按需升级”的决策插件。

这对设计智能体产品很有启发：模型架构不应只按能力强弱排序，更应该按“哪一步最值得花钱”来分工。

### 2. 对业务策略的启发：未来会出现更多“基础执行模型 + 高阶认知插件”的套餐化能力

如果 advisor tool 被验证有效，那么平台级 AI 产品未来很可能不再只卖单一模型，而会卖“模型协作模式”。用户买的不是某个模型名字，而是某种成本-效果曲线下的组合策略。

从平台竞争角度看，这会把模型产品从参数竞赛推进到 orchestration 产品化竞争：谁能把复杂协作抽象成更简单的能力，谁更容易占领开发者心智。

### 3. 对实际落地的建议：优先用自己的评测集做三组 A/B

如果要把它应用到真实业务，最有价值的实验不是只看 benchmark，而是拿自己的任务集做三组对比：
1. 单跑 Sonnet
2. Sonnet + Opus advisor
3. 单跑 Opus

重点观察四个指标：
- 成功率 / 正确率
- 平均成本
- 平均时延
- 失败任务的类型分布

这样才能判断 advisor 是否真的把 Opus 用在了“值钱的节点”上，而不是只是多加了一层复杂度。

### 4. 对高并发场景的启发：Haiku + Advisor 可能是新的性价比模板

在面向海量请求的场景里，很多产品真正关心的不是 benchmark 冠军，而是单位成本下的可接受效果。Haiku + Opus advisor 的结果提示了一种值得重点验证的模板：用极便宜执行者承接大盘流量，只在复杂尾部问题上借助强推理提升上限。

这可能特别适合客服自动化、基础研究检索、标准化 coding task、流程型办公自动化等场景。

## 原文精华

> Sonnet or Haiku runs the task end-to-end, handling all tool calls and intermediate steps. When it encounters decisions that are particularly difficult, it can consult Opus for guidance.

> Opus never directly calls tools or writes the final answer. It simply provides high-level guidance to the executor.

> On SWE-bench Multilingual, Sonnet with Opus as an advisor scores 2.7 percentage points higher than Sonnet alone while reducing average cost per task by 11.9%.

---
原文链接：https://claude.com/blog/the-advisor-strategy
