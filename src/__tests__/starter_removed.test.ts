import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const fromRoot = (relative: string) => join(root, relative)

// T3 — criterion: "clear the deck". Catches a half-finished strip that still builds.
describe('the Vite starter UI', () => {
  it.each([
    'src/App.css',
    'src/assets',
    'public/icons.svg',
  ])('no longer ships %s', (path) => {
    expect(existsSync(fromRoot(path))).toBe(false)
  })

  // P11 deleted `src/app.tsx` outright — `main.tsx` composes the router and there is no App
  // component under it — so the entry point is what this reads now. The assertion is the same one:
  // the starter's assets are referenced nowhere at the top of the app.
  it.each(['react.svg', 'vite.svg', 'hero.png', 'icons.svg'])(
    'leaves no reference to %s in the entry point',
    (asset) => {
      const entry = readFileSync(fromRoot('src/app/main.tsx'), 'utf8')
      expect(entry).not.toContain(asset)
    },
  )

  // The starter's own component is gone rather than emptied.
  it('ships no src/app.tsx at all', () => {
    expect(existsSync(fromRoot('src/app.tsx'))).toBe(false)
  })
})

// T4 — criterion: decision D1. Tailwind v4 still works with a config file present,
// which is exactly why its absence needs asserting.
describe('Tailwind v4 configuration', () => {
  it.each(['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'])(
    'has no %s at the project root',
    (config) => {
      expect(existsSync(fromRoot(config))).toBe(false)
    },
  )
})
