# CLI 才是 Agent 的终局：钉钉飞书集体抛弃 MCP

> 来源：[钉钉飞书集体抛弃 MCP，CLI 才是 Agent 的终局](https://mp.weixin.qq.com/s/qQ7rNc-b-ByJ0WIaJEYpeA)
> 提炼日期：2026-04-02
> 分类：技术趋势

## 核心观点

1. **CLI 正在取代 MCP 成为 Agent 操作软件的默认接口。** 2026 年 3 月，钉钉和飞书同一周内分别发布官方 CLI 工具并开源，两家都绕开了 MCP 协议。这不是个别选择，而是正在成型的行业共识。

2. **MCP 的 schema 膨胀导致 17 倍成本差距。** ScaleKit 的 benchmark 显示，CLI 与 MCP 在相同任务上的 token 消耗差距为 9-32 倍，MCP 失败率 28%，月均成本是 CLI 的 17 倍。根因是 MCP 每次对话需注入全部工具定义到上下文，而 CLI 按需 `--help` 即可。

3. **GUI 是给人类设计的翻译层，Agent 不需要。** 交互界面的演化逻辑是：CLI → GUI → 触屏，每次迁移服务新用户。Agent 作为新用户，天然适配 CLI——结构化输入输出、pipe 组合、自描述命令。CLI 是 LLM 的「母语」，MCP 是「外语」。

## 关键知识点

### 钉钉 CLI（dws）设计要点
- Go 语言，8MB 二进制，Apache-2.0 协议
- 12 个服务模块，「服务/资源/动作」三级命令结构
- Agent 友好设计：`--yes`（跳过确认）、`--mock`（模拟数据）、`--dry-run`（预览）
- 安全机制：无感认证、批量熔断、安全沙箱
- 优势场景：企业管理（OA 审批、考勤、DING 消息）

### 飞书 CLI（lark-cli）三层架构
- Go 语言，npm 分发，14MB，MIT 协议
- **Shortcuts 层**：`+` 前缀快捷命令，参数简化（如 `--markdown` 代替 JSON body）
- **API Commands 层**：100+ 命令，与平台 API 一一对应
- **Raw API 层**：直接调用 2500+ OpenAPI 端点（万能逃生舱）
- 特色：`schema` 命令（API 字典）、按域权限申请、`--as` 身份切换、`doctor` 诊断
- 优势场景：开发者体验、文档协作、邮件

### CLI vs MCP 核心差异

| 维度 | CLI | MCP |
|------|-----|-----|
| Token 消耗 | 基准 | 9-32 倍 |
| 月均成本（1 万次） | ~$3.2 | ~$55.2 |
| 可靠性 | 100% | 72%（28% 超时失败） |
| 上下文占用 | 按需 `--help` | 全量 schema 注入 |
| LLM 亲和度 | 母语（训练数据中有数十亿行 shell） | 后天学习 |

### MCP 的适用场景边界
- **CLI 适用**：企业内部、身份已知、权限预设、沙箱运行的场景
- **MCP 适用**：开放生态、陌生 Agent 接入、需要完整协议握手的场景
- 类比：CLI 是给自家人用的厨房工具，MCP 是给陌生人设计的安检流程

### 「翻译层演化」框架
- 大型机 → PC → 移动 → Agent，每次迁移因为出现新用户
- GUI 是 CLI 之后发明的翻译层，Agent 时代回归翻译层之前的原始形态
- 反直觉现象：不是从旧到新，而是从新回到旧

## 数据与案例

- **ScaleKit Benchmark**（Claude Sonnet 4）：查仓库语言 CLI 1,365 tokens vs MCP 44,026 tokens（32 倍）；查 PR 详情 CLI 1,648 vs MCP 32,279（20 倍）
- **Perplexity CTO**：内部正在远离 MCP，72% 上下文窗口被 MCP 占据
- **旧金山街头投票**：CLI 17 票 vs MCP 3 票，Greg Brockman（OpenAI 前联创）站 CLI，YC CEO 陈嘉兴："MCP sucks"
- **GitHub 星标**：飞书 CLI 1313 星 vs 钉钉 CLI 815 星；CLI-Anything 15000 星
- 行业路径：社区自发 → 第三方工具（OpenCLI 等） → 官方亲自做

## 启发与思考

1. **产品 CLI 化是 Agent 时代的入场券。** 如果你做 SaaS 产品，现在就应该规划 CLI 接口。不是包一层壳，而是让 Agent 直接调用底层能力。
2. **CLI 的 Agent 友好设计模式值得借鉴**：`--yes`（非交互模式）、`--dry-run`（预览）、`--mock`（测试）、结构化输出（JSON/NDJSON/CSV）、`schema`/`--help` 自描述。
3. **飞书的三层架构是一个优秀的 CLI 设计范式**：快捷层降低入门门槛，API 层保证一一对应，Raw API 层兜底所有边缘场景。
4. **MCP 不会死，但会退到开放生态的协议层**，类似 SOAP 的命运。企业内部场景，CLI 是更优选择。
5. **Skill + CLI 组合**是当前 Agent 操控外部服务的最佳实践模式——把 CLI 用法写成 Skill，Agent 即可上手。

## 原文精华

> CLI 是 LLM 的母语，MCP 是后天学的外语。

> 这就像去便利店买瓶水，店员非要先把整本商品目录念给你听。

> MCP 是给陌生人设计的安检流程，CLI 是给自家人用的厨房工具。硬把安检流程套在自家人身上，除了浪费时间，没有任何安全增益。

> 当你的用户从人变成了 AI，你就该用 AI 最擅长的方式暴露你的能力。

> 当用户都开始自己动手给你的产品做 CLI 的时候，说明官方已经晚了。

> 这场争论的本质不是品味之争，是延迟之争。

---
原文链接：https://mp.weixin.qq.com/s/qQ7rNc-b-ByJ0WIaJEYpeA
