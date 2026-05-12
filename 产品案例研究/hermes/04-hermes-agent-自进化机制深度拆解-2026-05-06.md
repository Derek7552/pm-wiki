---
title: Hermes Agent — 自进化机制深度拆解
source: https://github.com/nousresearch/hermes-agent
date: 2026-05-06
tags: [AI-Agent, 自进化, Skill系统, Curator, 闭环学习, 程序性记忆, 开源]
related: 02-hermes-agent-自进化AI智能体平台-2026-04-27.md
---

# Hermes Agent — 自进化机制深度拆解

> 一句话总结：**Hermes 的自进化是一个三层闭环——对话后台 Review 捕获经验、Skill Manager 结构化存储知识、Curator 周期性整理合并——让 Agent 在无人干预下持续积累和优化程序性知识。**

## 1. 整体架构

```
         ┌──────────────────────────────────────┐
         │          用户对话                      │
         │  (经验、纠正、新技巧、workaround)       │
         └──────────────┬───────────────────────┘
                        │ 每 N 轮触发
                        ▼
         ┌──────────────────────────────────────┐
         │    Layer 1: Background Review Fork    │
         │  - 分析对话信号                        │
         │  - 更新 Memory（用户是谁）              │
         │  - 更新/创建 Skills（如何做这类任务）    │
         └──────────────┬───────────────────────┘
                        │ 写入
                        ▼
         ┌──────────────────────────────────────┐
         │    Layer 2: Skill 知识库               │
         │    ~/.hermes/skills/                   │
         │  - class-level umbrella skills         │
         │  - references / templates / scripts    │
         └──────────────┬───────────────────────┘
                        │ 每 7 天
                        ▼
         ┌──────────────────────────────────────┐
         │    Layer 3: Curator 自动维护           │
         │  - 状态转换 (active→stale→archived)    │
         │  - 聚类识别 + umbrella 合并             │
         │  - 知识库瘦身 + 结构优化                │
         └──────────────────────────────────────┘
```

三层各司其职：Layer 1 负责**捕获**（从对话中提取值得保留的经验），Layer 2 负责**存储**（结构化的 Skill 目录），Layer 3 负责**整理**（防止 Skill 库膨胀退化为噪音）。

---

## 2. Layer 1 — Background Review Fork（实时学习）

**核心文件**: `run_agent.py:3598-3735`

### 2.1 触发机制

不是每轮对话都触发 Review，而是基于计数器的周期触发：

| 触发器 | 计数对象 | 默认阈值 | 配置项 |
|--------|---------|---------|--------|
| Memory Review | 用户轮次（`_turns_since_memory`） | 10 轮 | `agent.memory.nudge_interval` |
| Skill Review | 工具调用迭代次数（`_iters_since_skill`） | 10 次 | `agent.skills.creation_nudge_interval` |

两个触发器独立计数，可同时触发（此时使用 `_COMBINED_REVIEW_PROMPT`），也可单独触发。

**触发时机**：在 `run_conversation()` 返回最终响应**之后**（`run_agent.py:14134`），确保 Review 不与用户任务竞争模型注意力。

```python
# run_agent.py:14134
if final_response and not interrupted and (_should_review_memory or _should_review_skills):
    self._spawn_background_review(
        messages_snapshot=list(messages),
        review_memory=_should_review_memory,
        review_skills=_should_review_skills,
    )
```

### 2.2 Review Agent 的隔离设计

`_spawn_background_review()` 在独立线程中 fork 出一个完整的 `AIAgent`，但做了严格隔离：

| 维度 | 主 Agent | Review Agent |
|------|---------|-------------|
| 线程 | 主线程 | `threading.Thread` 后台线程 |
| 工具集 | 全部（terminal, browser, web...） | **仅 memory + skills** |
| 迭代上限 | 90 | **16** |
| stdout/stderr | 正常输出 | **重定向到 /dev/null** |
| 危险命令审批 | 用户交互 | **自动拒绝（auto-deny）** |
| Nudge 间隔 | 10 | **0**（禁用，避免递归触发） |
| 状态输出 | 正常 | **suppress_status_output=True** |

