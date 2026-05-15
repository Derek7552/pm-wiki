import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CategoryIndex from './CategoryIndex.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CategoryIndex', CategoryIndex)
  },
} satisfies Theme
