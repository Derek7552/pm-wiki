---
name: vitepress-migration
filename: 01-vitepress-migration-2026-05-15-v1.0-待开发.md
module: site
status: 待开发
version: v1.0
date: 2026-05-15
complexity: standard
reference: ../../../../../new-to-soc
---

# PRD：pm-wiki VitePress 站点化改造

**模块**：site
**功能**：vitepress-migration
**状态**：待开发
**版本**：v1.0
**创建日期**：2026-05-15

---

## §1 背景与目标

### 1.1 背景

pm-wiki 是面向 AI 时代产品经理的中文知识库，当前形态为**纯 Markdown 仓库**：7 个中文一级目录（`产品方法论/`、`AI技术认知/`、`思维模型/` 等）下数百篇 Markdown 文章，仅靠 GitHub 仓库浏览或本地 IDE 阅读，缺少站点化的导航、搜索、阅读体验。

同 owner 的 `new-to-soc` 项目（`/Users/derek/derekrepo/new-to-soc`）已基于 **VitePress 1.6.4 + Cloudflare Pages（wrangler）** 完成站点化，是本次改造的对齐参考。

### 1.2 目标

1. **可读**：用 VitePress 把 pm-wiki 跑起来，本地 `npm run docs:dev` 可浏览所有现有内容。
2. **可部署**：对齐 new-to-soc 的产物结构，`npm run docs:build` 输出静态站点，`wrangler` 可部署到 Cloudflare Pages。
3. **可扩展**：侧边栏由脚本自动扫目录生成，新增文章无需手改 config，避免侧边栏维护成本随文章数线性增长。

### 1.3 非目标（明确不做）

- ❌ **不做内容改写**：现有中文文件名、目录名一律保留，不翻译成英文 kebab-case。
- ❌ **不做主题深度定制**：用 VitePress 默认主题，不写自定义 CSS/Vue 组件。
- ❌ **不做 i18n**：单一中文语言，`lang: 'zh-CN'`。
- ❌ **不做 CI/CD 自动部署**：仅本地 `npm run deploy` 触发 wrangler，不配 GitHub Actions。
- ❌ **不做内容搬迁的 git 历史保留优化**（如果走 `git mv` 即可，无需特殊处理）。

---

## §2 用户与场景

### 2.1 用户

- **唯一用户**：仓库 owner（Derek），自用 + 偶尔分享给同事/读者。

### 2.2 场景

| 场景 | 描述 | 期望 |
|------|------|------|
| **本地写作** | 在 IDE 里写 markdown，开 dev server 实时预览 | `npm run docs:dev` 一行起服务 |
| **新增文章** | 在某个一级目录下加一篇 `.md` | 重启 dev / build 后，侧边栏自动出现，无需改 config |
| **浏览全站** | 在浏览器里按主题 → 子目录 → 文章逐层下钻 | 顶部 nav 选主题，左侧 sidebar 列文章 |
| **搜索关键词** | 找"Harness"、"Tair"、"反思"等关键词所在文章 | 内置 `local` provider 全文搜索 |
| **部署上线** | 改完一批后发布到 Cloudflare Pages | `npm run deploy` 一行完成 build + 上传 |

---

## §3 需求范围

### 3.1 In Scope

