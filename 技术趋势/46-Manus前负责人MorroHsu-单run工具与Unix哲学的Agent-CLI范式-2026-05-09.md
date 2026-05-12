# Manus 前负责人 MorroHsu——单 run 工具与 Unix 哲学的 Agent CLI 范式

> 来源：r/LocalLLaMA 帖子《I was backend lead at Manus. After building agents for 2 years, I stopped using function calling entirely. Here's what I use instead.》by MorroHsu（用户直接提供正文）；作者背景：Manus 后端 Lead（Meta 收购前）→ 自创开源 agent 运行时 Pinix + agent agent-clip
> 提炼日期：2026-05-09
> 分类：技术趋势

## TL;DR

Manus 前后端负责人 MorroHsu 在 2 年 Agent 实战后得出反共识结论：**单个 `run(command="...")` 工具 + Unix 风格命令 全面胜过"几十个类型化 function calling 工具"的目录式架构**。理由是 Unix 50 年前与 LLM 50 年后做了同一个设计决定——都把"一切"还原为文本/token 流，CLI 因此成为 LLM 训练数据中**密度最高**的工具使用模式（GitHub README/CI 脚本/Stack Overflow 解决方案都是 CLI），LLM 早就"会用"。架构由两层组成：**Layer 1 执行层**保留纯 Unix 语义（pipe / chain 4 算子 `|` `&&` `||` `;` / exit code，绝不污染管道数据）+ **Layer 2 表示层**针对 LLM 两条硬约束（context 有限且贵 / 仅能处理文本）做四件事：Binary Guard（防二进制污染上下文）、Overflow Mode（>200 行或 >50KB 截断 + 落盘 + 提示用 grep/tail 探索）、Metadata Footer `[exit:0 | 1.2s]`、stderr Attachment（失败时绝不丢 stderr）。配合三项启发式设计——**渐进式 --help 发现（Level 0 命令清单注入 → Level 1 命令名 usage → Level 2 子命令参数）**、**错误消息即导航（必含"做错了什么 + 该改成什么"）**、**输出格式一致**——让 Agent 在使用过程中**越用越聪明**。生产事故的代价：一张 PNG 用 cat 读出 20 轮颠簸、一个 stderr 静默丢弃导致 10 轮包管理器盲猜（pip / python3 -m pip / uv pip / pip3 / sudo apt … 第 10 次才用 `uv run --with` 成功）。**核心论断：CLI is all agents need**（除了强类型交互、高安全需求、纯多模态原生这三类边界场景）。

## 核心观点

### 观点一：Unix 文本流哲学与 LLM 的 token 流本质在 50 年间偶然收敛，CLI 是 Agent 的 native 接口

**两个独立设计决定的同构**：
- Unix 1969 年决定："一切都是文本流"——程序之间不交换复杂二进制结构，通过文本管道通信，小工具用 `|` 组合成强大工作流；用 `--help` 自描述、用 exit code 报告成败、用 stderr 传错误。
- LLM 2020 年代决定："一切都是 token"——只懂文本、只产文本，"思考"是文本、"动作"是文本、世界反馈也必须是文本。

**结论**：LLM 在使用工具时本质上就是一个**终端操作员**（terminal operator），只是比任何人类都更快、且训练数据里已经吃了海量 shell 命令和 CLI 模式。Unix 为人类终端操作员设计的文本系统（cat / grep / pipe / exit code / man pages）不是"对 LLM 可用"，而是**天然契合**。**核心哲学：不要为 Agent 发明新的工具接口，把 Unix 50 年验证的东西直接交给 LLM 就好**。

### 观点二：单 run 工具的认知负担显著低于多 function calling 目录

**Function calling 多工具目录的问题**：每次调用前 LLM 必须做"工具选择"——选哪一个？什么参数？工具越多准确率越低。**认知负担花在"用哪个工具"而非"我要完成什么"**。

**单 run 工具 + CLI 命名空间的优势**：LLM 仍然要选"用哪个命令"，但**命令选择是统一命名空间内的字符串组合，function 选择是不相关 API 之间的上下文切换**——后者难度高出几个量级。同一个任务：

