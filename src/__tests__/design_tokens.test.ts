import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../', import.meta.url))
const css = readFileSync(join(src, 'index.css'), 'utf8')

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
