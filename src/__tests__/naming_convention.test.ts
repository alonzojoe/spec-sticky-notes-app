import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../', import.meta.url))

// D6 — CLI-generated paths. `shadcn add` rewrites these; renaming them breaks the CLI. P11 added
// the third: `@tanstack/router-plugin` writes the route tree on every dev start and build, so its
// camelCase name is no more ours to choose than shadcn's kebab-case one.
const EXEMPT = ['components/ui', 'hooks/use-mobile.ts', 'app/routeTree.gen.ts']

const SNAKE_DIR = /^[a-z0-9]+(_[a-z0-9]+)*$/
const SNAKE_FILE = /^[a-z0-9]+(_[a-z0-9]+)*(\.test)?\.(ts|tsx|css)$/

/**
 * P11. The router's file convention has its own vocabulary, and it is snake_case with two marks
 * on top of it: a leading `_` makes a directory a **pathless layout group** (`_board`), and
 * `__root.tsx` is the tree's root. Both are read by the plugin, not chosen by us — the same reason
 * `__tests__` is allowed below, and the same reason `EXEMPT` exists at all.
 *
 * Written as two narrow patterns rather than as a loosened rule: `_board` passes and `_Board` does
 * not, and nothing else about the rule moves.
 */
const PATHLESS_DIR = /^_[a-z0-9]+(_[a-z0-9]+)*$/
const ROUTER_FILES = ['__root.tsx']

type Entry = { path: string; isDirectory: boolean }

const walk = (dir: string): Entry[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = join(dir, item.name)
    const path = relative(src, full)
    if (EXEMPT.some((e) => path === e || path.startsWith(`${e}/`))) return []
    return item.isDirectory()
      ? [{ path, isDirectory: true }, ...walk(full)]
      : [{ path, isDirectory: false }]
  })

const entries = walk(src)
const directories = entries.filter((e) => e.isDirectory)
const files = entries.filter((e) => !e.isDirectory && !e.path.endsWith('.d.ts'))

describe('the snake_case file-name rule', () => {
  it('actually walked the tree', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(directories)('names the $path directory in snake_case', ({ path }) => {
    const name = path.split('/').pop() as string
    // `__tests__` is a runner convention every JS developer already reads; `_board` is the
    // router's, and means "this directory adds no URL segment".
    expect(name === '__tests__' || SNAKE_DIR.test(name) || PATHLESS_DIR.test(name)).toBe(true)
  })

  it.each(files)('names $path in snake_case', ({ path }) => {
    const name = path.split('/').pop() as string
    expect(ROUTER_FILES.includes(name) || SNAKE_FILE.test(name)).toBe(true)
  })

  // Growing the exemption list must be a visible, reviewed edit — not a quiet append. P11 is the
  // first phase to grow it since P1 wrote it, and its D3 is the argument.
  it('exempts exactly the three CLI-owned paths', () => {
    expect(EXEMPT).toEqual(['components/ui', 'hooks/use-mobile.ts', 'app/routeTree.gen.ts'])
  })
})