| 方法 | 调用次数 | 实现 |
|------|---------|------|
| Function calling | 3 次（read_file → search_text → count_lines） | 每次返回中间结果再传给下一个 |
| 单 run + CLI | 1 次 | `cat /var/log/app.log \| grep ERROR \| wc -l` → 42 |

**3 → 1 的差距不是优化，是 Unix pipe 原生支持组合的副产品**。再加上 chain parser 支持 4 算子（`|` 管道 / `&&` 与 / `||` 或 / `;` 顺序），N 个命令 × 4 算子的组合空间巨大——**对 LLM 来说只是它本来就会写的一段字符串**。

### 观点三：启发式设计三技法 + 两层架构 = 让 CLI 自己引导 Agent，越用越聪明

单 run + CLI 解决"用什么"，但 Agent 还要知道"怎么用"——它**不能 Google 也不能问同事**。三项技法层层递进：
- **Technique 1 渐进式 --help 发现**：Level 0 工具描述里注入命令清单 → Level 1 命令名无参数返回 usage → Level 2 子命令缺参数返回具体参数。Agent 按需发现，每层只给"够进入下一步"的信息。
- **Technique 2 错误消息即导航**：每个错误必含"做错了什么 + 该改成什么"。例 `[error] cat: binary image file (182KB). Use: see photo.png` → Agent 一步纠正。
- **Technique 3 输出格式一致**：每条结果末尾 `[exit:0 | 12ms]`——Agent 在一次对话里看几十次后内化模式，看到 `exit:1` 知道检查错误，看到长耗时知道减少调用频率。

**三技法对应的 Agent 学习模式**：
- --help → "What can I do?" → 主动发现
- Error Msg → "What should I do?" → 反应纠错
- Output Fmt → "How did it go?" → 持续学习

**两层架构是工程实现**：Layer 1（Unix 执行层）必须保持纯净——绝不在 pipe 中间截断或加 metadata，否则 grep 只能搜前 200 行 / `[exit:0]` 会被当成搜索目标污染下游。Layer 2（LLM 表示层）只在 pipe chain 完成后做处理：Binary Guard + Overflow Mode + Metadata Footer + stderr Attachment。**这不是设计偏好，是逻辑必然**。

## 关键知识点

### 1. 为什么 LLM 早就"会用" CLI

CLI 是 LLM 训练数据中**密度最高的工具使用模式**：

```
# README install instructions
pip install -r requirements.txt && python main.py

# CI/CD build scripts
make build && make test && make deploy

# Stack Overflow solutions
cat /var/log/syslog | grep "Out of memory" | tail -20
```

GitHub 上数十亿行代码里到处是 CLI 命令——**不需要教 LLM 用 CLI，它已经会**。这种熟悉度是概率性、模型相关的，但实践中跨主流模型表现都很可靠。

### 2. 4 个 chain 算子构成完整工作流空间

| 算子 | 含义 | 示例 |
|------|------|------|
| `\|` | Pipe：上一个 stdout 作为下一个 stdin | `cat log \| grep ERROR \| wc -l` |
| `&&` | And：前一个成功才执行下一个 | `curl -sL $URL -o data.csv && cat data.csv \| head 5` |
| `\|\|` | Or：前一个失败才执行下一个 | `cat config.yaml \|\| echo "config not found"` |
| `;` | Seq：无论前一个结果都执行 | `command1; command2` |

**N 个命令 × 4 算子 = 巨大组合空间**，每次工具调用可以是一条完整工作流。

### 3. 渐进式 --help 三层发现机制

**Level 0：工具描述里注入命令清单**（对话开始即可见）

```
Available commands:
  cat    — Read a text file. For images use 'see'. For binary use 'cat -b'.
  see    — View an image (auto-attaches to vision)
  ls     — List files in current topic
  write  — Write file. Usage: write <path> [content] or stdin
  grep   — Filter lines matching a pattern (supports -i, -v, -c)
  memory — Search or manage memory
  clip   — Operate external environments (sandboxes, services)
  ...
```

**Level 1：命令名无参 → usage**

```
→ run(command="memory")
[error] memory: usage: memory search|recent|store|facts|forget

→ run(command="clip")
  clip list                              — list available clips
  clip <name>                            — show clip details and commands
  clip <name> <command> [args...]         — invoke a command
  ...
```