1. **目录重组**：把根目录 7 个中文一级目录全部移入 `docs/`，根目录只保留 `README.md`、`package.json`、`.gitignore`、`wrangler.jsonc`、`docs/` 等。
2. **VitePress 配置**：新建 `docs/.vitepress/config.mts`，包含 nav、sidebar、search、outline、footer。
3. **侧边栏自动化**：写一个 `docs/.vitepress/sidebar.mts`，递归扫描 srcDir 下目录树，按文件名（含 `序号-` 前缀）排序，生成与 nav 一一对应的 sidebar 配置。
4. **依赖与脚本**：`package.json` 加 `vitepress` + `wrangler` 依赖，加 `docs:dev` / `docs:build` / `docs:preview` / `deploy` / `preview` 脚本（对齐 new-to-soc）。
5. **Cloudflare 配置**：`wrangler.jsonc` 对齐 new-to-soc，`assets.directory` 指向 `docs/.vitepress/dist`。
6. **README 更新**：根 `README.md` 加一节"本地启动"，说明 `npm install && npm run docs:dev`。
7. **`.gitignore` 更新**：加 `node_modules/`、`docs/.vitepress/cache/`、`docs/.vitepress/dist/`。
8. **PRD/SDD 工作文件排除**：通过 `srcExclude` 排除 `**/module/**`、`**/.dev/**`、根 `README.md`，避免被构建进站点。

### 3.2 Out of Scope

- ❌ 文件改名 / 翻译 / 路径英文化
- ❌ 自定义主题、布局、组件
- ❌ 国际化（i18n）
- ❌ CI/CD 自动部署
- ❌ 部署到 Cloudflare 的实际验证（本期只做"`wrangler deploy --dry-run` 不报错"即可，真上线由用户手动触发）

---

## §4 功能需求

### F1 目录重组（destructive，需谨慎）

**输入**：当前根目录 7 个中文一级目录 + 根 `README.md`

**操作**：
- 用 `git mv` 把以下目录整体移入 `docs/`：
  - `产品方法论/`、`AI技术认知/`、`产品案例研究/`、`商业策略/`、`思维模型/`、`技术趋势/`、`术语表/`
- 根 `README.md` 内容保留，但改为指向 `docs/` 子目录的相对链接（例如 `./AI技术认知/` → `./docs/AI技术认知/`），并加一节"本地启动 VitePress 站点"。
- `docs/module/site/prd/` 已存在（本 PRD 所在目录），不动。

**完成标准**：
- 根目录 `ls` 只看到 `docs/`、`README.md`、`package.json`、`.gitignore`、`wrangler.jsonc`、`package-lock.json`、`node_modules/`（git 忽略）。
- `docs/AI技术认知/` 等存在且文件齐全。
- `git status` 显示为 R（rename），git 历史可追溯。

### F2 VitePress 配置（核心）

**文件**：`docs/.vitepress/config.mts`

**配置项**：
```ts
import { defineConfig } from 'vitepress'
import { generateSidebar } from './sidebar'

export default defineConfig({
  title: '产品经理 Wiki',
  description: '面向 AI 时代产品经理的通用知识库',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,

  srcExclude: [
    '**/module/**',     // PRD/SDD 工作目录不入站
    '**/.dev/**',
    '**/README.md',     // 根 README 不入站
    '**/node_modules/**',
  ],

  themeConfig: {
    nav: [
      { text: '产品方法论', link: '/产品方法论/' },
      { text: '产品案例', link: '/产品案例研究/' },
      { text: 'AI 技术认知', link: '/AI技术认知/' },
      { text: '技术趋势', link: '/技术趋势/' },
      { text: '商业策略', link: '/商业策略/' },
      { text: '思维模型', link: '/思维模型/' },
      { text: '术语表', link: '/术语表/' },
      { text: 'GitHub', link: 'https://github.com/Derek7552/pm-wiki' },
    ],

    sidebar: generateSidebar('docs'),

    search: { provider: 'local' },

    outline: { level: [2, 3], label: '本页内容' },

    docFooter: { prev: '上一页', next: '下一页' },

    lastUpdatedText: '最后更新于',

    footer: {
      message: 'MIT License',
      copyright: 'Copyright © 2026 Derek',
    },
  },
})
```

### F3 侧边栏自动生成（关键）

**文件**：`docs/.vitepress/sidebar.mts`

**职责**：
- 入参：srcDir（项目相对路径，例如 `'docs'`）。
- 出参：VitePress 期望的 `sidebar` 对象（key = 路径前缀，value = 分组数组）。

