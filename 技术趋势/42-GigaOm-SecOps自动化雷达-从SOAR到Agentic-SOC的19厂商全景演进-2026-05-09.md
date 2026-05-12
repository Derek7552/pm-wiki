# GigaOm SecOps 自动化雷达——从 SOAR 到 Agentic SOC 的 19 厂商全景演进

> 来源：[GigaOm Radar for SecOps Automation v1.0 (Exaforce reprint)](https://portal.gigaom.com/reprint/gigaom-radar-for-secops-automation-v1-exaforce)
> 提炼日期：2026-05-09
> 分类：技术趋势

## TL;DR

GigaOm 首次发布 SecOps 自动化雷达，将 19 家厂商按"成熟度 vs 创新度 + 平台化 vs 单点能力"两轴划分，揭示行业正从确定性 SOAR（低代码/RPA 工作流）整体迁移到非确定性、LLM 原生的 Agentic SOC。"几乎所有参评厂商都在以某种方式实施 LLM 自动化"，差异化的关键不再是集成数量，而是 AI 智能体能否替代分析师完成调查与响应；Exaforce 凭借多模型融合（语义/行为/知识 + LLM）和零日响应能力，作为 LLM 原生 Outperformer 站上 Feature Play + Innovation 象限。

## 核心观点

### 观点一：SecOps 自动化的范式从"确定性工作流"转向"非确定性智能体"

传统 SOAR 围绕低代码/无代码工作流和 RPA 构建，所有动作由分析师预先编排成 playbook，逻辑确定、可审计但可扩展性差。新一代厂商引入 LLM/DSLM 后，自动化变得非确定性：智能体在运行时根据上下文自主选择调查路径、组合工具、撰写结论。报告由此把 SOAR 视为"经过四个迭代的自然演进"，并把 LLM 化分成三种实现：**设计时 LLM**（生成脚本、剧本、集成）、**确定性包装器**（LLM 嵌入既有工作流，由人审核结果）、**用户自定义 AI 智能体**（替代预配置剧本）。这是判断厂商技术代际的关键标尺。

### 观点二：评估维度结构反映出"集成 + 数据 + 智能体"三层叠加才是完整解

报告将能力拆为 **Key Features（8 项，权重最高）+ Emerging Features（8 项，权重较低）+ Business Criteria（5 项）**。Key Features 仍以集成编排、SIEM/SDL 接入、案例管理、检测即代码、零日响应、威胁关联、红队验证为主——这是 SOAR 的传统底盘；Emerging Features 则全部围绕 LLM：模块化、监控评估、设计时生成、调查/响应副驾驶、智能体、护栏、非 LLM AI、前 LLM 数据层。换言之，单纯做 AI 副驾驶或单纯做集成都不够，**前 LLM 数据层**（语义化、去重、上下文化）+ **AI 智能体调查能力** + **传统集成编排底盘**才能拿到全维度高分。

### 观点三：象限分布揭示两条赢家路径——平台扩展派 vs 智能体原生派

雷达把厂商定位在两轴四象限：纵轴 Maturity vs Innovation，横轴 Feature Play vs Platform Play。Maturity/Platform Play 集中了 Palo Alto Cortex XSOAR、Fortinet FortiSOAR、Swimlane（Outperformer）等老牌 SOAR；Innovation/Platform Play 出现 BlinkOps、Mindflow、Tines 这类把 LLM 嵌入低代码工作流生成器的"双形态"厂商；Innovation/Feature Play 则全部是 LLM 原生厂商，Exaforce、Imperum 是 Outperformer，Dropzone AI、Prophet Security、Radiant Security 等紧随其后。Forward Mover（缓步前进）只出现在 Maturity/Platform Play 象限——意味着传统 SOAR 厂商的 AI 改造速度反而慢于新生代。

## 关键知识点

### 1. GigaOm Radar 的评估方法论结构

**Key Features（高权重，8 项）**：
- 集成与编排能力
- 上下文风险评分
- SIEM/SDL 集成
- 案例管理与协作
- DevSecOps 与检测即代码
- 零日漏洞应对
- 威胁关联与演变分析
- 验证与红队测试

**Emerging Features（低权重，8 项，全部 LLM 相关）**：
- LLM 模块化（可插拔不同模型）
- LLM 监控与评估
- 设计时 LLM（用 LLM 生成 playbook/集成）
- LLM 调查/响应副驾驶
- LLM 智能体（自治的多步骤推理）
- 护栏机制（防越权、防幻觉）
- 非 LLM AI 特性（传统 ML/图算法）
- 前 LLM 数据层（语义化预处理）

**Business Criteria（高权重，5 项）**：技术支持、可扩展性、成本与许可、生态系统、可管理性。

**评分体系**：五星制（exceptional / superior / capable / limited / poor）。

**Radar 象限**：纵轴 Maturity↔Innovation，横轴 Feature Play↔Platform Play；厂商分类 Leader / Challenger / Entrant，再叠加 Outperformer / Fast Mover / Forward Mover 三档创新速度。

### 2. SecOps 自动化的三种 LLM 实现混合方式

| 模式 | 含义 | 代表厂商 | 风险/收益 |
|------|------|---------|----------|
| 设计时 LLM | 用 LLM 生成 playbook、集成代码、查询语句，运行期仍跑确定性逻辑 | BlinkOps、Mindflow、Tines、Torq | 收益：上手快；风险：生成质量需人工审核 |
| 确定性包装器 | LLM 嵌在工作流节点中（摘要、富化、推荐），主流程仍由 SOAR 控制 | 多数传统 SOAR（Palo Alto、Fortinet、Splunk） | 收益：可控性强；风险：智能体能力受限 |
| 用户自定义 AI 智能体 | 用户描述任务/目标，智能体自治调度工具完成调查响应 | Exaforce、Imperum、Dropzone AI、Prophet | 收益：可扩展、贴近分析师工作流；风险：可解释性、护栏 |

### 3. 厂商分类全景（19 家参评）

**Leaders / Outperformer**：Swimlane（Turbine，Platform/Maturity）、Exaforce（Agentic SOC，Feature/Innovation）、Imperum（SecOps Platform，Feature/Innovation）。

**Leaders / Fast Mover**：BlinkOps、Mindflow、Tines（均位于 Platform/Innovation）。

**Leaders / 其他**：Palo Alto Cortex XSOAR、Fortinet FortiSOAR（均位于 Platform/Maturity）。

**Challengers**：D3 Security Morpheus ASOC、Dropzone AI SOC Analyst、Prophet Security AI SOC Platform、Radiant Security（Outperformer）、SIRP、Splunk/Cisco SOAR（Forward Mover）、Intezer Autonomous SOC、Simbian Security Accelerator——大部分为 Fast Mover。

**Entrants**：StrikeReady Command Center。

> Forward Mover（缓速进化）只出现在 Maturity/Platform Play 象限（Palo Alto、Fortinet、Splunk），暗示传统 SOAR 在 AI 改造速度上落后于新生代。

### 4. Exaforce 的产品架构与差异化

**架构组件**：
- **Exabots**：模拟分析师推理的多个 AI 智能体，主要包含 Triage（分诊）、Investigate（调查）、Detect（检测）三类。
- **Advanced Data Exploration Platform**：摄取并语义化日志、配置、代码、身份、威胁源；作为 LLM 之前的"前数据层"。
- **多模型 AI 引擎**：组合深度学习/ML、知识图谱、LLM——LLM 不是唯一推理引擎。

**评分亮点**（5 星制）：
- 零日响应 ★★★★★（多模型管道：语义模型 + 行为模型 + 知识模型）
- 威胁关联 ★★★★★（跨多天的关联引擎）
- 前 LLM 数据层 ★★★★★（语义模型作为预处理首步）
- Key Features 平均 3.4（中等）；Emerging Features 平均 3.9（较强）

**差异化要点**：
1. **多模型融合**：不押注单一 LLM；语义/行为/知识模型组合，避免幻觉与上下文窗口瓶颈。
2. **零日检测**：用隔离森林、决策树等传统 ML 处理新型攻击模式（LLM 弱项）。
3. **行为智能体复盘**：定期重审历史误报，识别可能被错过的攻击链。

**短板**：
- 集成与编排：组合数量较少，缺少 API 版本控制、集成验证。
- 检测即代码：API 可编程但版本管理欠缺。
- 红队：内部跑测试，但未对外暴露红队功能。

### 5. 商业模式与目标市场分层

**Exaforce 的三层 SaaS 定价**（作为 LLM 原生厂商代表样本）：
- 基础层：1 个 Exabot Triage 智能体 + Investigate，3 个月数据保留。
- 高级层：基础层 + Exabot Detect 智能体。
- 企业层：上述全部 + 24/7 MDR 服务（人 + 智能体混合）。

**目标市场分层启示**：
- **中小企业**偏好低成本、预打包内容、易用工作流设计器。
- **大型企业**需要高性能、大容量、AI 能力（如分析师工作量匹配）。
- **MSSP**需要多租户架构、可预测定价、可扩展性。

**部署形态**：虚拟设备、软件、公有云镜像、SaaS 四类。

## 数据与案例

### 量化数据

- **参评厂商总数**：19 家。
- **Splunk SOAR 集成数**：300+ 第三方工具，为参评厂商最高。
- **顶级 Key Features 平均分**：Torq 4.4、Imperum 4.3、Mindflow 4.3。
- **顶级 Emerging Features 平均分**：Imperum 4.3、Tines/Torq 4.0、Mindflow 4.1。
- **Exaforce 平均分**：Key Features 3.4 / Emerging Features 3.9 / 综合 3.9。
- **报告有效期**：2025-09-25 发布，至 2026-09-24。

### 关键能力分布

- **集成与编排**：传统 SOAR 派（Swimlane、Imperum、BlinkOps）领先。
- **LLM 监控与评估**：BlinkOps、Radiant Security 双双 ★★★★★。
- **设计时 LLM**：BlinkOps、Mindflow、Tines、Torq 突出。
- **LLM 智能体**：Exaforce、Mindflow、Imperum、Radiant 最强。
- **零日响应**：Exaforce、Fortinet、Mindflow、Imperum、BlinkOps 均达 ★★★★+。

### 象限代表案例

- **Platform Play + Innovation**（低代码 + AI 原生融合）：BlinkOps、Mindflow、Tines——LLM 用于工作流生成，保留确定性自动化底盘。
- **Feature Play + Innovation**（LLM 原生）：Exaforce、Imperum、Dropzone AI——AI 智能体为核心，最少脚本需求。
- **Platform Play + Maturity**（成熟低代码）：Palo Alto、Fortinet、Swimlane、D3 Security——功能完整、集成丰富，LLM 仅作为增强特性。

> ⚠️ 待验证：报告未公开市场规模和增长率绝对数字；本文未引用估算数据。

## 启发与思考

### 与个人工作的关联（云起无垠产品总监视角）

1. **产品定位坐标系可直接套用**：把云起的能力放到"Maturity↔Innovation × Feature↔Platform"四象限里自检，决定到底是要做 Agentic SOC（Feature/Innovation）还是平台化 SOAR 替代（Platform/Maturity）；两者商业逻辑、客户画像、销售周期完全不同，不要混着打。
2. **三层叠加是产品 baseline**：要拿到客户买单，前 LLM 数据层 + 智能体调查 + 传统集成底盘缺一不可。光做 Agent 体验、不做语义化数据层会被"幻觉 + 上下文超限"反噬；只做集成不做智能体则被新生代降维打击。
3. **多模型融合是技术护城河**：Exaforce 用语义/行为/知识 + LLM 的组合架构同时拿到零日响应、威胁关联、前 LLM 数据层三个 5 星，验证了"不押单一 LLM"的工程哲学——对漏洞挖掘智能体、内部 PoC 同样适用。
4. **零日是 ML 而非 LLM 的主场**：LLM 擅长已知模式表达，零日反常检测仍由隔离森林/决策树承担——技术选型评审里要把"不是所有问题都给 LLM 做"作为硬性原则。

### 可落地的行动项

- 做一张内部对照表：把云起当前能力按 GigaOm 的 8 项 Key Features + 8 项 Emerging Features 自评打分，找出被同行 ★★★★+ 而我们 ★★ 以下的能力缺口。
- 重点跟踪 Exaforce、Imperum、Prophet Security、Dropzone AI 四家 LLM 原生新生代的产品演进与定价模型。
- 评估自家 MDR 服务（如有）是否要按 Exaforce 的"基础/高级/企业 + 智能体分层"重构定价，把 Agent 数量作为价值锚点而非席位数。
- 在产品 PRD 里强制要求"前 LLM 数据层"模块独立成章，不要把语义化、去重、上下文化埋在管道实现细节中。

### 值得进一步探索

- 19 家厂商中**用户自定义智能体**的产品形态差异（Exaforce 的 Exabots vs Imperum vs Dropzone）：是低代码画布、自然语言 prompt 还是 SDK？
- 护栏机制在 SOC 场景下的具体落地：审批流、人工 in-the-loop、白名单工具集，谁的方案最克制？
- "Forward Mover 集中在传统 SOAR"的反直觉现象：是工程债拖累，还是大客户合同结构不允许快速换底盘？

## 原文精华

> "Almost all participating vendors are implementing LLM automation in some way."

> "There is no universally 'best' or 'worst' product — each solution may be more or less suitable for specific customer needs."

> "Exaforce 的 Agentic AI 平台由 Exabots（模拟人类级推理进行告警调查的智能体）、Advanced Data Exploration Platform（摄取/分析/上下文化日志、配置、代码、身份、威胁源）以及多模型 AI 引擎（深度学习/ML、知识图谱、LLM 融合）组成。"

> "本报告是 SOAR 经过四次迭代后的自然演进，反映从低代码工作流向智能体的转变。"

---
原文链接：https://portal.gigaom.com/reprint/gigaom-radar-for-secops-automation-v1-exaforce