**关键**：Review Agent 继承主 Agent 的 model/provider/api_key/credential_pool，确保使用相同的模型能力，但不会触碰主会话的 prompt cache。

### 2.3 Review 关注的信号

Skill Review Prompt（`run_agent.py:3403-3476`）定义了 4 类信号：

1. **用户纠正风格/格式/冗长度** → 嵌入到相关 Skill 的 SKILL.md 中
   - 例：用户说"太啰嗦了" → 更新写作类 Skill 加入"简洁优先"规则
   - 明确说明：**"Frustration is a FIRST-CLASS skill signal, not just a memory signal"**

2. **用户纠正工作流/步骤** → 编码为 Skill 中的 pitfall 或显式步骤
   - 例：用户说"应该先跑测试再提交" → 更新 CI 相关 Skill

3. **非平凡的技巧/修复/workaround** → 捕获为新知识
   - 例：发现某 API 的 rate limit 绕过方法

4. **本次加载的 Skill 被证明有误/过时** → **立即 patch**
   - 这是"active-update bias"的体现——优先修复正在使用的知识

### 2.4 更新优先级（由高到低）

| 优先级 | 动作 | 说明 |
|--------|------|------|
| 1 | 更新本次加载的 Skill | **Active-update bias** — 本轮通过 `/skill-name` 或 `skill_view` 实际加载的 Skill 优先被修改 |
| 2 | 更新已有的 umbrella Skill | 通过 `skills_list` + `skill_view` 找到覆盖该领域的现有 Skill |
| 3 | 在已有 umbrella 下添加支持文件 | `references/`、`templates/`、`scripts/`（三类子目录各有用途） |
| 4 | 创建新的 class-level umbrella Skill | **最后手段** — 名称必须是类级别的，不能是某次 session 的产物 |

### 2.5 Memory vs Skill 的分工

Review Prompt 中有一个重要的设计哲学区分：

> **Memory** captures "who the user is and what the current situation and state of your operations are"
> **Skills** capture "how to do this class of task for this user"

当用户抱怨 Agent 的做事方式时，**Skill 必须携带这个教训**（不仅仅是 Memory）。Memory 是声明性的（知道什么），Skill 是程序性的（怎么做）。

---

## 3. Layer 2 — Skill Manager Tool（结构化存储）

**核心文件**: `tools/skill_manager_tool.py`

### 3.1 Skill 目录结构

```
~/.hermes/skills/
├── my-skill/
│   ├── SKILL.md           # 核心指令文档（what + how）
│   ├── references/        # 会话级细节、API 文档摘录、领域笔记、复现步骤
│   ├── templates/         # 可复制修改的模板文件（配置模板、脚手架）
│   ├── scripts/           # 可直接运行的验证/探测脚本
│   └── assets/            # 静态资源
└── category-name/
    └── another-skill/
        └── SKILL.md
```