**Level 2：子命令缺参数 → 具体参数**

```
→ run(command="memory search")
[error] memory: usage: memory search <query> [-t topic_id] [-k keyword]

→ run(command="clip sandbox")
  Clip: sandbox
  Commands:
    clip sandbox bash <script>
    clip sandbox read <path>
    clip sandbox write <path>
  ...
```

**对比"塞 3000 字工具文档进 system prompt"**：大部分信息大部分时间不相关——纯粹浪费 context。**渐进式 help 让 Agent 自己决定何时需要更多**。

**作者标注的开放问题**：注入完整命令清单 vs 全靠按需发现——命令多了，清单本身消耗 context 预算。**作者承认仍在探索平衡点，欢迎社区讨论**。

**对命令设计的强制要求**：每个命令和子命令必须有完整 help 输出。**好的 help 消息 = 一次成功；缺失的 = 盲猜**。

### 4. 错误消息即导航的设计原则

**传统 CLI 错误**为人类设计——人类能 Google：
```
$ cat photo.png
cat: binary file (standard output)
→ 人类 Google "how to view image in terminal"
```

**面向 Agent 的错误**必须自带导航：
```
[error] cat: binary image file (182KB). Use: see photo.png
→ Agent 直接调用 see，一步纠正
```

**完整示例库**：

| 错误场景 | 错误消息 | Agent 行为 |
|---------|---------|----------|
| 未知命令 | `[error] unknown command: foo\nAvailable: cat, ls, see, write, grep, memory, clip, ...` | 立即知道有哪些命令 |
| 类型不匹配 | `[error] not an image file: data.csv (use cat to read text files)` | 从 see 切换到 cat |
| 资源不存在 | `[error] clip "sandbox" not found. Use 'clip list' to see available clips` | 知道先列出 clips |

**Technique 1 + 2 协同**：help 解决"我能做什么"，error 解决"我该改成什么"，**Agent 恢复成本通常 1–2 步**。

### 5. 输出格式一致让 Agent 越用越聪明

每条结果末尾追加：
```
file1.txt
file2.txt
dir1/
[exit:0 | 12ms]
```

**LLM 提取两个信号**：

| 信号 | Unix 约定 | LLM 内化 |
|------|----------|---------|
| Exit codes | exit:0 成功 / exit:1 一般错误 / exit:127 命令不存在 | LLM 训练数据已熟，零教学成本 |
| Duration | 12ms 便宜可放心调 / 3.2s 中等 / 45s 昂贵慎用 | 形成成本意识 |

**Agent 在一次对话里看几十次 `[exit:N \| Xs]` 后内化模式**：看到 exit:1 → 检查错误；看到长耗时 → 减少调用。**一致性让 Agent 越用越聪明，不一致让每次调用都像第一次**。

### 6. 两层架构的逻辑必然性

```
┌─────────────────────────────────────────────┐
│  Layer 2: LLM Presentation Layer            │  ← 为 LLM 约束设计
│  Binary guard | Truncation+overflow | Meta   │
├─────────────────────────────────────────────┤
│  Layer 1: Unix Execution Layer              │  ← 纯 Unix 语义
│  Command routing | pipe | chain | exit code │
└─────────────────────────────────────────────┘
```

**为什么不能合层**：
- 在 Layer 1 截断 cat 输出 → grep 只搜前 200 行 → 结果不完整
- 在 Layer 1 加 `[exit:0]` → 流入 grep 当数据被搜索 → 污染下游

**Layer 1 必须保持原始、无损、无 metadata**。处理只在 pipe chain 完成、最终结果即将返 LLM 时才发生。

### 7. LLM 的两条硬约束驱动 Layer 2 四机制

**约束 A：Context 有限且昂贵**——每个 token 有钱、注意力、推理速度的成本。塞 10MB 文件不只浪费预算，还把早期对话推出窗口（"遗忘"）。

**约束 B：LLM 只能处理文本**——二进制经 tokenizer 产生高熵无意义 token，不只浪费 context，**还干扰对周围有效 token 的注意力，降低推理质量**。

**Layer 2 四机制**：

