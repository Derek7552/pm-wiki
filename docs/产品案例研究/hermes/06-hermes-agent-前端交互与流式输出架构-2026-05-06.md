---
title: Hermes Agent — 前端交互与流式输出架构深度拆解
source: https://github.com/nousresearch/hermes-agent
date: 2026-05-06
tags: [AI-Agent, CLI-TUI, 流式输出, prompt-toolkit, Streaming, Skin引擎, 开源]
related: 02-hermes-agent-自进化AI智能体平台-2026-04-27.md
---

# Hermes Agent — 前端交互与流式输出架构深度拆解

> 一句话总结：**Hermes 用 prompt_toolkit + Rich 双引擎构建了一个全功能 CLI/TUI，通过三层流式 Scrubber（Think/Context/Tag）保证用户只看到干净输出，并以数据驱动的 Skin 引擎和四级工具进度模式实现高度可定制的交互体验。**

---

## 1. 整体架构概览

```
┌──────────────────────────────────────────────────────────┐
│                    CLI TUI 布局                           │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  [条件] Sudo密码 / Secret输入 / 审批选择 / 澄清选择 │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Spinner 动画 (⠋ 💻 ls -la  2.3s)                 │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  可滚动内容区                                       │  │
│  │  ╭─ ⚕ Hermes ────────────────────────────────╮     │  │
│  │  │    Agent 响应（Markdown 渲染 / 纯文本）     │     │  │
│  │  ╰───────────────────────────────────────────╯     │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  状态栏 (Model | Context 42% | Session abc...)     │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  ━━━ 输入分隔线 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │
│  │  [图片附件 badge]                                   │  │
│  │  > 用户输入区 (TextArea, 多行)                      │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │
│  │  [语音状态栏]                                       │  │
│  │  [Tab补全菜单]                                      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**技术栈**：

| 组件 | 库 | 用途 |
|------|---|------|
| TUI 框架 | **prompt_toolkit** | Application/Layout/HSplit/Window/KeyBindings |
| Markdown 渲染 | **Rich** | Console/Panel/Markdown/Text |
| 交互式选择 | **curses** | checklist/radiolist（fallback 到编号列表） |
| 颜色系统 | ANSI 转义码 | NO_COLOR / TERM=dumb 兼容 |
| 主题引擎 | 自研 skin_engine | YAML 驱动的数据化皮肤 |

---

## 2. 流式输出管线（核心）

这是 Hermes 前端最精密的部分——一条多级过滤的 token 管线：

```
LLM API 流式响应
    │
    ├── Anthropic: .stream() context manager
    ├── OpenAI: .create(stream=True) iterator
    └── Bedrock: converse_stream() 在后台线程
    │
    ▼ 分流
┌────────────────────────────────────────────────┐
│ text_delta → _fire_stream_delta(text)          │
│ thinking_delta → _fire_reasoning_delta(text)   │
│ tool_call_delta → 累积参数 JSON                 │
│ tool_gen_started → _fire_tool_gen_started(name) │
└───────────┬────────────────────────────────────┘
            │
    ▼ Layer 1: Think Scrubber（Agent 层）
┌────────────────────────────────────────────────┐
│ StreamingThinkScrubber.feed(text)              │
│ - 状态机追踪 <think>/<reasoning> 块            │
│ - 跨 delta 边界的部分标签缓冲                   │
│ - 块内文本丢弃，块外文本通过                     │
└───────────┬────────────────────────────────────┘
            │
    ▼ Layer 2: Context Scrubber（Agent 层）
