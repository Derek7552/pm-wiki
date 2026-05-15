import fs from 'node:fs'
import path from 'node:path'

// VitePress sidebar item types
interface SidebarItem {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

type SidebarConfig = Record<string, SidebarItem[]>

/**
 * Natural sort comparator: extracts leading number from filename
 * so that "05-foo" < "10-bar" < "40-baz" instead of "40" < "5" in lexicographic order.
 */
function naturalCompare(a: string, b: string): number {
  const numA = parseInt(a.match(/^(\d+)/)?.[1] ?? '', 10)
  const numB = parseInt(b.match(/^(\d+)/)?.[1] ?? '', 10)

  if (!isNaN(numA) && !isNaN(numB)) {
    if (numA !== numB) return numA - numB
  } else if (!isNaN(numA)) {
    return -1
  } else if (!isNaN(numB)) {
    return 1
  }
  return a.localeCompare(b, 'zh-CN')
}

/**
 * Determines whether a filename/dirname should be skipped.
 */
function shouldSkip(name: string): boolean {
  if (name.startsWith('.') || name.startsWith('_')) return true
  if (name === 'module') return true
  if (name === 'node_modules') return true
  if (name.endsWith('-封面Prompt.md')) return true
  if (name === 'README.md') return true
  return false
}

/**
 * Recursively build sidebar items for a directory.
 * @param dirAbsPath  Absolute path to the directory being scanned
 * @param urlBase     URL prefix for this directory, e.g. "/AI技术认知/Agent"
 */
function buildItems(dirAbsPath: string, urlBase: string): SidebarItem[] {
  const entries = fs.readdirSync(dirAbsPath, { withFileTypes: true })

  const dirs: fs.Dirent[] = []
  const files: fs.Dirent[] = []

  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue
    if (entry.isDirectory()) {
      dirs.push(entry)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entry)
    }
  }

  dirs.sort((a, b) => naturalCompare(a.name, b.name))
  files.sort((a, b) => naturalCompare(a.name, b.name))

  const items: SidebarItem[] = []

  // Sub-directories become collapsed groups
  for (const dir of dirs) {
    const subUrl = `${urlBase}/${dir.name}`
    const subItems = buildItems(path.join(dirAbsPath, dir.name), subUrl)
    if (subItems.length > 0) {
      items.push({
        text: dir.name,
        collapsed: true,
        items: subItems,
      })
    }
  }

  // .md files become leaf links
  for (const file of files) {
    const stem = file.name.replace(/\.md$/, '')
    const link = `${urlBase}/${stem}`
    items.push({
      text: stem,
      link,
    })
  }

  return items
}

/**
 * Generate VitePress sidebar config by scanning srcDir.
 * @param srcDir  Path to the VitePress srcDir, relative to project root
 *                (e.g. "docs")
 */
export function generateSidebar(srcDir: string): SidebarConfig {
  // Resolve srcDir relative to the project root (where package.json lives).
  // __dirname here will be docs/.vitepress/ at runtime, so go up two levels.
  const projectRoot = path.resolve(__dirname, '..', '..')
  const srcAbsPath = path.resolve(projectRoot, srcDir)

  const topLevelDirs = [
    '产品方法论',
    'AI技术认知',
    '产品案例研究',
    '商业策略',
    '思维模型',
    '技术趋势',
    '术语表',
  ]

  const sidebar: SidebarConfig = {}

  for (const dirName of topLevelDirs) {
    const dirAbsPath = path.join(srcAbsPath, dirName)
    if (!fs.existsSync(dirAbsPath)) continue

    const key = `/${dirName}/`
    const items = buildItems(dirAbsPath, `/${dirName}`)

    sidebar[key] = [
      {
        text: dirName,
        items,
      },
    ]
  }

  return sidebar
}