| 机制 | 解决的约束 | 实现 |
|------|----------|------|
| **Binary Guard** | B | Null byte 检测 / UTF-8 验证 / 控制字符占比 >10% → 二进制；图像返回 `Use: see photo.png`；其他二进制返回 `Use: cat -b file.bin` |
| **Overflow Mode** | A | 输出 >200 行或 >50KB → 截断前 200 行（rune-safe 不切断 UTF-8）+ 全文写到 `/tmp/cmd-output/cmd-{n}.txt` + 提示用 grep/tail/head 探索 |
| **Metadata Footer** | 通用 | 末尾追加 `[exit:0 \| 1.2s]` |
| **stderr Attachment** | 通用 | 命令失败时 `output + "\n[stderr] " + stderr` |

**Overflow Mode 的关键洞察**：LLM 已经知道怎么用 grep / head / tail 导航文件——**Overflow Mode 把"大数据探索"转化成 LLM 已经具备的技能**。

### 8. CLI 不是银弹的三类边界场景

作者明确划界，**这些场景类型化 API 更好**：

| 场景 | 原因 | 示例 |
|------|------|------|
| 强类型交互 | Schema 验证比字符串解析可靠 | 数据库查询、GraphQL API |
| 高安全需求 | CLI 字符串拼接有注入风险 | 不可信输入场景；agent-clip 通过 sandbox 隔离缓解 |
| 纯多模态原生 | CLI 文本管道是瓶颈 | 纯音频/视频处理等二进制流场景 |

**"无迭代上限" ≠ "无安全边界"**。安全由外部机制保证：
- **Sandbox 隔离**：命令在 BoxLite 容器内执行，无法逃逸
- **API 预算**：LLM 调用有账户级花费上限
- **用户取消**：前端取消按钮 + 后端优雅停机

## 数据与案例

### Story 1：PNG 导致 20 轮颠簸（Binary Guard 缺位的代价）

- **背景**：用户上传架构图，Agent 用 cat 读取，收到 182KB 原始 PNG 字节流。
- **过程**：tokenizer 把字节变成成千上万无意义 token 塞进 context；LLM 看不懂开始尝试 cat -f / cat --format / cat --type image，**每次收到同样的垃圾**。
- **结果**：20 轮后被强制终止。
- **根因**：cat 没有二进制检测，Layer 2 没有 guard。
- **修复**：isBinary() guard + 错误引导 `Use: see photo.png`。
- **教训**：**工具结果是 Agent 的眼睛，返回垃圾 = Agent 失明**。

### Story 2：静默 stderr 与 10 次盲猜（stderr Attachment 缺位的代价）

- **背景**：Agent 需要读 PDF，尝试 `pip install pymupdf`，得到 exit code 127。stderr 含 `bash: pip: command not found`，但代码因"stdout 非空就丢 stderr"的逻辑把它丢了。
- **过程**：Agent 只知"失败"不知"为什么"，开始盲猜：

```
pip install         → 127  (不存在)
python3 -m pip      → 1    (模块未找到)
uv pip install      → 1    (用法错)
pip3 install        → 127
sudo apt install    → 127
... 其他 5 次尝试 ...
uv run --with pymupdf python3 script.py → 0 ✓  (第 10 次)
```

- **结果**：10 次调用，每次 ~5 秒推理。**stderr 第一次可见的话，1 次就够**。
- **修复**：失败时永远 attach stderr。
- **教训**：**stderr 是 Agent 在命令失败时最需要的信息——永远别丢**。

### Story 3：Overflow Mode 的价值

- **背景**：Agent 分析 5000 行日志文件。
- **无 Overflow**：全文 ~200KB 塞进 context，注意力被压垮、响应质量骤降、早期对话被推出窗口。
- **有 Overflow**：

```
[first 200 lines of log content]

--- output truncated (5000 lines, 198.5KB) ---
Full output: /tmp/cmd-output/cmd-3.txt
Explore: cat /tmp/cmd-output/cmd-3.txt | grep <pattern>
         cat /tmp/cmd-output/cmd-3.txt | tail 100
[exit:0 | 45ms]
```

- **结果**：Agent 看前 200 行理解结构 → 用 grep 定位问题 → **3 次调用，2KB context 内搞定**。
- **教训**：**给 Agent 一张"地图"远比给它整片"领土"有效**。