┌────────────────────────────────────────────────┐
│ StreamingContextScrubber.feed(text)            │
│ - 过滤 <memory-context>...</memory-context>    │
│ - 防止记忆注入泄露到用户输出                     │
└───────────┬────────────────────────────────────┘
            │
    ▼ stream_delta_callback / _stream_callback
            │
    ├── CLI 路径 ──────────────────────────────┐
    │                                          │
    │   ▼ Layer 3: CLI Tag Filter              │
    │   ┌──────────────────────────────────┐   │
    │   │ cli._stream_delta()              │   │
    │   │ - 块边界检测（行首 vs 行中）       │   │
    │   │ - 推理内容路由到推理框            │   │
    │   │ - 行缓冲 + 面板渲染              │   │
    │   └──────────────────────────────────┘   │
    │                                          │
    ├── Gateway 路径 ─────────────────────────┐│
    │   ▼                                     ││
    │   ┌──────────────────────────────────┐  ││
    │   │ GatewayStreamConsumer.on_delta() │  ││
    │   │ - 线程安全队列                    │  ││
    │   │ - 限速编辑（1s 间隔）             │  ││
    │   │ - 渐进式消息编辑（非多条发送）     │  ││
    │   └──────────────────────────────────┘  ││
    │                                         ││
    └── API Server 路径 ──────────────────────┘│
        ▼                                      │
        ┌──────────────────────────────────┐   │
        │ SSE event: data: {"delta":"..."}  │   │
        │ + hermes.tool.progress 事件       │   │
        └──────────────────────────────────┘   │
                                               │
    ▼ None 信号 = 工具边界                      │
    清空缓冲、重置状态、准备下一段               │
```

### 2.1 为什么需要三层 Scrubber？

这是一个因 LLM 流式 token 切分导致的经典问题：

**问题**：模型发送 `<think>Let me check</think>`，但被切分为三个 delta：
```
delta1 = "<think>"
delta2 = "Let me check"
delta3 = "</think>"
```

**逐 delta 正则的错误**：
- delta1 被正则匹配删除 → 下游状态机**永远看不到**开标签
- delta2 看起来像普通文本 → **泄露推理内容给用户**
- delta3 被正则匹配删除 → 状态机以为没有关闭

**StreamingThinkScrubber 的解法**（状态机）：
```python
class StreamingThinkScrubber:
    _OPEN_TAG_NAMES = ("think", "thinking", "reasoning", "thought", "REASONING_SCRATCHPAD")
    
    def feed(self, text: str) -> str:
        # _in_block: 是否在块内
        # _buf: 持有未决的部分标签
        # _last_emitted_ended_newline: 块边界判定
        ...
```

- delta1 → `_in_block = True`，返回空
- delta2 → 块内丢弃，返回空
- delta3 → `_in_block = False`，返回空
- 结果：**用户看到空白**（正确）

**块边界规则**（防误伤）：开标签只在**流起始位置**、**换行后**或**当前行只有空白**时才被识别为推理块。这防止了文中提到 `<think>` 标签名时的误剥离。

### 2.2 Context Scrubber（记忆注入过滤）

`StreamingContextScrubber` 过滤 `<memory-context>...</memory-context>` 标签——这是记忆系统注入到对话中的上下文，不应该出现在用户可见输出中。

```
<memory-context>
[System note: The following is recalled memory context, NOT new user input...]
{memory content}
</memory-context>
```

### 2.3 工具边界信号

当工具执行完成后，Agent 发送 `None` 信号：
```python
if self.stream_delta_callback:
    self.stream_delta_callback(None)  # flush + reset
```

CLI 收到后清空行缓冲，Gateway 收到后分段消息。这是"一次对话可能有多段响应"的关键协议。

---

## 3. Spinner 与工具进度系统

### 3.1 KawaiiSpinner

Hermes 的加载动画不是简单的转圈，而是带有"个性"的 Kawaii 风格 spinner：

```python
# 9 种 Spinner 帧集
SPINNERS = {
    'dots':    ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    'bounce':  ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
    'moon':    ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
    'brain':   ['🧠', '💭', '💡', '✨', '💫', '🌟', '💡', '💭'],
    ...
}

# Kawaii 等待表情
KAWAII_WAITING = ["(｡◕‿◕｡)", "(◕‿◕✿)", "٩(◕‿◕｡)۶", ...]

# Kawaii 思考表情
KAWAII_THINKING = ["(｡•́︿•̀｡)", "(◔_◔)", "(¬‿¬)", "( •_•)>⌐■-■", ...]

