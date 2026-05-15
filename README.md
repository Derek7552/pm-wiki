# 产品经理 Wiki

> 面向 AI 时代产品经理的通用知识库。聚焦产品方法论、AI 技术认知、产品案例、商业策略与思维框架。

---

## 阅读路径建议

> 第一次进入建议按这条主线读：**方法论 → 产品案例 → 技术认知 → 商业行业 → 思维**

1. **打牢产品功底** → `产品方法论/`（PM 角色、项目管理、AI PM 能力、AI 产品设计范式）
2. **看真实落地** → `产品案例研究/`（按产品分类的深度拆解）
3. **看懂 AI 技术** → `AI技术认知/`（按主题选子目录读）
4. **理解行业与商业** → `技术趋势/` + `商业策略/`
5. **升级思维与判断** → `思维模型/`

---

## 目录结构

```
pm-wiki/
├── 产品方法论/           # 通用 PM + AI PM：项目管理、角色、PRD、AI 时代价值转型、AI 产品能力模型、设计范式
├── 产品案例研究/         # 业务/产品落地案例
│   ├── claude-code/      # Claude Code 全景：源码、记忆、插件、Skills/Hooks、Cowork
│   ├── openclaw/         # OpenClaw 架构、安全攻防、ClawWorm 蠕虫
│   ├── hermes/           # Hermes Agent 自进化、多模型、工具/技能、前端
│   ├── opencli/          # OpenCLI 浏览器自动化、GUI→API 范式
│   └── 其他/             # 单文件产品案例：未来医生、Lazada 广告 Agent、贾维斯计划、淘宝语音、Floatboat、ColaOS
├── AI技术认知/           # PM 必备的 AI 技术认知（7 个主题）
│   ├── 综述/             # 跨主题概念：VibeCoding、范式迁移、研发效能、Harness 时代
│   ├── Agent/            # Agent 架构、记忆、反思、多 Agent、MCP 协议
│   ├── RAG/              # RAG 工程：切分、权限、检索、Rerank、失败排查
│   ├── Harness/          # Harness Engineering：架构、原语、四大杠杆、Meta-Harness
│   ├── Token与模型/      # Token 原理、Tokenizer、计费拆解、隐形成本
│   ├── 安全/             # AI/Agent/MCP 安全：OWASP、护栏、红队、AEGIS、OpenID
│   └── 工程指标/         # P50/P95/P99、CNN/RNN/LLM 对比等基础工程概念
├── 技术趋势/             # 行业事件、演讲、产业报告、研究综述
├── 商业策略/             # 商业模式、增长、出海、竞争策略、Token 经济
├── 术语表/               # 精简术语卡片库，按一级分类聚合
└── 思维模型/             # 多元思维模型与决策框架
    ├── 数学/             # 决策树、概率论、复利、排列组合
    ├── 物理学/           # 临界点、力学、均衡
    ├── 生物学/           # 进化论、生态位、规模效应
    ├── 心理学/           # 认知偏见、激励机制、社会证明
    ├── 经济学/           # 机会成本、比较优势、规模优势
    └── 会计学/           # 复式记账、现金流、报表分析
```

---

## 主题导航

### AI 产品（核心读物）
- [产品方法论/](./产品方法论/) — 项目管理、PM 角色、PRD 已死、AI PM 60 核心概念、五维能力模型、Agent 选型决策、UX→AX 设计范式、同质化陷阱
- [产品案例研究/](./产品案例研究/) — 按产品分类的深度拆解：
  - [claude-code/](./产品案例研究/claude-code/) — Claude Code 源码、记忆、Skills/Hooks/MCP、扩展三件套、Cowork
  - [openclaw/](./产品案例研究/openclaw/) — OpenClaw 架构、ClawWorm 蠕虫、CIK 状态投毒
  - [hermes/](./产品案例研究/hermes/) — Hermes Agent 自进化、多模型、工具技能管理
  - [opencli/](./产品案例研究/opencli/) — OpenCLI 浏览器自动化、GUI→API 范式
  - [其他/](./产品案例研究/其他/) — 未来医生医疗 AGI、Lazada 广告 Agent、贾维斯计划、淘宝语音点餐、Floatboat、ColaOS
- [AI技术认知/](./AI技术认知/) — 按主题阅读：
  - [Agent/](./AI技术认知/Agent/) — Agent 三要素、记忆、反思、Single vs Multi、MCP 协议、链路评估
  - [RAG/](./AI技术认知/RAG/) — Chunking、权限、检索失败、Rerank 延迟优化
  - [Harness/](./AI技术认知/Harness/) — Agent = Model + Harness、四大杠杆、Meta-Harness
  - [Token与模型/](./AI技术认知/Token与模型/) — 分词原理、计费拆解、隐形成本
  - [安全/](./AI技术认知/安全/) — OWASP MCP 风险、AEGIS 拦截、AI 红队
  - [综述/](./AI技术认知/综述/) — VibeCoding/SpecCoding/Harness 三流派、研发效能新度量
  - [工程指标/](./AI技术认知/工程指标/) — P50/P95/P99、神经网络对比

### 行业 / 趋势 / 商业
- [技术趋势/](./技术趋势/) — 林俊旸/Karpathy 演讲、RSAC2026、斯坦福 AI 指数、CPO 光模块、Palantir 本体论、Anthropic 研究
- [商业策略/](./商业策略/) — 贝壳第二曲线、SaaS 数据生死局、Palantir 护城河、Token 经济、AI 创业三特征

### 心法
- [思维模型/](./思维模型/) — 贝叶斯/奥卡姆、试探信息论、12 远古本能、深度思考力三法、系统之美

### 工具书
- [术语表/](./术语表/) — 精简术语卡片库，按一级分类聚合（AI 技术认知等），用于快速查询

---

## 命名约定

- 单篇文件：`序号-标题-yyyy-mm-dd.md`
- 封面 Prompt：以 `-封面Prompt.md` 结尾，与正文同目录
- 术语卡片：`术语表/{一级分类}.md`，多个术语聚合在同一文件，二级标题为术语名

---

## 维护说明

- 新增文章前先确认主题归属：
  - 围绕某款具体产品（如 Claude Code / OpenClaw / Hermes）的拆解 → `产品案例研究/<product>/`
  - 跨产品的方法论 / 原理性内容 → `AI技术认知/` 对应子目录
  - 事件 / 报告 / 演讲 → `技术趋势/`
- 跨主题文章在 README 主题导航处用交叉链接体现，不重复存放
