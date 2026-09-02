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
// board.tsx at runtime; the negative one is assembled from fragments that are not
// themselves candidates.
const utilitiesUsedInApp = () => {
  const app = readFileSync(join(root, 'src/components/board/board.tsx'), 'utf8')
  const classNames = app.match(/className="([^"]+)"/)?.[1]
  if (!classNames) throw new Error('board.tsx declares no className to assert against')
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
  it('emits a rule for every utility board.tsx uses', () => {
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

// T51 — P7. Every class the card can reach must actually emit. A missing utility here fails
// silently: the card simply does not clamp, and no test that reads the DOM would notice.
describe('T51 · the card geometry emits', () => {
  // Assembled rather than written literally, because Tailwind scans this file too and a literal
  // would emit the class it is meant to be checking for.
  const clamp = (n: number) => ['line', 'clamp', String(n)].join('-')

  it.each([3, 4, 5])('emits %s of the body clamps BODY_LINES can choose', (lines) => {
    expect(css).toContain(`.${clamp(lines)}`)
  })

  it('emits the fixed card height', () => {
    expect(css).toContain(`.${['h', '52'].join('-')}`)
  })

  // The obvious companion — "no clamp wider than the table allows" — cannot be asserted from
  // the stylesheet. Tailwind scans the whole project including specs/, and validation.md names
  // line-clamp-6 in order to forbid it, which is enough to emit it. The table itself is asserted
  // from the source below instead, which is the thing that actually matters.
  it('offers exactly the three clamps the table describes', () => {
    const card = readFileSync(join(root, 'src/components/board/note_card.tsx'), 'utf8')
    const table = card.slice(card.indexOf('BODY_LINES'), card.indexOf('const bodyClamp'))
    expect(table.match(/line-clamp-\d+/g)).toEqual([clamp(3), clamp(4), clamp(5)])
  })
})
