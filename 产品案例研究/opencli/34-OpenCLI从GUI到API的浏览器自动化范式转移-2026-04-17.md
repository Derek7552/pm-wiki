# OpenCLI：从 GUI 到 API 的浏览器自动化范式转移

> 来源：阿里技术文章（粘贴内容）
> 提炼日期：2026-04-17
> 分类：技术趋势

## TL;DR

OpenCLI 提出浏览器自动化的范式转移：放弃不稳定的前端 UI 自动化操作，直接抓取并复现底层 API 请求。核心思路是"不跟网页界面较劲，直接抓它背后的 API"——浏览器里看到的数据本质上都是前端从某个接口拿回来的，把这个接口找出来、把请求复现出来，比点按钮靠谱得多。提供五级认证策略（public/cookie/header/intercept/ui）、AI 原生生成 CLI 流程、操作录制功能，支持 YAML/TypeScript 两种适配器格式。核心洞察：未来软件竞争维度从界面转向可调用性——Agent 不会欣赏你的按钮做得多圆，它只在乎能不能稳定调用你。

## 核心观点

### 1. 浏览器自动化的范式转移：从 GUI 操作到 API 复现

**论点**：传统 UI 自动化（点击按钮、填表单）不稳定且效率低，OpenCLI 采用"解析并复现底层 API 请求"的方式，从根本上解决浏览器自动化的效率与稳定性难题。

**推理逻辑**：
- 现有方案困境：UI 自动化依赖页面元素定位，页面改版就失效，维护成本高
- 本质洞察：浏览器里看到的数据，本质上都是前端从某个接口拿回来的
- 解决方案：把接口找出来、把请求复现出来，比点按钮靠谱得多
- 价值：大量业务系统跑在浏览器里（运营配置后台、工单处理系统、发布运维平台），自动化对提效和智能化运营价值巨大

**关键支撑**：
- 与已有笔记 `13-OpenCLI-浏览器会话复用-Agent工具连接层-2026-04-03.md` 形成互补：之前的笔记聚焦"复用 Chrome 登录态让网站/Electron 应用变 CLI"，本篇聚焦"如何从 GUI 发现并复现 API"
- 核心区别：从"会话复用"深入到"API 发现与适配器生成"的完整工作流

### 2. 五级认证策略：从公开 API 到 UI 自动化的渐进式降级

**论点**：OpenCLI 提供 5 级认证策略，通过 cascade 命令自动探测，从最简单的公开 API 到最复杂的 UI 自动化，形成渐进式降级方案。

**推理逻辑**：
- Tier 1: public（公开 API，不需要浏览器）→ 直接 fetch(url) 能拿到数据
- Tier 2: cookie（最常见，evaluate 步骤内 fetch）→ fetch(url, {credentials:'include'}) 带 Cookie 能拿到
- Tier 3: header（如 Twitter ct0 + Bearer）→ 加上 Bearer/CSRF header 后能拿到
- Tier 4: intercept（Store Action + XHR 拦截）→ 网站有 Pinia/Vuex Store
- Tier 5: ui（UI 自动化，最后手段）→ 前四种都不行时才用

**关键支撑**：
- 策略决策树自动化：`opencli cascade https://api.example.com/hot` 自动探测最优策略
- 适配器选择：有 evaluate 步骤（内嵌 JS 代码）用 TypeScript，纯声明式（navigate + tap + map + limit）用 YAML
- 设计哲学：UI 自动化是最后手段，优先尝试更稳定的 API 复现方式

### 3. AI 原生生成 CLI：从探索到验证的全自动化流程

**论点**：OpenCLI 提供 AI 原生生成 CLI 流程，通过浏览器探索、策略选择、适配器合成、测试验证四步，实现从目标网站到可用 CLI 命令的全自动化。

**推理逻辑**：
- 探索与分析（explore）：深度抓取页面、自动滚动、拦截网络请求、识别框架与状态管理、推断能力与推荐参数
- 策略选择：根据鉴权头/签名等特征自动选择策略（public/cookie/header/intercept/store-action）
- 适配器合成（synthesize）：基于探索产物生成候选 YAML，自动模板化 URL、字段映射与参数默认值
- 测试与验证（generate）：串联探索→合成→注册→验证，支持目标化选择与回退策略

