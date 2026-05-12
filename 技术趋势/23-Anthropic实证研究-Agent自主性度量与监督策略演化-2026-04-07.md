# Anthropic实证研究：AI Agent自主性在真实部署中的度量

> 来源：[Measuring AI agent autonomy in practice](https://anthropic.com/research/measuring-agent-autonomy)
> 提炼日期：2026-04-07
> 分类：技术趋势

## 核心观点

1. **存在显著的"部署悬挂"（Deployment Overhang）**：模型能力远超用户实际授予的自主权。METR评估显示Claude Opus 4.5能以50%成功率完成人类需5小时的任务，但Claude Code 99.9分位的单轮时长仅约42分钟，中位数仅45秒。实践中的自主性远滞后于模型能力上限。

2. **用户监督策略随经验演化：从逐项审批转向监控+介入**：新用户20%使用auto-approve，有经验用户超40%。但有经验用户的中断率也从5%升至9%——这不是矛盾，而是监督模式从"事前审批每个动作"转向"放手运行+出问题时介入"。有效监督不要求批准每个动作，而是处于能介入的位置。

3. **Agent自主性是模型、用户、产品三方共同建构的涌现属性**：Claude通过主动暂停提问来限制自身自主性（复杂任务上主动提问频率是人类中断频率的2倍以上），用户通过信任积累调整监督策略，产品通过权限默认设置塑造行为。任何单一维度（pre-deployment评估/用户行为/产品设计）都无法完整刻画Agent自主性。

## 关键知识点

### Claude Code自主性演化趋势

| 指标 | 数值 | 含义 |
|------|------|------|
| 中位turn时长 | ~45秒，3个月基本稳定 | 大量新用户涌入拉低分布 |
| P99.9 turn时长 | 从<25分钟→>45分钟（3个月翻倍） | 头部用户的自主性边界在快速扩展 |
| P99.9增长曲线 | 跨模型发布平滑增长，无跳变 | 自主性增长不纯粹是模型能力驱动，信任积累和产品改进是重要因素 |
| 内部成功率 | 最难任务成功率翻倍（Aug→Dec） | 同期人均干预次数从5.4降至3.3 |

### 用户监督策略演化模型

```
新用户阶段（<50 sessions）：
  └→ 20% auto-approve → 逐项审批为主
  └→ 5% 中断率 → 很少需要中断（因为每步都审批了）

有经验用户（750+ sessions）：
  └→ 40%+ auto-approve → 放手让Agent跑
  └→ 9% 中断率 → 更频繁介入（因为在监控中发现问题）

本质转变：事前审批（Pre-approval）→ 事后监控+介入（Monitor & Intervene）
```

### Claude自我暂停 vs 人类中断的分布

**Claude自我暂停的原因（Top 5）：**
1. 呈现多个方案让用户选择（35%）
2. 收集诊断信息或测试结果（21%）
3. 澄清模糊或不完整的请求（13%）
4. 请求缺失的凭证/Token/访问权限（12%）
5. 在执行前获取批准确认（11%）

**人类中断Claude的原因（Top 5）：**
1. 提供缺失的技术上下文或纠正错误（32%）
2. Claude太慢/卡住/做了过多无用功（17%）
3. 已获得足够帮助可以自己继续（7%）
4. 想自己执行下一步（测试/部署/提交等）（7%）
5. 中途变更需求（5%）

### Agent风险-自主性全景图（基于998K API工具调用）

- **80%** 的工具调用有至少一种安全防护措施
- **73%** 有某种形式的人类参与
- **仅0.8%** 的动作不可逆（如发送客户邮件）
- 软件工程占近 **50%** 的agentic活动
- 高风险高自主区域（右上象限）稀疏但**不为空**——含安全评估、金融交易、医疗信息

### 四项建议

1. **投资部署后监控**：Pre-deployment评估无法观察到很多实际模式，需建设隐私保护的post-deployment监控基础设施
2. **训练模型识别自身不确定性**：Agent主动暂停提问是重要安全属性，与外部防护互补
3. **为用户监督而非审批设计产品**：提供可信的可见性+简单的介入机制，而非强制逐项审批
4. **不要过早规定交互模式**：强制"人类必须批准每个动作"会产生摩擦而不一定带来安全收益

## 数据与案例

- **998,481个**随机API工具调用分析样本
- **500K** Claude Code交互会话
- METR评估：Claude Opus 4.5 以50%成功率完成需人类5小时���任务
- Anthropic内部数据：Aug→Dec最难任务成功率翻倍，人均干预5.4→3.3次
- 自主性增长在模型发布（Sonnet/Opus/Haiku迭代）之间**平滑过渡**，无阶梯跳变
- API流量中高风险集群多为安全评估/红队测试（非真实恶意使用）
- 软件工程以外的新兴领域：商业智能、客服、销售、金融、电商，各占比<几个百分点

## 启发与思考

1. **"部署悬挂"对AI产品设计的启示**：模型能力>>用户实际授权，这意味着AI产品的核心挑战不是让模型更强，而是设计让用户逐步建立信任的机制。Claude Code的auto-approve率从20%→40%是一条"信任积累曲线"，产品设计应刻意引导这条曲线。

2. **与"对话式AI到Agentic AI范式转移"的深度连接**：本文用数据验证了此前笔记中的判断——"决策权让渡"是核心区别。用户从逐项审批到监控+介入的转变，就是决策权让渡的微观过程。Gartner预测40%Agent项目将被取消，本文数据给出了更具体的解释：信任积累需要时间，而很多项目等不及。

3. **Agent自我暂停是被低估的安全能力**：Claude主动提问频率在复杂任务上>人类中断频率2倍，这意味着在最需要监督的场景下，模型比人类更积极地寻求对齐。这与"拷问模式替代Plan Mode"的理念一致——Agent主动提问是好事，应该鼓励而非压制。

4. **对沃丰AI客服产品的启示**：如果AI客服Agent未来走向更高自主性，本文的监督策略演化模型可直接指导产品设计——为新客户提供逐项审批模式，为老客户提供监控+介入模式，而非一刀切。

5. **方法论价值**：用Claude自己来分类和评估数百万工具调用的风险/自主性/人类参与度——这是一个"AI评估AI"的可复用方法论，与Harness Engineering中"GAN式评审"异曲同工。

## 原文精华

> Effective oversight doesn't require approving every action but being in a position to intervene when it matters.

> The autonomy agents exercise in practice is co-constructed by the model, the user, and the product.

> There is a significant deployment overhang, where the autonomy models are capable of handling exceeds what they exercise in practice.

> As tasks get harder, Claude increasingly limits its own autonomy by stopping to consult the human, rather than requiring the human to step in.

> Oversight requirements that prescribe specific interaction patterns, such as requiring humans to approve every action, will create friction without necessarily producing safety benefits.

---
原文链接：https://anthropic.com/research/measuring-agent-autonomy
