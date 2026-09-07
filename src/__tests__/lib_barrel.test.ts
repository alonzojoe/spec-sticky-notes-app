import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import * as barrel from '@/lib'
import { hydrate, isISODate, normalizeLink, SECTIONS } from '@/lib'

/**
 * T81 — `lib/` is reachable through one barrel, and stays that way.
 *
 * P13 rewrote every import we author from `@/lib/dates` to `@/lib`, which is only an improvement
 * for as long as the barrel is complete. The failure this file exists to prevent is quiet: a module
 * added later without a line in `index.ts` is invisible until someone tries to import from `@/lib`
 * and is told, in a type error about a name that plainly exists, that it does not.
 *
 * So the expectation is read off the directory rather than written down here. A hand-written list
 * would be a second thing to keep in step with `index.ts`, which is the problem the barrel was for.
 */
const libDir = fileURLToPath(new URL('../lib/', import.meta.url))

const modules = readdirSync(libDir)
  .filter((name) => name.endsWith('.ts') && name !== 'index.ts' && !name.endsWith('.d.ts'))
  .map((name) => name.replace(/\.ts$/, ''))

describe('T81 · the lib barrel', () => {
  it('actually read the directory', () => {
    // The listing being empty would make every assertion below vacuously true.
    expect(modules.length).toBeGreaterThan(10)
    expect(modules).toContain('sections')
  })

  it('re-exports something from every module in the folder', async () => {
    const missing: string[] = []

    for (const name of modules) {
      const module = (await import(`../lib/${name}.ts`)) as Record<string, unknown>
      const exported = Object.keys(module).filter((key) => key !== 'default')
      // A module with no runtime exports at all — a types-only file — has nothing the barrel
      // could carry, and is not evidence of a missing line.
      if (exported.length === 0) continue
      if (!exported.some((key) => key in barrel)) missing.push(name)
    }

    expect(missing).toEqual([])
  })

  it('re-exports the same binding, not a copy', () => {
    // A barrel that re-exports a stale or re-wrapped value is the failure a name check misses:
    // the import resolves, the type is right, and the behaviour is somebody else's.
    expect(barrel.isISODate).toBe(isISODate)
    expect(barrel.normalizeLink).toBe(normalizeLink)
    expect(barrel.hydrate).toBe(hydrate)
    expect(barrel.SECTIONS).toBe(SECTIONS)
  })
})