**算法**：
1. 列出 srcDir 下的一级目录（前述 7 个）。
2. 对每个一级目录：
   - key = `/{一级目录名}/`
   - value = 一个分组：`{ text: 一级目录名, items: [...] }`
   - items：递归扫描该目录下所有 `.md` 文件（排除 README.md）
     - 子目录递归形成嵌套分组（`{ text: 子目录名, collapsed: true, items: [...] }`）
     - 同级 `.md` 文件按文件名升序排序（自然排序，让 `05-` < `10-` < `40-`，避免字符串排序导致乱序）
     - 每篇文章：`{ text: 去掉 .md 后缀的文件名, link: '/.../filename' }`
3. 跳过：以 `_` / `.` 开头的文件、`module/` 目录、`封面Prompt.md` 类辅料文件（按后缀过滤）。

**验收**：
- 启动 dev server 后，`/AI技术认知/` 路径下侧边栏出现 `Agent/`、`Harness/`、`RAG/` 等子分组。
- `Agent/` 内文章按 `05-` `06-` `09-` `10-` ... 数字升序排列，无 `40-` 排在 `5-` 之前的字符串排序错位。

### F4 package.json + 依赖

**文件**：`package.json`（新建）

```json
{
  "name": "pm-wiki",
  "version": "1.0.0",
  "description": "产品经理 Wiki - AI 时代产品经理通用知识库",
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs",
    "deploy": "npm run docs:build && wrangler deploy",
    "preview": "npm run docs:build && wrangler dev"
  },
  "devDependencies": {
    "vitepress": "^1.6.4",
    "wrangler": "^4.90.0"
  }
}
```

### F5 Cloudflare 配置

