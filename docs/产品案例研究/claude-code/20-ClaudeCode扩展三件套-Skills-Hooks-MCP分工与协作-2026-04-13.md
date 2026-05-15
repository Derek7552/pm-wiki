# Claude Code 扩展三件套——Skills、Hooks、MCP 分工与协作

> 来源：文章《扩展能力：Skills、Hooks 与 MCP》（文字输入，无 URL）
> 提炼日期：2026-04-13
> 分类：AI 方法论

## TL;DR

Claude Code 有三种扩展机制，分工清晰：Skills 教业务知识/工作流（高确定性但非 100%）、Hooks 强制执行关键流程（100% 确定）、MCP 连接外部系统（100% 确定）。三者不是替代关系，应组合使用：重复的事写 Skill，不能出错的步骤用 Hook 锁死，外部数据靠 MCP 接入。

## 核心观点

**1. 三种机制解决三个不同层面的问题**

Skills 解决"Claude 知不知道怎么做"的问题，Hooks 解决"Claude 会不会忘记做"的问题，MCP 解决"Claude 能不能访问外部数据"的问题。判断用哪种的经验法则：经常重复 → Skill，不能出错 → Hook，需要连外部系统 → MCP。

**2. CLAUDE.md 是建议，Hooks 是强制**

随着上下文变长，Claude 对 Skills 和 CLAUDE.md 规则的依从率会下降，关键指令在上下文压缩后可能丢失。Hooks 是平台层面的机制，在特定生命周期节点触发 Shell 脚本，Claude 无法跳过或忽略——这是两者的本质区别。

**3. 三者协同构成完整自动化流水线**

典型场景：MCP（Slack）接收 bug 报告 → Skill（fix-issue）指导按标准流程修复 → Hook（PostToolUse）确保每次修改后自动跑测试和格式化。三者在 CLAUDE.md 中定义执行顺序，各司其职。

## 关键知识点

### 三种机制对比

| 机制 | 本质 | 确定性 | 适用场景 |
|------|------|--------|----------|
| Skills | 技能包（SKILL.md 文件） | 高但非 100% | 领域知识、可复用工作流 |
| Hooks | Shell 脚本钩子 | 100% 确定执行 | 代码风格检查、安全拦截、强制流程 |
| MCP | 外部工具连接器 | 100% | 数据库、API、第三方服务 |

### Skills 两种类型

**知识型 Skill**：告诉 Claude「这个项目里的事情应该怎么做」——API 规范、编码风格、项目约定。更像文档，Claude 读完按规则办事。

**工作流型 Skill**：告诉 Claude「遇到这种任务按什么步骤执行」——修 bug 标准流程、代码审查流程。有明确步骤和检查点。

Skill 本质是一个带头文件的 SKILL.md，写的是方法、步骤、边界和判断标准。可以自己写，也可以通过 `/plugin` 浏览市场安装。

### Hooks 六大生命周期事件

| 钩子 | 触发时机 | 典型用途 |
|------|----------|----------|
| PreToolUse | Claude 调用工具之前 | 拦截危险操作 |
| PostToolUse | Claude 调用工具之后 | 自动格式化、自动测试 |
| PermissionRequest | 需要用户授权时 | 自动批准低风险操作 |
| Stop | Claude 完成回合时 | 推动继续执行（无人值守场景） |
| PostCompact | 上下文压缩后 | 重新注入关键指令，防止"失忆" |
| PermissionDenied | Auto 模式分类器拒绝操作后 | 记录被拒操作、触发替代方案 |

**Hook 配置示例**（自动格式化）：

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "autopep8 --in-place \"$CLAUDE_FILE_PATH\""
      }
    ]
  }
}
```

Hook 不需要自己从零写，直接告诉 Claude「编写一个钩子，使其在每次文件编辑后运行 autopep8」，Claude 会生成配置并写入 settings.json。

### Hooks 三种实用场景

1. **批准低风险操作**：用 PermissionRequest hook 路由到脚本，低风险（读文件、运行测试）自动批准，高风险（删除文件、推送代码）仍弹确认
2. **防上下文失忆**：PostCompact hook 在压缩后自动重新注入关键规则，确保长对话中指令不丢失
3. **无人值守继续执行**：Stop hook 检测 Claude 中途停下询问"要继续吗"的情况，自动推进，适合批处理场景

### MCP 常见接入

| MCP | 能力 | 适用场景 |
|-----|------|----------|
| Slack MCP | 搜索/发送消息 | 让 Claude 自动同步进度、回复问题 |
| 数据库 MCP | 直接查询数据库 | 不用手动复制 SQL 结果 |
| Figma MCP | 读取设计稿 | 把设计直接转成代码 |
| 微信 MCP | 接收/发送微信消息 | 通过 ClawBot ilink API 接入个人机器人 |

MCP 配置存在项目根目录的 `.mcp.json` 中，**敏感变量不放配置文件，用环境变量引用**。

## 数据与案例

**自动化 bug 修复流水线**（文章内案例）：

- 背景：Claude 开发者需要处理来自 Slack 的 bug 报告并自动修复
- 做法：
  - MCP（Slack）：Claude 接收 bug 报告，修复后回复结果
  - Skill（fix-issue）：指导按标准流程定位和修复问题
  - Hook（PostToolUse）：每次修改后自动跑测试和格式化
  - CLAUDE.md：定义三者的执行顺序
- 结果：形成完整闭环，Claude 从接收问题到修复验证全程自动化

## 启发与思考

- **判断三选一的快速心法**：经常重复 → Skill，不能出错 → Hook，需要连外部 → MCP；三者不互斥，复杂场景可以组合
- **PostCompact hook 特别有价值**：当前使用 Claude Code 做长对话任务时，上下文压缩导致规则丢失是真实痛点，可以马上实验这个 hook
- **PermissionRequest hook 适合 Auto 模式提效**：自动批准低风险操作，减少确认弹窗打断流
- **延伸探索**：howborisusesclaudecode.com 收录了 Boris（Claude Code 重度用户）的工作流 Skills，包括 commit 规范、PR 模板、代码审查标准，值得参考

## 原文精华

> Skills、Hooks、MCP 不是互相替代的关系，而是分工不同、层级不同的自动化工具。当你发现某件事「经常重复」「偶尔被忘」「需要连外部系统」，基本就能判断该用哪一种机制了。

> CLAUDE.md 也是建议，Hooks 是强制执行。CLAUDE.md 通过自然语言影响 Claude 的行为；Hooks 是 Claude Code 平台层面的机制，在特定生命周期节点触发 Shell 脚本，Claude 无法跳过或忽略。

> 做到这一步，Claude Code 才不只是"会写代码"，而是一个可靠的工程搭档。

---
原文链接：无（文字输入）