三类子目录的区分非常精准：
- **references/** — 知识银行（引用的研究、API 文档摘录、provider 特有行为）
- **templates/** — 要被复制和修改的起始文件
- **scripts/** — 要被直接运行的确定性操作（验证脚本、fixture 生成器）

### 3.2 6 个操作

| 操作 | 说明 |
|------|------|
| `create` | 创建新 Skill（SKILL.md + 目录结构） |
| `edit` | 全量重写 SKILL.md |
| `patch` | 定向 find-and-replace（最常用的增量更新方式） |
| `delete` | 归档到 `.archive/`（不是真删除） |
| `write_file` | 添加/覆盖支持文件 |
| `remove_file` | 删除支持文件 |

### 3.3 安全扫描

可选的安全扫描机制（`skills.guard_agent_created`，默认关闭）：
- Hub 安装的外部 Skill 始终扫描
- Agent 自创建的 Skill 仅在开启配置后扫描
- 默认关闭的理由：Agent 本来就能通过 `terminal()` 执行同等代码，扫描只增加摩擦不增加安全性

### 3.4 命名哲学

Skill 库的目标形态是 **class-level umbrella skills**，而非 one-session-one-skill 的扁平列表。

**反例**（不好的命名）：
- `fix-pr-1234-auth-bug`
- `debug-ollama-timeout-issue`
- `audit-gateway-session-leak`

**正例**（好的命名）：
- `authentication-debugging`
- `ollama-provider-management`
- `gateway-session-lifecycle`

这背后的洞察是：Agent 通过**描述匹配**搜索 Skill，一个宽泛的 umbrella + 标记子章节，比 5 个窄 Skill 更容易被发现。

---

## 4. Layer 3 — Curator（自动维护）

**核心文件**: `agent/curator.py`（1675 行）

### 4.1 调度策略

| 参数 | 默认值 | 配置项 |
|------|--------|--------|
| 运行间隔 | 7 天 | `curator.interval_hours` |
| 最小空闲 | 2 小时 | `curator.min_idle_hours` |
| 标记陈旧 | 30 天无活动 | `curator.stale_after_days` |
| 自动归档 | 90 天无活动 | `curator.archive_after_days` |

**首次运行行为**：安装后不会立即运行。第一次观测时将 `last_run_at` 种子化为当前时间，等待一个完整间隔（7 天）后才首次执行。用户想提前预览可用 `hermes curator run --dry-run`。

### 4.2 阶段 A — 自动状态转换（纯逻辑，无 LLM）

```python
# curator.py:255-295
def apply_automatic_transitions(now=None):
    for skill in agent_created_report():
        if skill.pinned:
            continue  # Pinned 永不被动
        
        anchor = skill.last_activity_at or skill.created_at
        
        if anchor <= archive_cutoff:     # 90天+ 无活动
            archive_skill(name)          # → archived（移入 .archive/）
        elif anchor <= stale_cutoff:     # 30天+ 无活动
            set_state(name, STALE)       # active → stale
        elif current == STALE and anchor > stale_cutoff:
            set_state(name, ACTIVE)      # stale → active（被重新使用）
```

状态机：
```
active ──(30天无活动)──► stale ──(90天无活动)──► archived
  ▲                       │
  └───(重新使用)───────────┘
```

### 4.3 阶段 B — LLM 驱动的 Umbrella 合并

Curator 的核心价值不在状态转换，而在 **umbrella-building consolidation**（`CURATOR_REVIEW_PROMPT`, line 329-444）。

**工作流程**：

1. **聚类扫描**：识别共享前缀或领域关键词的 Skill 集群
   - 例：`hermes-config-*`、`gateway-*`、`ollama-*`、`pr-*`

2. **合并决策**（对每个 2+ 成员的聚类）：
   - 问的不是"这些是否两两重叠？"
   - 而是"**这些 Skill 服务的 umbrella 类是什么？一个维护者会写成一个 Skill 的 N 个子章节，还是 N 个独立 Skill？**"

3. **三种合并方式**：

| 方式 | 适用场景 | 操作 |
|------|---------|------|
| **Merge into existing umbrella** | 集群中已有一个足够宽泛的 Skill | patch 该 Skill 加子章节 → archive 被吸收的窄 Skill |
| **Create new umbrella** | 无成员足够宽泛 | create 新 class-level Skill → archive 所有窄 Skill |
| **Demote to support files** | 窄但有价值的 session-specific 内容 | 移入 umbrella 的 `references/`、`templates/`、`scripts/` → archive 旧 Skill |

4. **输出格式**（结构化 YAML + 人类可读摘要）：

```yaml
consolidations:
  - from: <old-skill-name>
    into: <umbrella-skill-name>
    reason: <one short sentence>
prunings:
  - name: <skill-name>
    reason: <one short sentence>
```

### 4.4 合并溯源机制

`_classify_removed_skills()`（line 491-598）通过分析 Curator 运行期间的 tool call 来自动判断一个被归档的 Skill 是"被合并"还是"被裁剪"：

- 扫描所有 `skill_manage` 工具调用
- 如果某个 patch/write_file/create 操作的目标 Skill **引用了**被归档 Skill 的名称 → 判定为 consolidation
- 否则 → 判定为 pruning
- 使用路径组件精确匹配（避免短名误匹配）和单词边界正则

### 4.5 Dry-run 模式

`CURATOR_DRY_RUN_BANNER`（line 302-326）明确禁止任何写操作，只允许 `skills_list` 和 `skill_view` 的读操作。输出格式与真实运行完全一致，下游审阅者可据此决定是否批准实际运行。

---

## 5. 关键设计决策与启发

### 5.1 为什么是后台 Fork 而非内联？

如果在对话流内直接执行 Review，会有两个问题：
1. **注意力竞争**：模型在思考"如何更新 Skill"时无法同时回答用户问题
2. **延迟感知**：用户会等待 Review 完成才能收到响应

后台 Fork 的代价是额外的 API 调用成本（最多 16 次迭代），但换来了零延迟的用户体验。

### 5.2 为什么是 Umbrella 而非 Flat？

Hermes 在早期版本（v0.11 之前）用的是扁平 Skill 列表，结果 Skill 数量爆炸——每个 session 创建 1-2 个窄 Skill，几百个 Skill 后搜索匹配质量急剧下降。

Umbrella 模式解决了两个问题：
- **可发现性**：一个宽泛描述比五个窄描述更容易被语义搜索命中
- **可维护性**：Curator 合并的粒度清晰——同类归一

### 5.3 为什么归档而非删除？

> "Archives are recoverable; deletion is not."

这是 Hermes 自进化机制的核心安全哲学。Agent 自主生成的知识可能在未来被证明有价值（例如某个"过时"的 workaround 在回退版本时重新有用），因此只移入 `.archive/` 而非 `rm -rf`。

### 5.4 Active-Update Bias 的认知科学基础

优先更新本次加载的 Skill 不仅是工程便利，也符合认知科学中的"测试效应"（testing effect）：刚刚被提取使用的知识，在此刻更新效果最好，因为上下文最完整、错误最容易被识别。

---

## 6. 设计模式总结

| 设计原则 | 实现方式 | 效果 |
|---------|---------|------|
| **无损学习** | 归档 `.archive/` 代替删除 | 知识可恢复 |
| **Active-update bias** | Review 优先修改本轮实际加载的 Skill | 上下文最完整时修正最准确 |
| **Class-level 组织** | Umbrella Skill + 子章节/子文件 | 语义搜索匹配率高 |
| **纵深防御** | Bundled/Hub Skill 不可被自动修改 | 防止核心知识被 Agent 误改 |
| **最小干扰** | Review 在后台线程运行、stdout 重定向 | 用户无感知 |
| **可控性** | `--dry-run`、`pinned`、`paused` | 人类可随时介入 |
| **两类记忆分离** | Memory = 声明性（who/what），Skill = 程序性（how） | 贴合认知模型 |
| **周期性整理** | Curator 7天周期 + 状态机 + LLM 合并 | 防止知识库退化 |

---

## 7. 对自己产品的启发

1. **"经验→知识→维护"三层缺一不可**：只做经验捕获不做维护，知识库会退化为噪音；只做维护不做捕获，知识库会停滞。Hermes 的三层闭环是目前开源 Agent 中最完整的自进化实现。

2. **Nudge 机制的克制**：不是每轮都学习，而是攒够 N 轮/N 次迭代才触发 Review。这既控制了成本，也避免了"过拟合于单次对话"的风险。

3. **Curator 的"gardener"隐喻**：知识库需要一个定期修剪的"园丁"，否则野蛮生长的小 Skill 最终会淹没真正有价值的知识。Umbrella 合并是 Hermes 独有的维护策略。

4. **用户挫败感是第一等级的学习信号**：Hermes 明确将 "stop doing X"、"I hate when you Y" 视为比"非平凡技巧"更重要的 Skill 更新触发器。这个设计选择值得借鉴——用户纠正是最宝贵的反馈。
