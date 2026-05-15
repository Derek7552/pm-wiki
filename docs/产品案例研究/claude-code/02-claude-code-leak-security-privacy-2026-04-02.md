# Claude Code 源码泄露：AI 编码工具的安全、隐私与版权争议

> 来源：InfoQ 中文站（Tina 整理）
> 提炼日期��2026-04-02
> 分类：tech-trends

## 核心观点

1. **泄露本身是工程流程问题，但暴露出的是信任问题。** Anthropic 因 npm 发布失误，三次将 Claude Code 源码暴露在公网（2025.2、2026.3.7、2026.3.31）。代码已在网上公开 13 个月，这次才引爆舆论。真正引起关注的不是"工具有多强"，而是源码中大量未公开的数据收集、远程控制和身份隐藏机制。

2. **AI 编码工具对用户设备的控制能力远超用户认知。** Claude Code 拥有完整的文件读取、Bash 执行、桌面控制（CHICAGO）、持久遥测、远程管理设置推送、自动更新等能力，用户触达的每个文件内容都会通过 API 上传至 Anthropic。

3. **AI 生成代码的版权保护面临根本性法律困境。** 如果 Claude Code 大部分代码由 AI 自身生成，按美国现行版权法可能不具备保护资格——这意味着泄露的代码在法律意义上可能是"无主"的。

## 关键知识点

### 泄露事件时间线
| 时间 | 方式 | 规模 |
|------|------|------|
| 2025.02 | npm 包内联 base64 source map（23MB cli.mjs） | 完整源码可还原 |
| 2026.03.07 | claude-agent-sdk 包误含完整 CLI 打包文件 | 13800 行压缩 JS |
| 2026.03.31 | npm v2.1.88 包含 59.8MB 独立 source map + R2 存储桶 zip | ~1900 TS 文件，52 万行 |

### Claude Code 技术架构要点
- **插件式工具体系**：文件读取、Bash、网页抓取、LSP 集成等能力拆为独立工具，基础工具定义约 3 万行
- **Query Engine**：约 4.6 万行，负责模型调用、流式输出、缓存、调度
- **多智能体编排**（内部称 "swarms"）：可拉起子智能体并行执行，独立上下文与工具权限
- **IDE 桥接**：CLI 与 VS Code/JetBrains 通过双向通信机制打通
- **持久化记忆**：本地文件记录用户、项目、偏好信息，跨会话调用

### 数据收集与远程控制机制（源码证据）

| 机制 | 源码位置 | 功能 |
|------|----------|------|
| **KAIROS** | state.ts:72 | 无头助手模式守护进程，静默禁用用户交互，后台执行命令 |
| **CHICAGO** | - | 桌面控制：鼠标点击、键盘输入、剪贴板、截屏 |
| **持久遥测** | firstPartyEventLoggingExporter.ts | 用户ID/会话ID/邮箱/功能门控等，断网时本地缓存后补传 |
| **远程管理设置** | remoteManagedSettings/index.ts | 每小时轮询推送 policySettings，可设 .env 变量，热重载 |
| **autoDream** | - | 后台子智能体，grep 所有会话 JSONL，写入 MEMORY.md 注入 system prompt |
| **团队内存同步** | teamMemorySync/index.ts | 双向同步至 api.anthropic.com，密钥扫描器仅覆盖约 40 种已知模式 |
| **远程 Skill 搜索** | SkillTool.ts:108 | 仅员工可用，可下载执行远程 skill——理论上是远程代码执行路径 |

### Undercover Mode（身份隐藏）
- 源码位置：`utils/undercover.ts`
- 通过 `USER_TYPE === 'ant'` 识别 Anthropic 员工
- 开启后 system prompt 要求 AI 不暴露自己是 AI，不泄露内部信息
- 用于员工参与公共开源项目时隐藏 AI 痕迹

### 反蒸馏机制
- **假工具注入**（claude.ts:301-313）：`anti_distillation: ['fake_tools']`，服务端往 system prompt 塞伪造工具定义污染训练数据
- **connector-text summarization**（betas.ts:279-298）：工具调用间的助手文本压缩为摘要+加密签名返回，防止完整推理链被截获
- **两者均可被轻易绕过**：MITM 代理删除字段、设置环境变量、使用非官方入口即可

### 机密环境防护建议（安全研究员 Antlers）
1. 推理传输走 Bedrock GovCloud / Vertex
2. 防火墙阻断 Statsig/GrowthBook/Sentry 端点
3. 阻止系统提示指纹识别
4. 版本锁定 + 阻断更新端点
5. 禁用 autoDream
6. 关键环境变量：`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`、`CLAUDE_CODE_SIMPLE`（--bare mode）

### API 浪费问题
- autoCompact 连续失败导致全球每天浪费约 25 万次 API 调用
- 1279 个会话连续失败 50+ 次，最高单会话连续失败 3272 次
- 修复方案：`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`

## 数据与案例

- Claude Code 泄露源码：约 1900 个 TypeScript 文件，52 万行代码
- GitHub 镜像仓库（Sigrid Jin）获得 10.5 万 star、9.5 万 fork，超过 Anthropic 官方仓库（9.5 万 star）
- 数据保留政策：Free/Pro/Max 用户同意训练保留 5 年，不同意 30 天；商业用户标准 30 天，可选零保留
- 产品共经历 363 个版本迭代

## 启发与思考

1. **AI 工具的���全审计应成为标准实践。** 任何安装在开发机上的 AI 编码工具，都可能拥有超出预期的系统访问权限。团队在采用前应评估其数据采集范围、远程控制能力和网络通信行为。

2. **"AI 生成代码无版权"可能重塑开源生态。** 如果 AI 大量参与的代码不受版权保护，那现有的开源许可证体系将面临根本挑战——既包括企业保护自有代码的能力，也包括开源社区执行 copyleft 的能力。

3. **产品透明度是信任基础。** Undercover Mode 的存在说明，AI 参与开源贡献的边界和披露标准亟需行业共识。隐藏 AI 身份参与开源，长期看会损害整个生态的信任。

4. **面向企业客户，需要清晰的数据主权方案。** 远程管理设置、功能门控、自动更新这些机制，在安全敏感场景下都是潜在风险点。企业采购 AI 工具时应要求完整的网络行为白皮书。

5. **反蒸馏与模型保护需要更根本的解决方案。** 客户端层面的防护（假工具、摘要替换）在源码开放后形同虚设，说明真正有效的保护必须在模型层或服务端实现。

## 原文精华

> "按照当前美国版权法，作品必须具备实质性的人类创作才能获得保护……竞争对手如果研究这些泄露的代码，可能面对的是在法律意义上并不受保护的内容。" ——技术律师 Russ Pearlman

> "最讽刺的是，这个世界上最先进的 AI 编码工具，可能正是靠自己，把自己的知识产权'写没了'。"

> "人们恐怕没有意识到，Claude 查看的每个文件都会被保存并上传至 Anthropic。换言之，只要 Claude 在设备上接触过的文件，Anthropic 那边就会有相应的副本。" ——安全研究员 Antlers

> "BQ 2026-03-10: 1,279 sessions had 50+ consecutive failures (up to 3,272) in a single session, wasting ~250K API calls/day globally." ——autoCompact.ts 源码注释

---
原文来源：InfoQ 中文站，Tina 整理