# 思考动词
THINKING_VERBS = ["pondering", "contemplating", "musing", "cogitating", ...]
```

**运行时显示**：
```
⠹ (◕‿◕✿) contemplating... 💻 ls -la (2.3s)
```

**设计细节**：
- 10 FPS 动画刷新（100ms interval）
- 随机选择表情和动词
- 实时计时器显示工具执行耗时
- **Skin 可定制**：每个皮肤可覆盖 waiting_faces、thinking_faces、thinking_verbs
- **TTY 检测**：非终端环境（Docker、pipe、systemd）自动禁用动画
- **prompt_toolkit 集成**：CLI 的 TUI 模式下通过 `_spinner_text` Widget 渲染，而非直接写 stdout

### 3.2 四级工具进度模式

通过 `display.tool_progress` 配置或 `/verbose` 命令切换：

| 模式 | 输出 | 适用场景 |
|------|------|---------|
| **off** | 静默 | 平台默认（Slack 等低能力平台） |
| **new** | 去重后的单行进度 | 日常使用（连续多次同工具只显示一次） |
| **all** | 每次工具执行一行 | 想看执行过程 |
| **verbose** | 全部 + 工具参数/结果 + 推理块 + 调试日志 | 开发调试 |

**"new" 模式的去重逻辑**：记录 `_last_scrollback_tool`，连续相同工具（如多次 `read_file`）只打印第一次。

**滚动行格式**（由 `get_cute_tool_message()` 生成）：
```
  ┊ 💻 $  ls -la                    1.2s
  ┊ 🔍 searched  "hermes streaming"  0.8s
  ┊ ✍️  wrote     src/main.py         0.3s  [error]   ← 失败时红色标记
```

每个工具有独立的 emoji（可通过 Skin 覆盖）、动词（executed/searched/wrote...）和耗时。

### 3.3 工具进度回调链

```
tool_progress_callback("tool.started", name, preview, args)
    │
    ▼ CLI: _on_tool_progress()
    ├── 更新 _spinner_text = "emoji preview"
    ├── 记录 _tool_start_time (monotonic)
    └── 存储 args 待完成时输出

    ... 工具执行中 ...

tool_progress_callback("tool.completed", name, ..., duration, is_error)
    │
    ▼ CLI: _on_tool_progress()
    ├── 如果 mode="all"/"new": 打印滚动行
    ├── 如果有 tool_complete_callback: 触发 inline diff
    └── 语音模式: 播放 1200Hz 提示音
```

### 3.4 内联 Diff 渲染

当工具修改了文件（write_file、patch、skill_manage），CLI 可以在滚动区域渲染**彩色内联 diff**：

```
  ┊  src/main.py
  ┊  @@ -12,3 +12,5 @@
  ┊  ██ def hello():           ← 红色背景 = 删除
  ┊  ██     return "Hello"
  ┊  ██ def hello_world():     ← 绿色背景 = 新增
  ┊  ██     return "Hello, World!"
  ┊  ██     # improved version
```

实现方式：
1. `tool_start_callback` → 在工具执行前快照文件内容
2. `tool_complete_callback` → 执行后比较，生成 `unified_diff`
3. Diff 颜色从 Skin 引擎解析（dark/light 主题自适应）
4. 限制：最多 6 个文件、80 行 diff，超出显示省略摘要

---

## 4. Skin 引擎（数据驱动主题）

### 4.1 架构

```yaml
# ~/.hermes/skins/mytheme.yaml
name: mytheme
description: A custom theme

colors:
  banner_border: "#CD7F32"      # 面板边框
  banner_title: "#FFD700"       # 面板标题
  response_border: "#FFD700"    # 响应框边框
  status_bar_bg: "#1a1a2e"      # 状态栏背景
  status_bar_good: "#8FBC8F"    # 上下文健康（绿）
  status_bar_warn: "#FFD700"    # 上下文警告（黄）
  status_bar_critical: "#FF6B6B" # 上下文危险（红）
  ui_ok: "#4caf50"              # 成功指示
  ui_error: "#ef5350"           # 错误指示
  completion_menu_bg: "#1a1a2e" # Tab补全菜单背景
  # ... 25+ 可配置颜色点

