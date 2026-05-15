import { defineConfig } from 'vitepress'
import { generateSidebar } from './sidebar.mjs'

export default defineConfig({
  title: '产品经理 Wiki',
  description: '面向 AI 时代产品经理的通用知识库',
  lang: 'zh-CN',
  base: '/pm-wiki/',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  srcExclude: [
    '**/module/**',
    '**/.dev/**',
    '**/README.md',
    '**/node_modules/**',
  ],

  vue: {
    template: {
      compilerOptions: {
        // Treat any tag starting with lowercase as custom element to avoid
        // "missing end tag" errors from bare <tag> placeholders in Markdown
        isCustomElement: (tag) => /^[a-z]/.test(tag),
      },
    },
  },

  markdown: {
    // Escape bare <word> HTML-like placeholders before Vue template compilation.
    // This prevents "missing end tag" errors for things like <site>, <name> in code examples.
    config: (md) => {
      md.core.ruler.before('normalize', 'escape-bare-tags', (state) => {
        state.src = state.src.replace(/<([a-z][a-z0-9-]*)>/g, '&lt;$1&gt;')
      })
    },
  },

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
