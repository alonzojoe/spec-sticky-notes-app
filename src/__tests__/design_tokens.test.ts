import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../', import.meta.url))
const css = readFileSync(join(src, 'app/main.css'), 'utf8')

// T6 — mission.md: "The palette is warm — paper colors and a cork-toned backdrop.
// No cold grays, no pure #fff paper, no pure #000 text." shadcn's defaults are all
// oklch(L 0 0). This is the test that catches a future `shadcn add` re-flattening them.
const tokens = [...css.matchAll(/(--[a-z0-9-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)/g)].map(
  ([, name, l, c]) => ({ name, lightness: Number(l), chroma: Number(c) }),
)

describe('the colour tokens', () => {
  it('parsed the token block', () => {
    expect(tokens.length).toBeGreaterThan(20)
  })

  it.each(tokens)('$name is warm, not a neutral gray', ({ chroma }) => {
    expect(chroma).toBeGreaterThanOrEqual(0.008)
  })

  it.each(tokens)('$name is neither pure white nor pure black', ({ lightness }) => {
    expect(lightness).toBeGreaterThan(0)
    expect(lightness).toBeLessThan(1)
  })
})

// T10 — tech-stack.md: "Every color, radius, shadow and duration comes from a token."
// Tailwind's stock palette is as forbidden as a raw hex value. `bg-paper-rose` does not
// match: the scale name has to follow the property directly.
const STOCK =
  /\b(bg|text|border|ring|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/

const STOCK_SHADOW = /\bshadow-(sm|md|lg|xl|2xl)\b/

// Walks src/components and skips ui/, so directories later phases add are covered
// automatically rather than needing to be remembered here.
const authoredComponents = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    if (item.name === 'ui') return []
    const full = join(dir, item.name)
    if (item.isDirectory()) return authoredComponents(full)
    return /\.tsx?$/.test(item.name) ? [full] : []
  })

const componentFiles = authoredComponents(join(src, 'components'))

describe('the components we author', () => {
  // A scan that finds nothing passes every assertion below it and reports coverage it
  // does not have.
  it('found the component files to check', () => {
    expect(componentFiles.length).toBeGreaterThan(0)
  })

  it.each(componentFiles)('uses no stock palette utility: %s', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(STOCK)
  })

  // The shadow scale is shadow-note / shadow-note-hover / shadow-note-drag.
  it.each(componentFiles)('uses no stock shadow utility: %s', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(STOCK_SHADOW)
  })
})
