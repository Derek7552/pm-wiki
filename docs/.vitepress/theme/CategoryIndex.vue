<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

interface SidebarItem {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

const props = defineProps<{ category: string }>()

const { site } = useData()

const rootItems = computed<SidebarItem[]>(() => {
  const sidebar = site.value.themeConfig?.sidebar as
    | Record<string, SidebarItem[]>
    | undefined
  if (!sidebar) return []
  const key = `/${props.category}/`
  const top = sidebar[key]?.[0]
  return top?.items ?? []
})

function flatten(items: SidebarItem[]): { text: string; link: string }[] {
  const out: { text: string; link: string }[] = []
  for (const it of items) {
    if (it.link) out.push({ text: it.text, link: it.link })
    if (it.items?.length) out.push(...flatten(it.items))
  }
  return out
}

interface Group {
  kind: 'flat' | 'group'
  text: string
  items: { text: string; link: string }[]
}

const groups = computed<Group[]>(() => {
  const out: Group[] = []
  let flatBucket: Group | null = null
  for (const it of rootItems.value) {
    if (it.items?.length) {
      out.push({ kind: 'group', text: it.text, items: flatten(it.items) })
    } else if (it.link) {
      if (!flatBucket) {
        flatBucket = { kind: 'flat', text: '', items: [] }
        out.unshift(flatBucket)
      }
      flatBucket.items.push({ text: it.text, link: it.link })
    }
  }
  return out
})
</script>

<template>
  <div class="category-index">
    <template v-for="(group, idx) in groups" :key="idx">
      <section v-if="group.kind === 'group'" class="cat-group">
        <h2>{{ group.text }}</h2>
        <ul>
          <li v-for="item in group.items" :key="item.link">
            <a :href="withBase(item.link)">{{ item.text }}</a>
          </li>
        </ul>
      </section>
      <ul v-else class="cat-flat">
        <li v-for="item in group.items" :key="item.link">
          <a :href="withBase(item.link)">{{ item.text }}</a>
        </li>
      </ul>
    </template>

    <p v-if="!groups.length" class="cat-empty">该分类暂无文章。</p>
  </div>
</template>

<style scoped>
.category-index {
  margin-top: 1.5rem;
}
.cat-group {
  margin-top: 2rem;
}
.cat-group h2 {
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.4rem;
  margin-bottom: 0.8rem;
  font-size: 1.25rem;
}
.category-index ul {
  list-style: disc;
  padding-left: 1.4rem;
  line-height: 1.9;
}
.category-index a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.category-index a:hover {
  text-decoration: underline;
}
.cat-empty {
  color: var(--vp-c-text-2);
}
</style>