**关键支撑**：
- 懒加载机制警告：很多 API 是懒加载的（用户必须点击某个按钮/标签才会触发网络请求），AI Agent 必须通过浏览器打开目标网站去探索，不能只靠静态分析
- AI Agent 探索工作流 6 步：打开浏览器 → 观察页面 → 首次抓包 → 模拟交互 → 二次抓包 → 验证 API → 写代码
- QoderWork 自动生成 CLI：提供 Skill 文件（CLI-ONESHOT.md 和 CLI-EXPLORER.md），指导 AI Agent 生成适配器

## 关键知识点

### AI Agent 探索工作流 6 步

| 步骤 | 工具 | 做什么 |
|------|------|--------|
| 0. 打开浏览器 | browser_navigate | 导航到目标页面 |
| 1. 观察页面 | browser_snapshot | 观察可交互元素（按钮/标签/链接） |
| 2. 首次抓包 | browser_network_requests | 筛选 JSON API 端点，记录 URL pattern |
| 3. 模拟交互 | browser_click + browser_wait_for | 点击"字幕""评论""关注"等按钮 |
| 4. 二次抓包 | browser_network_requests | 对比步骤 2，找出新触发的 API |
| 5. 验证 API | browser_evaluate | fetch(url, {credentials:'include'}) 测试返回结构 |
| 6. 写代码 | — | 基于确认的 API 写适配器 |

**懒加载机制警告**：
> **你（AI Agent）必须通过浏览器打开目标网站去探索！**
> 不要只靠 `opencli explore` 命令或静态分析来发现 API。
> 你拥有浏览器工具，必须主动用它们浏览网页、观察网络请求、模拟用户交互。

**原因**：很多 API 是懒加载的（用户必须点击某个按钮/标签才会触发网络请求）。字幕、评论、关注列表等深层数据不会在页面首次加载时出现在 Network 面板中。如果你不主动去浏览和交互页面，你永远发现不了这些 API。

### 五级认证策略决策树

```
直接 fetch(url) 能拿到数据？
  → ✅ Tier 1: public（公开 API，不需要浏览器）
  → ❌ fetch(url, {credentials:'include'}) 带 Cookie 能拿到？
       → ✅ Tier 2: cookie（最常见，evaluate 步骤内 fetch）
       → ❌ → 加上 Bearer / CSRF header 后能拿到？
              → ✅ Tier 3: header（如 Twitter ct0 + Bearer）
              → ❌ → 网站有 Pinia/Vuex Store？
                     → ✅ Tier 4: intercept（Store Action + XHR 拦截）
                     → ❌ Tier 5: ui（UI 自动化，最后手段）
```

**使用方式**：
```bash
opencli cascade https://api.example.com/hot
```

**适配器选择**：
- 你的 pipeline 里有 evaluate 步骤（内嵌 JS 代码）？
  → ✅ 用 TypeScript (src/clis/<site>/<name>.ts)，保存即自动动态注册
- 纯声明式（navigate + tap + map + limit）？
  → ✅ 用 YAML (src/clis/<site>/<name>.yaml)，保存即自动注册

### AI 原生生成 CLI 流程

**1. 探索与分析（explore）**
- 深度抓取页面
- 自动滚动
- 拦截网络请求
- 识别框架与状态管理
- 推断能力与推荐参数

**2. 策略选择**
- 根据鉴权头/签名等特征自动选择策略
- 支持 public/cookie/header/intercept/store-action

**3. 适配器合成（synthesize）**
- 基于探索产物生成候选 YAML
- 自动模板化 URL
- 字段映射与参数默认值

**4. 测试与验证（generate）**
- 串联探索→合成→注册→验证
- 支持目标化选择与回退策略

### Record 操作录制

**工作模式**："浏览器录制 - 智能回放"