spinner:
  waiting_faces: ["(⚔)", "(⛨)"]         # 等待表情
  thinking_faces: ["(⌁)", "(<>)"]       # 思考表情
  thinking_verbs: ["forging", "plotting"] # 思考动词

branding:
  agent_name: "Hermes"          # 响应框标题
  response_label: "⚕ Hermes"   # 响应框前缀
  welcome: "Welcome, warrior."  # 欢迎消息
  goodbye: "Until next time."   # 退出消息

tool_prefix: "┊"                # 工具输出行前缀
tool_emojis:                    # 每工具 emoji 覆盖
  terminal: "⚔"
  web_search: "🗡"
  
banner_logo: |                  # ASCII art 欢迎 Logo
  ╔═══════════╗
  ║  MY AGENT ║
  ╚═══════════╝
```

### 4.2 内置 Skin

| Skin | 风格 | 特点 |
|------|------|------|
| **default** | 金色暗色调 | 标准 Hermes 品牌色 |
| **ares** | 战斗风 | 剑与盾 emoji |
| **mono** | 极简单色 | 无 emoji，纯 ASCII |
| **slate** | 灰蓝冷色调 | 专业感 |
| **daylight** | 亮色调 | 亮色终端适配 |
| **warm-lightmode** | 暖色亮色 | 日间模式 |

### 4.3 颜色解析链

```
代码请求颜色 → Skin 配置 → 默认 Skin → 硬编码 ANSI
```

Skin 中未定义的颜色自动从 default skin 继承。所有颜色支持 `#RRGGBB` 格式，运行时转为 24-bit ANSI 转义码（`\033[38;2;R;G;Bm`）。

---

## 5. 用户输入系统

### 5.1 输入路由（Enter 键绑定）

`handle_enter()` 是一个多路分发器：

```
用户按 Enter
    │
    ├── 模态窗口激活？（Sudo / Secret / Approval / Clarify）
    │   → 路由到模态响应队列
    │
    ├── Agent 正在运行？
    │   ├── busy_input_mode == "interrupt"  → 中断 Agent（默认）
    │   ├── busy_input_mode == "queue"      → 排队到下一轮
    │   └── busy_input_mode == "steer"      → 通过 .steer() 注入到当前对话
    │
    ├── 以 / 开头？
    │   → 路由到 process_command()（Slash 命令）
    │
    └── 普通消息
        → 路由到 _pending_input 队列 → chat()
```

### 5.2 文件拖放检测

```python
# _detect_file_drop() 解析粘贴的路径
"/path/to/image.png describe this"
→ 自动附加图片 + 文本 "describe this"

"/path/to/file.txt"
→ 包装为 "[User attached file: ...]" 消息
```

### 5.3 剪贴板图片粘贴

- Ctrl+Shift+V → 终端发送 `<img src="...">` 标记
- 解析后提取到临时 PNG 文件
- 显示附件 badge 计数
- 随消息一起发送给 Agent（视觉模型处理）

### 5.4 Tab 补全系统

`SlashCommandCompleter` 提供多源补全：

| 补全源 | 触发 | 示例 |
|--------|------|------|
| Slash 命令 | `/` 开头 | `/help`, `/model`, `/skills` |
| 子命令 | 命令后空格 | `/model claude-3.5-sonnet` |
| 文件路径 | `/` 后匹配 | `/home/user/project/src/` |
| Context 引用 | `@` 开头 | `@file:main.py`, `@diff`, `@staged` |
| 模糊文件搜索 | `@` + 部分名 | `@main` → `src/main.py` |

`SlashCommandAutoSuggest` 在输入时显示灰色提示文本（类似 fish shell）。

---

## 6. 模态交互窗口

