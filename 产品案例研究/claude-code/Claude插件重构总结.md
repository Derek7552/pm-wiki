# Claude Code Plugin 目录重组总结

> 将 ai-pm-plugin 仓库重组为符合官方规范的 Marketplace 结构
>
> 日期：2025-12-29
> Commit: c78521e

---

## 📋 重组目标

参考 `anthropics/claude-plugins-official` 仓库结构，将 ai-pm-plugin 从单 plugin 仓库改造为标准 marketplace 仓库。

### 官方仓库结构（参考）

```
claude-plugins-official/
├── .claude-plugin/
│   └── marketplace.json         # 只有 marketplace.json，无 plugin.json
├── plugins/                      # 多个 plugins
│   ├── typescript-lsp/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json      # 每个 plugin 有自己的 plugin.json
│   │   ├── commands/
│   │   └── ...
│   └── python-lsp/
│       └── .claude-plugin/
│           └── plugin.json
└── external_plugins/             # 第三方 plugins
```

---

## 🔄 重组前后对比

### 重组前（v1.0.2）

```
ai-pm-plugin/
├── .claude-plugin/
│   ├── plugin.json              # ❌ 根目录有 plugin.json
│   └── marketplace.json         # ✅ 有 marketplace.json
├── commands/                     # ❌ Plugin 内容在根目录
│   ├── wechat-share.md
│   └── wechat-insight.md
├── agents/
│   └── wechat-writer.md
├── skills/
│   └── wechat-article-writer/
└── ...

问题：
- 既是 plugin 又是 marketplace，结构混乱
- 不符合官方规范
- marketplace.json 的 source 指向 "./"
- Plugin 名称为 "ai-pm-toolkit"
```

### 重组后（v1.0.3）

```
ai-pm-plugin/
├── .claude-plugin/
│   └── marketplace.json          # ✅ 只有 marketplace.json
├── plugins/                      # ✅ Plugins 目录
│   └── wechat-writer/            # ✅ Plugin 在子目录
│       ├── .claude-plugin/
│       │   └── plugin.json       # ✅ Plugin 有独立 plugin.json
│       ├── commands/
│       │   ├── wechat-share.md
│       │   └── wechat-insight.md
│       ├── agents/
│       │   └── wechat-writer.md
│       ├── skills/
│       │   └── wechat-article-writer/
│       └── README.md             # ✅ Plugin 文档
└── ...

优势：
✅ 完全符合官方规范
✅ 纯 marketplace 仓库，结构清晰
✅ 可以轻松添加更多 plugins
✅ Plugin 独立，便于维护
✅ Plugin 名称改为更具描述性的 "wechat-writer"
```

---

## 📝 具体更改

### 1. 目录结构调整

| 操作 | 原路径 | 新路径 |
|------|--------|--------|
| 删除 | `.claude-plugin/plugin.json` | ❌ 删除 |
| 创建 | - | `plugins/wechat-writer/.claude-plugin/` |
| 移动 | `commands/` | `plugins/wechat-writer/commands/` |
| 移动 | `agents/` | `plugins/wechat-writer/agents/` |
| 移动 | `skills/` | `plugins/wechat-writer/skills/` |
| 创建 | - | `plugins/wechat-writer/README.md` |

### 2. marketplace.json 更新

```diff
{
-  "name": "ai-pm-tools",
+  "name": "ai-pm-tools",
   "plugins": [
     {
-      "name": "ai-pm-toolkit",
+      "name": "wechat-writer",
-      "version": "1.0.2",
+      "version": "1.0.3",
-      "source": "./",
+      "source": "./plugins/wechat-writer",
     }
   ]
}
```

### 3. plugin.json 更新

**新位置**：`plugins/wechat-writer/.claude-plugin/plugin.json`

```diff
{
-  "name": "ai-pm-toolkit",
+  "name": "wechat-writer",
-  "description": "AI Product Manager toolkit...",
+  "description": "WeChat article writing assistant...",
-  "version": "1.0.2",
+  "version": "1.0.3",
   "author": {
-    "name": "Derek",
-    "email": "derek@example.com"
+    "name": "Derek7552",
+    "email": "dameh0108@163.com"
   },
   "keywords": [
-    "ai", "product-manager", "writing", "wechat", "automation", "workflow"
+    "wechat", "writing", "article", "content", "productivity"
   ]
}
```