### 项目元数据

- **作者**：MorroHsu，Manus 后端 Lead（Meta 收购前）
- **开源运行时**：Pinix
- **开源 Agent**：agent-clip（Go 语言）
- **源代码**：github.com/epiral/agent-clip
- **核心文件**：
  - `internal/tools.go` — 命令路由
  - `internal/chain.go` — pipes
  - `internal/loop.go` — 两层 agentic loop
  - `internal/fs.go` — Binary Guard
  - `internal/clip.go` — stderr 处理
  - `internal/browser.go` — 视觉自动 attach
  - `internal/memory.go` — 语义记忆

> ⚠️ 待验证：Manus 被 Meta 收购的时间点与官方公告需在引用前核实；Pinix / agent-clip 项目当前活跃度与社区采纳情况需对照仓库 commit 历史。

## 启发与思考

### 与个人工作的关联（云起无垠产品总监 / 安全 + AI 方向）

1. **MorroHsu 立场是 45 号 Claude Code Harness 路线的极端版**：Claude Code 提供 4 个能力原语（Read / Write / Execute / Connect），MorroHsu 主张直接合并为 1 个 `run`。**两者哲学一致——运行时越笨越稳定，但 MorroHsu 把"笨"推到了极致**。云起做安全 Agent 时可对比这两条路线：4 原语适合权限分级清晰的政企客户（每个原语对应不同 ACL），单 run 适合开发者/红队工具（追求极致灵活）。
2. **CLI 是漏洞挖掘 Agent 的天然接口**：渗透测试领域的工具栈（nmap / sqlmap / metasploit / ffuf / nuclei / curl / grep）100% 是 CLI——**LLM 训练数据里这部分密度极高**。云起的漏洞挖掘 Agent 应放弃"为每个安全工具包一个 function"的诱惑，直接给 LLM 一个 sandbox + 单 run 工具。
3. **Story 2 的 stderr 教训对内部 Agent 平台是直接生产事故风险**：云起当前的 Agent 客户端如果有"stdout 非空就丢 stderr"的逻辑，会出现"Agent 在客户环境跑 10 轮盲猜"的真实故障——这是合同 SLA 红线。需要立刻排查云起 Agent 的 stderr 处理路径。
4. **Overflow Mode + 落盘提示是上下文经济学的实战机制**：与 44 号笔记 MCP token 暴涨痛点、45 号 Claude Code Auto-Compaction 形成完整三件套——**"截断 + 落盘 + grep/tail 探索提示"是给 Agent 一张地图而非全境**，应作为云起所有安全工具输出格式的强制约定。
5. **错误消息即导航是政企客户合规审计的友好设计**：政企合规审计常需追溯"Agent 为何做了 X"——错误消息自带"做错了什么 + 该改成什么"的格式，让审计人员看 trace 时直接读懂决策链。把这个设计作为云起 SOC Agent 的合规优势写进销售话术。
6. **三类边界场景的承认对产品定位有价值**：MorroHsu 自己划界 CLI 不适合强类型交互 / 高安全需求 / 纯多模态。**云起做"AI 红队报告生成"是强类型场景（OWASP/NIST/CSA 编号必须 schema 化），做"漏洞利用执行"是高安全场景（必须 sandbox 隔离），做"流量包分析"是多模态场景（pcap 二进制流）**——这意味着云起需要混合架构：报告/合规层用 typed function，红队执行层用 sandbox + 单 run，流量分析层用专用 binary handler。

### 可落地的行动项

