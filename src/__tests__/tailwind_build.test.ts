import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Rollup } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'

// T2 — criterion: "a Tailwind utility demonstrably works". Builds the app through Vite's
// own pipeline and inspects the emitted stylesheet. This is the slow test in the suite.
const root = fileURLToPath(new URL('../../', import.meta.url))

// Tailwind scans every source file, this one included, so a class named literally here
// would be emitted and defeat its own assertion. The positive cases are read out of
// app.tsx at runtime; the negative one is assembled from fragments that are not
// themselves candidates.
const utilitiesUsedInApp = () => {
  const app = readFileSync(join(root, 'src/app.tsx'), 'utf8')
  const classNames = app.match(/className="([^"]+)"/)?.[1]
  if (!classNames) throw new Error('app.tsx declares no className to assert against')
  // `md:flex` is emitted as `.md\:flex`; asserting the unescaped form would fail against
  // a correct stylesheet. Restrict the positive assertion to plain utilities.
  return classNames.split(/\s+/).filter((utility) => /^[a-z][a-z0-9-]*$/.test(utility))
}

const unusedUtility = ['bg', 'lime', '300'].join('-')

let css = ''

beforeAll(async () => {
  const result = await build({
    root,
    logLevel: 'silent',
    build: { write: false },
  })

  const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[]
  css = outputs
    .flatMap((output) => output.output)
    .filter((chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'))
    .map((chunk) => String((chunk as Rollup.OutputAsset).source))
    .join('\n')

  expect(css).not.toBe('')
}, 60_000)

describe('the Tailwind pipeline', () => {
  it('emits a rule for every utility app.tsx uses', () => {
    const used = utilitiesUsedInApp()
    expect(used.length).toBeGreaterThan(0)
    for (const utility of used) {
      expect(css).toContain(`.${utility}`)
    }
  })

  // The negative is what proves the scanner ran, rather than that some CSS was emitted.
  it('omits a utility that appears nowhere in source', () => {
    expect(css).not.toContain(`.${unusedUtility}`)
  })
})