### 6.1 澄清对话（Clarify Tool）

Agent 需要用户选择时，弹出交互式选择面板：

```
┌─────────────────────────────────┐
│ Which framework?                │
├─────────────────────────────────┤
│ [x] React                       │ ← 箭头导航
│ [ ] Vue                         │    Space 切换
│ [ ] Angular                     │    Enter 确认
│ [ ] Other (type free text)      │
├─────────────────────────────────┤
│ Timeout in 45s...              │
└─────────────────────────────────┘
```

- 支持多选（checkbox）和单选（radio）
- "Other" 选项切换为自由文本输入
- 45 秒超时保护（防止 Agent 无限等待）

### 6.2 危险命令审批（Approval）

```
┌─────────────────────────────────┐
│ ⚠ Dangerous Command             │
├─────────────────────────────────┤
│ About to execute: rm -rf /tmp   │
│                                 │
│ [x] Approve                     │
│ [ ] Deny                        │
└─────────────────────────────────┘
```

### 6.3 密码输入（Sudo / Secret）

```
┌─────────────────────────────────┐
│ [sudo] password required:       │
│ ••••••••••                      │ ← PasswordProcessor 遮蔽
│ Expires in 30s...              │
└─────────────────────────────────┘
```

所有模态窗口都是 **ConditionalContainer**——只在需要时显示，不占用正常布局空间。

---

## 7. Markdown 渲染三模式

通过 `display.final_response_markdown` 配置：

| 模式 | 处理 | 效果 |
|------|------|------|
| **strip**（默认） | 去除 Markdown 语法（#、**、-、[]） | 纯文本可读性最高 |
| **render** | Rich 解析并渲染 | 表格、代码高亮、粗体 |
| **raw** | ANSI 直通 | 保留原始转义码 |

**响应面板格式**：
```
╭─ ⚕ Hermes ────────────────────────────────────────╮
    Response text line 1
    Response text line 2
    Code block with syntax highlighting...
╰───────────────────────────────────────────────────╯
```

面板边框颜色、标题文本均从 Skin 引擎解析。

---

## 8. 状态栏

底部常驻状态栏，动态显示：

```
 claude-opus-4-20250514 │ Context: 42% █████████░░░░░░░░░ │ Session: abc123
```

| 段 | 内容 | 颜色逻辑 |
|----|------|---------|
| 模型名 | 当前活跃模型 | status_bar_strong |
| 上下文占比 | 已用/总量百分比 | <60%=green, <80%=yellow, <95%=orange, >95%=red |
| 会话 ID | 当前会话标识 | status_bar_dim |
| 推理级别 | 活跃的推理层级 | status_bar_text |

**刷新频率**：最多 250ms 一次（`_invalidate(min_interval=0.25)`），平衡响应性和性能。

---

## 9. Gateway 流式消费（多平台）

CLI 之外，Hermes 的 Gateway 模式将流式 token 推送到 Telegram、Discord、Slack 等平台：

```python
class GatewayStreamConsumer:
    def on_delta(self, text):
        if text is None:
            self.on_segment_break()  # 工具边界
        else:
            self._filter_and_accumulate(text)
    
    def _flush_to_platform(self):
        # 渐进式编辑同一条消息（非多条发送）
        # 限速：edit_interval=1.0s
        await platform.edit_message(msg_id, accumulated_text)
```

**关键设计**：
- **渐进式消息编辑**：不发 N 条消息，而是持续编辑同一条消息
- **限速**：Telegram/Discord API 有编辑频率限制，默认 1 秒间隔
- **线程安全**：Agent 工作线程 → Queue → asyncio 事件循环
- **独立 Think 过滤**：Gateway 有自己的思考块状态机

### API Server SSE 流式

```
event: delta
data: {"content": "Hello "}

event: delta
data: {"content": "world!"}

event: hermes.tool.progress
data: {"type": "tool.started", "name": "terminal", "preview": "ls -la"}

event: hermes.tool.progress
data: {"type": "tool.completed", "name": "terminal", "duration": 1.2}
```