**执行流程**：
1. 启动浏览器
2. 捕获用户在目标 URL 上的交互行为及产生的网络请求
3. 对请求序列进行评分排序与语义分析
4. 自动生成可复用的 CLI 命令

**当前局限性**：
- **请求体（Payload）缺失**：目前的录制引擎仅捕获请求元数据（url, method, body: responseBody），未能完整提取 POST/PUT 等写操作中的 Request Body
- **生成能力受限**：由于缺乏关键参数载荷，自动化脚本生成逻辑目前仅能覆盖只读类接口（如列表查询、详情获取并输出 YAML），无法有效支撑写操作类接口（如创建、更新、删除）的命令生成，导致自动化闭环在"写入场景"中断

### OpenCLI Skill 文件结构

**Skill 定义**：
```yaml
---
name: opencli
description: "Generate CLI adapter files (YAML/TypeScript) for the opencli framework. Use when the user wants to create CLI commands, build adapters for websites or APIs, or interact with the opencli tool. Covers browser-based API discovery, authentication strategy selection, and adapter generation workflows."
---
```

**工作流模式**：
- **Quick mode**（单命令）：Follow CLI-ONESHOT.md — 只需 URL + 描述，4 步完成
- **Full mode**（复杂适配器）：Read CLI-EXPLORER.md，涵盖浏览器探索工作流、认证策略决策树、平台 SDK（如 Bilibili apiGet/fetchJson）、YAML vs TS 选择、tap 步骤调试、级联请求模式、常见陷阱

**输出规范**：
- 所有适配器文件必须写入 `~/.opencli/clis/{site}/{command}.yaml` 或 `.ts`
- 不允许其他输出位置或文件格式（`.js`, `.json`, `.md`, `.txt`）

**命名约定**：
| 元素 | 规则 | 正确示例 | 错误示例 |
|------|------|----------|----------|
| site | 小写，允许连字符 | `aem`, `my-site` | `AEM`, `my_site` |
| command | 小写，连字符分隔 | `page-views`, `project-info` | `pageViews`, `project_info` |

**标准工作流**：
1. 创建目录：`mkdir -p ~/.opencli/clis/{site}`
2. 在正确路径生成适配器文件（YAML 或 TS）
3. 验证：`opencli list | grep {site}` 然后 `opencli {site} {command} {option}`

### CLI 执行流程

**入口阶段**：
- 加载命令清单
- 构建注册表

**执行阶段**：
- 根据策略与浏览器需求选择适配器或管道步骤
- 完成数据采集与输出

### 外部 CLI 集成

OpenCLI 支持现有 CLI 直接集成，形成统一的命令行接口。

## 数据与案例

### 快速上手示例

**安装**：
```bash
npm install -g @jackwener/opencli
```

**使用示例**：
```bash
opencli list                      # 查看所有命令
opencli list -f yaml              # 以 YAML 列出所有命令
opencli hackernews top --limit 5  # 公共 API，无需浏览器
opencli bilibili hot --limit 5    # 浏览器命令
opencli zhihu hot -f json         # JSON 输出
opencli zhihu hot -f yaml         # YAML 输出
```

### 使用案例 1：内部会画平台 CLI 化

**场景**：将内部会画平台的 Web 操作转化为 CLI 命令

**价值**：
- 提升操作效率
- 支持自动化脚本
- 便于 Agent 调用

### 使用案例 2：BOSS 招聘自动化

**场景 1：帮我和候选人沟通**
- 自动化候选人沟通流程
- 减少人工重复劳动

**场景 2：统计招聘数据**
- 自动抓取招聘数据
- 生成统计报表

## 启发与思考

### 对 AI Agent 工具设计的启发

1. **API 优先于 UI**：在设计 Agent 工具时，优先考虑 API 接口而非 UI 自动化。UI 自动化应该是最后手段，而非首选方案。

2. **渐进式降级策略**：五级认证策略提供了一个通用的设计模式——从最简单的方案开始尝试，逐步降级到更复杂的方案，最后才用最不稳定的方案。