### 4. 新增文件

- `plugins/wechat-writer/README.md` - Plugin 详细文档

---

## 🚀 安装方式更新

### 重组前

```bash
# Plugin 名称: ai-pm-toolkit
/plugin marketplace add /Users/derek/.claude/marketplaces/my-pm-tools
/plugin install ai-pm-toolkit@my-pm-tools
```

**命令**：
- `/ai-pm-toolkit:wechat-share`
- `/ai-pm-toolkit:wechat-insight`

### 重组后

```bash
# Plugin 名称: wechat-writer
/plugin marketplace add https://github.com/Derek7552/ai-pm-plugin
/plugin install wechat-writer@ai-pm-tools
```

**命令**：
- `/wechat-writer:wechat-share`
- `/wechat-writer:wechat-insight`

---

## 📊 Breaking Changes

⚠️ **重大变更**：Plugin 名称从 `ai-pm-toolkit` 改为 `wechat-writer`

### 影响

1. **已安装用户**：
   - 需要卸载旧版本：`/plugin uninstall ai-pm-toolkit@my-pm-tools`
   - 重新安装新版本：`/plugin install wechat-writer@ai-pm-tools`

2. **Slash Commands**：
   - 旧：`/ai-pm-toolkit:wechat-share`
   - 新：`/wechat-writer:wechat-share`

3. **Marketplace 需要更新**：
   - 本地 marketplace 的 `marketplace.json` 需要更新 plugin 名称

---

## 🎯 符合官方规范的要点

### ✅ 已满足

1. **纯 Marketplace 结构**
   - 根目录只有 `marketplace.json`
   - 没有 `plugin.json` 在根目录

2. **Plugins 组织**
   - 所有 plugins 在 `plugins/` 目录下
   - 每个 plugin 是独立子目录

3. **Plugin 元数据**
   - 每个 plugin 有自己的 `.claude-plugin/plugin.json`
   - 包含完整的元数据（name, version, author 等）

4. **Source 路径**
   - marketplace.json 中的 `source` 指向子目录
   - 使用相对路径 `"./plugins/wechat-writer"`

5. **可扩展性**
   - 可以轻松添加更多 plugins 到 `plugins/` 目录
   - 例如：`plugins/ui-reviewer/`、`plugins/data-analyzer/` 等

---

## 📚 未来扩展

现在仓库结构支持轻松添加新 plugins：

```bash
# 添加新 plugin 的步骤
cd /Users/derek/derekrepo/ai-pm-toolkit

# 1. 创建新 plugin 目录
mkdir -p plugins/ui-reviewer/.claude-plugin
mkdir -p plugins/ui-reviewer/commands

# 2. 创建 plugin.json
cat > plugins/ui-reviewer/.claude-plugin/plugin.json << 'EOF'
{
  "name": "ui-reviewer",
  "description": "UI implementation review agent",
  "version": "1.0.0",
  ...
}
EOF

# 3. 添加 commands
cat > plugins/ui-reviewer/commands/review-ui.md << 'EOF'
---
description: Review UI implementation against design
---
...
EOF

# 4. 更新 marketplace.json
# 在 plugins 数组中添加新条目：
{
  "name": "ui-reviewer",
  "source": "./plugins/ui-reviewer",
  ...
}

# 5. 提交
git add plugins/ui-reviewer .claude-plugin/marketplace.json
git commit -m "feat: add ui-reviewer plugin"
git push
```

---

## 🔗 相关资源

- **GitHub 仓库**：https://github.com/Derek7552/ai-pm-plugin
- **官方参考**：https://github.com/anthropics/claude-plugins-official
- **Claude Code 文档**：https://code.claude.com/docs

---

## ✅ 验证清单

- [x] 根目录只有 marketplace.json
- [x] Plugin 在 plugins/ 子目录
- [x] Plugin 有独立的 plugin.json
- [x] marketplace.json 指向正确的 source
- [x] Plugin 名称更新（wechat-writer）
- [x] 版本号更新（1.0.3）
- [x] 所有文件移动正确
- [x] 提交到 GitHub
- [x] 本地 marketplace 配置更新
- [x] 文档更新

---

**完成时间**：2025-12-29
**Commit Hash**：c78521e
**版本**：v1.0.3