- 30 秒心跳保活（防止客户端超时断连）
- 客户端断连 → `agent.interrupt("SSE client disconnected")`

---

## 10. 显示配置的平台分层

不同平台有不同的显示能力，Hermes 用分层配置自动适配：

| 平台 Tier | 平台 | 消息编辑 | 默认进度模式 | 预览长度 |
|-----------|------|---------|-------------|---------|
| Tier 1（高） | Telegram, Discord | 支持 | all | 40 chars |
| Tier 2（中） | Slack, Mattermost | 有限 | off | 40 chars |
| Tier 3（低） | Signal, WeChat | 不支持 | off | 20 chars |
| Tier 4（最小） | Email, SMS | 不支持 | off | 0 |
| API Server | HTTP 客户端 | N/A | SSE events | 0（无截断） |

**配置解析优先级**：
```
per-platform override > backward compat > global user setting > built-in platform default
```

---

## 11. 会话持久化

### 双通道存储

| 通道 | 文件 | 内容 | 更新策略 |
|------|------|------|---------|
| JSON 日志 | `~/.hermes/sessions/{session_id}.json` | 完整对话（含推理、工具调用、元数据） | 每轮覆写 |
| SQLite DB | `~/.hermes/sessions/session.db` | 规范化的消息行（role, content, tool_calls） | 增量追加 |

**用途区分**：
- JSON 日志 → 可视化回放、成就系统扫描、调试
- SQLite DB → 会话恢复（`--resume`）、跨会话搜索、FTS5 全文索引

---

## 12. 关键设计决策与启发

### 12.1 三层 Scrubber 而非单层正则

**问题**：LLM 流式 token 切分不可预测，标签可能跨多个 delta。
**解法**：在 Agent 层放一个状态机 Scrubber 作为**唯一事实源**，下游消费者（CLI、Gateway、API Server、TTS）都看到已清洗的文本。

**启发**：任何需要从流式 token 中过滤结构化标签的 Agent 系统都应该用状态机而非正则。这是 Hermes 在多模型兼容中踩过的坑——MiniMax-M2.7、DeepSeek-R1、Qwen-2.5 各自的推理标签格式不同，只有状态机能统一处理。

### 12.2 数据驱动的 Skin 引擎

Hermes 的主题系统不是硬编码的"dark/light"切换，而是一个 **25+ 颜色点的 YAML Schema**，覆盖了 UI 的每个视觉元素。这让社区可以在不修改任何代码的情况下创建全新的视觉体验。

**启发**：CLI 工具的品牌感和可定制性不需要牺牲工程简洁性——用 YAML Schema + 层叠继承（缺失值从 default 继承）就能实现。

### 12.3 渐进式消息编辑 vs 多条发送

Gateway 对 Telegram/Discord 采用**编辑同一条消息**而非发送多条消息。这避免了：
- 用户被 N 条通知轰炸
- 聊天记录被 Agent 的中间输出淹没
- 平台的消息频率限制被触发

**启发**：在消息平台上做流式输出，渐进式编辑是唯一正确的交互模式。

### 12.4 平台能力分层自动适配

不同平台的能力差异巨大（Telegram 能编辑消息，SMS 不能）。Hermes 用 4 个 Tier 自动匹配默认配置，同时允许用户逐平台覆盖。

**启发**：多平台 Agent 的显示层不应该是"一刀切"，也不应该让用户手动配置每个平台——Tier 分层 + 可覆盖是平衡自动化和灵活性的好方案。

### 12.5 工具进度的"信噪比"控制

`off → new → all → verbose` 四级模式，加上 `new` 模式的去重逻辑，让用户可以精确控制"想看到多少过程信息"。第一次长工具执行（>30s）时还会主动提示 `/verbose` 命令的存在。

**启发**：Agent 的工具执行是一个"信息过载"的高危区——用户既想知道 Agent 在做什么，又不想被淹没。分级 + 去重 + 引导是平衡之道。