- **stderr 排查 P0**：48 小时内排查云起所有 Agent 客户端代码，确认无"stdout 非空就丢 stderr"逻辑。这是直接合同事故风险。
- **二进制 Guard 标准化**：在云起所有"读取文件 / 抓取响应"路径加入 isBinary() 三层检测（null byte / UTF-8 / 控制字符占比），返回类似 `Use: see/cat -b` 的导航式错误。
- **Overflow Mode 落地**：所有命令输出 >200 行或 >50KB 强制走截断 + 落盘 + grep/tail 提示路径——把这条规则写进云起 Agent SDK 默认行为。
- **PoC：用单 run + Unix CLI 重构云起一个安全模块**：选漏洞挖掘 Agent 或 SOC 调查 Agent 中的一个，用 MorroHsu 路线重构（单 run + 命令路由 + 4 chain 算子 + 三层 help + 错误导航 + 输出格式一致），与现有"function calling 目录"版本做 A/B 对比，量化"完成同一安全任务的工具调用次数 / token 消耗 / 误报率"。
- **错误消息合规模板**：起草《云起 Agent 错误消息标准》——每条错误必须包含 `what failed` + `what to try instead` + `current state hint`，作为 PRD 强制章节。
- **沙箱化承诺写进合同**："命令在 BoxLite/类似容器中执行，无法逃逸"必须写进云起的 SOW 安全条款附件——这是政企客户买单单 run 路线的前提。

### 值得进一步探索

- **MorroHsu 自己承认的开放问题——命令清单注入 vs 按需发现**：当云起的安全工具集扩展到 50+ 命令时，Level 0 全注入会消耗多少 token？是否需要做"按 session 任务类型动态裁剪命令清单"的中间层？
- **CLI 路线在多 Agent 协作下的表达力**：MorroHsu 是单 Agent + 单 run；当云起需要多 Agent（漏洞挖掘 Agent + 报告 Agent + 客户访谈 Agent）协作时，"agent-to-agent 通信"是否也应该 CLI 化（例如 `msg send agent-name "..."` / `msg recv --from agent-name`）？这与 45 号笔记 Claude Code Agent Teams + 44 号 A2A 协议讨论形成三角对照。
- **CLI 注入风险的具体防御技法**：作者用 sandbox 隔离缓解，但具体攻击面有哪些（命令拼接逃逸、环境变量投毒、PATH 劫持、shell 解析特殊字符）？云起做安全产品时应反过来——**把这些攻击面做成自家"AI Agent CLI 注入测试"产品的 payload 集**。
- **MCP vs CLI 在云端 Agent 上的边界**：44 号笔记里 Anthropic 给的答案是"CLI 管本地、MCP 连云端"。MorroHsu 路线本质上把所有云端工具也包成 CLI（curl / aws-cli / gcloud / terraform 都是 CLI）——**云端 Agent 是不是真的需要 MCP，还是 CLI + sandbox 已够用？这是云起做政企客户技术选型时绕不开的问题**。
- **跨语言 CLI 一致性**：云起客户环境涉及 Linux / Windows / macOS / 容器等，cmd vs PowerShell vs bash 的 CLI 语义差异极大——单 run 路线是否需要一个跨平台 CLI 抽象层（类似 `tldr` 项目的反向）？

## 原文精华

> "A single `run(command="...")` tool with Unix-style commands outperforms a catalog of typed function calls."

> "Unix made a design decision 50 years ago: everything is a text stream. ... LLMs made an almost identical decision 50 years later: everything is tokens. ... When it comes to tool use, an LLM is essentially a terminal operator — one that's faster than any human and has already seen vast amounts of shell commands and CLI patterns in its training data."

> "Don't invent a new tool interface. Take what Unix has proven over 50 years and hand it directly to the LLM."

> "Cognitive load is spent on 'which tool?' instead of 'what do I need to accomplish?'"

> "Command selection is string composition within a unified namespace — function selection is context-switching between unrelated APIs."

> "I don't need to teach the LLM how to use CLI — it already knows."

> "A good help message means one-shot success. A missing one means a blind guess."

> "The tool result is the agent's eyes. Return garbage = agent goes blind."

> "stderr is the information agents need most, precisely when commands fail. Never drop it."

> "Giving the agent a 'map' is far more effective than giving it the entire territory."

> "Layer 1 serves Unix semantics. Layer 2 serves LLM cognition. The separation isn't a design preference — it's a logical necessity."

> "Hand Unix philosophy to the execution layer, hand LLM's cognitive constraints to the presentation layer, and use help, error messages, and output format as three progressive heuristic navigation techniques. CLI is all agents need."

---
原文链接：原文为用户直接粘贴的 r/LocalLLaMA Reddit 帖子正文；作者 MorroHsu，开源项目 Pinix + agent-clip（github.com/epiral/agent-clip）