**文件**：`wrangler.jsonc`（新建）

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "pm-wiki",
  "compatibility_date": "2026-05-15",
  "observability": { "enabled": true },
  "assets": { "directory": "docs/.vitepress/dist" },
  "compatibility_flags": ["nodejs_compat"]
}
```

### F6 .gitignore 更新

**追加**：
```
node_modules/
docs/.vitepress/cache/
docs/.vitepress/dist/
.wrangler/
```

### F7 README 更新

根 `README.md`：
- 把目录树章节里的 `pm-wiki/` 改成 `pm-wiki/docs/`，路径整体加 `docs/` 前缀。
- 主题导航的相对链接 `./AI技术认知/` 改为 `./docs/AI技术认知/`。
- 新增章节"本地启动"：
  ```md
  ## 本地启动

  pnpm/npm/yarn 任选其一：
  npm install && npm run docs:dev
  ```

---

## §5 非功能需求

### 5.1 性能
- `npm run docs:dev` 冷启动 ≤ 10s。
- `npm run docs:build` 全量构建 ≤ 60s（数百篇 md 量级）。

### 5.2 兼容性
- VitePress 1.6.4 支持中文路径，但 URL 会被 percent-encode。`cleanUrls: true` 下需要验证浏览器地址栏中文 URL 显示正常。
- 节点版本：≥ 18（VitePress 1.x 要求）。

### 5.3 可维护性
- 新增文章 = 在对应目录下放 `.md`，**无需改 config**（侧边栏脚本自动捡）。
- 新增一级目录 = 改 `config.mts` 的 nav 一处。
- 二级及更深目录 = 全自动。

### 5.4 风险
| 风险 | 应对 |
|------|------|
| 中文 URL 在 Cloudflare Pages 上 404 | 部署后人工验证；首版先跑本地，部署作为 P1 |
| 侧边栏文件过多导致首屏渲染慢 | 二级目录默认 `collapsed: true`，按需展开 |
| 旧链接（README、外部引用）失效 | README 同步改链接；外部引用本期不管 |
| `srcExclude` 漏配导致 PRD 入站 | 测试：`npm run docs:build` 后 grep dist 是否含 "PRD" 字样 |

---

## §6 技术方案

### 6.1 文件清单（新增/修改）

```
pm-wiki/
├── docs/                              # ⬅ 现有 7 个中文目录全部 git mv 进来
│   ├── .vitepress/
│   │   ├── config.mts                 # 新增
│   │   └── sidebar.mts                # 新增
│   ├── AI技术认知/                    # 移入
│   ├── 产品方法论/                    # 移入
│   ├── 产品案例研究/                  # 移入
│   ├── 商业策略/                      # 移入
│   ├── 思维模型/                      # 移入
│   ├── 技术趋势/                      # 移入
│   ├── 术语表/                        # 移入
│   └── module/site/prd/01-vitepress-migration-...md  # 已存在（本文件）
├── README.md                          # 修改：链接前缀加 docs/，新增"本地启动"
├── package.json                       # 新增
├── package-lock.json                  # 自动生成（git 跟踪）
├── wrangler.jsonc                     # 新增
└── .gitignore                         # 修改：加 node_modules / cache / dist / .wrangler
```

### 6.2 实施顺序（关键路径）

1. **Step 1 - 目录搬迁**：`git mv` 7 个一级目录到 `docs/`。一次性提交（一个 commit），避免与配置混在一起。
2. **Step 2 - 配置骨架**：写 `package.json`、`config.mts`（先用静态 sidebar 配空数组），跑 `npm install` + `npm run docs:dev` 验证能起。
3. **Step 3 - 侧边栏脚本**：写 `sidebar.mts`，本地验证 `/AI技术认知/` 等路径侧边栏正确。
4. **Step 4 - Cloudflare 配置**：加 `wrangler.jsonc`、`.gitignore`，跑 `wrangler deploy --dry-run` 验证。
5. **Step 5 - README 更新**：改链接 + 加启动说明。
6. **Step 6 - 端到端验证**：`npm run docs:build` 成功，`dist/` 不含 PRD/.dev 内容（grep 验证）。

### 6.3 实施风险点 & 决策记录

- **侧边栏排序**：必须用"自然排序（natsort）"而非字符串排序，否则 `40-...md` 会排在 `5-...md` 之前。可在 `sidebar.mts` 里手写比较函数（提取文件名前缀数字优先比较），避免引入额外依赖。
- **srcDir 选型**：选 `docs/` 而非根目录。原因：① 与 new-to-soc 一致；② 与 PRD 路径 `docs/module/...` 同构（PRD 也在 docs 树里，靠 srcExclude 排除）；③ 根目录留干净，未来加 README/CI/scripts 不混。
- **PRD 路径合理性确认**：PRD 在 `docs/module/site/prd/` 下，被 `srcExclude: ['**/module/**']` 排除，不会进站点。验证手段：build 后 `grep -r "vitepress-migration" docs/.vitepress/dist/` 应为空。
- **新增依赖最小化**：不引入 `vitepress-sidebar` 等三方库，自己写 ~50 行扫目录脚本，避免供应链 + 升级风险。

### 6.4 验收 Checklist

- [ ] `npm install` 成功
- [ ] `npm run docs:dev` 成功，浏览器访问 `localhost:5173` 能看到首页
- [ ] 顶部 nav 7 项可点击，每项跳转到对应一级目录
- [ ] 侧边栏自动列出当前一级目录下所有文章 + 子目录
- [ ] 文章按 `序号-` 数字升序排列（验证 `Agent/` 内顺序为 5/6/9/10/14/15... 而非字典序）
- [ ] 搜索 "Harness" 能找到对应文章
- [ ] `npm run docs:build` 成功
- [ ] `dist/` 不含 module/、.dev/、根 README 内容
- [ ] `wrangler deploy --dry-run` 不报错（真部署不在本期）
- [ ] 根 README 链接全部可点开

---

## 参考

- new-to-soc 仓库：`/Users/derek/derekrepo/new-to-soc/`
- VitePress 文档：https://vitepress.dev/
- Cloudflare Pages + wrangler：参考 `new-to-soc/wrangler.jsonc`
