import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../', import.meta.url))

// D6 — CLI-generated paths. `shadcn add` rewrites these; renaming them breaks the CLI.
const EXEMPT = ['components/ui', 'hooks/use-mobile.ts']

const SNAKE_DIR = /^[a-z0-9]+(_[a-z0-9]+)*$/
const SNAKE_FILE = /^[a-z0-9]+(_[a-z0-9]+)*(\.test)?\.(ts|tsx|css)$/

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
    // `__tests__` is a runner convention every JS developer already reads.
    expect(name === '__tests__' || SNAKE_DIR.test(name)).toBe(true)
  })

  it.each(files)('names $path in snake_case', ({ path }) => {
    expect(SNAKE_FILE.test(path.split('/').pop() as string)).toBe(true)
  })

  // Growing the exemption list must be a visible, reviewed edit — not a quiet append.
  it('exempts exactly the two CLI-owned paths', () => {
    expect(EXEMPT).toEqual(['components/ui', 'hooks/use-mobile.ts'])
  })
})