3. **懒加载机制的普遍性**：很多现代 Web 应用都采用懒加载机制，AI Agent 必须主动交互才能发现所有 API。这对 Agent 工具设计提出了新要求：不能只做静态分析，必须支持动态探索。

### 对软件产品设计的启发

1. **可调用性是新的竞争维度**：未来软件不会只服务人，也会服务 Agent。评价标准从"界面顺不顺、按钮好不好点"转向"能不能稳定调用"。

2. **Agent 友好的设计原则**：
   - 提供清晰的 API 文档
   - 命令、参数、返回值、失败原因明确
   - 支持稳定的接口版本
   - 便于 Agent 理解、调用、验证

3. **从 GUI 到 CLI 的转变**：GUI 是给人用的，API 是能力底座，CLI 是 Agent 最喜欢的执行面。未来软件可能需要同时提供三种接口。

### 可落地的行动项

**本周**：
- 调研团队内部有哪些业务系统适合 CLI 化（运营配置后台、工单处理系统、发布运维平台）
- 试用 OpenCLI，为一个常用的内部系统生成 CLI 命令

**本月**：
- 为团队核心业务系统建立 OpenCLI 适配器库
- 评估哪些重复性操作可以通过 CLI 自动化
- 建立 CLI 命令的文档和最佳实践

**本季度**：
- 将 OpenCLI 集成到团队的 AI Agent 工作流中
- 建立"API 优先"的产品设计原则
- 为新产品设计时同步考虑 Agent 可调用性

### 值得进一步探索的方向

1. **Record 功能的完善**：如何解决请求体（Payload）缺失的问题？能否通过浏览器扩展或代理的方式完整捕获 POST/PUT 请求的 Request Body？

2. **跨平台适配器生成**：OpenCLI 目前主要针对 Web 应用，能否扩展到桌面应用（Electron）、移动应用（通过模拟器）？

3. **适配器质量评估**：如何评估自动生成的适配器质量？能否建立测试框架，自动验证适配器的稳定性和准确性？

4. **与 MCP 协议的关系**：OpenCLI 与 MCP（Model Context Protocol）是什么关系？能否将 OpenCLI 生成的 CLI 命令封装为 MCP 工具？

5. **企业级部署**：如何在企业环境中部署 OpenCLI？如何处理认证、权限、审计等企业级需求？

## 原文精华

> "核心想法很简单：不跟网页界面较劲，直接抓它背后的 API。浏览器里看到的数据，本质上都是前端从某个接口拿回来的。把这个接口找出来、把请求复现出来，比点按钮靠谱得多。"

> "很多 API 是懒加载的（用户必须点击某个按钮/标签才会触发网络请求）。字幕、评论、关注列表等深层数据不会在页面首次加载时出现在 Network 面板中。如果你不主动去浏览和交互页面，你永远发现不了这些 API。"

> "未来的软件，不会只服务人，也会服务 Agent。以前我们评价一个 SaaS，看的是界面顺不顺、按钮好不好点。但 Agent 不会欣赏你的按钮做得多圆。它只在乎一件事：能不能稳定调用你。"

> "GUI 是给人用的。API 是能力底座。而 Agent 最喜欢的，其实是更清晰的执行面：命令、参数、返回值、失败原因。"

> "未来软件可能会多一个新竞争维度：不是谁页面更好看。而是谁更容易被 Agent 理解、调用、验证，再接进工作流。唯有如此，才更有机会成为下一代工作流里的基础节点。"

> "过去的软件竞争界面，未来的软件竞争可调用性。"

---

**相关笔记**：
- `13-OpenCLI-浏览器会话复用-Agent工具连接层-2026-04-03.md`：聚焦"复用 Chrome 登录态让网站/Electron 应用变 CLI"
- 本篇：聚焦"如何从 GUI 发现并复现 API"的完整工作流

**开源项目**：
- GitHub: @jackwener/opencli
- Skill 文件：CLI-ONESHOT.md 和 CLI-EXPLORER.md 可在开源项目中下载
