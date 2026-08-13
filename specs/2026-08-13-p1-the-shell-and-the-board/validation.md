# P1 · The shell and the board — Validation

How to know P1 actually succeeded. The roadmap's Done-when for this phase is: *the sidebar
collapses cleanly and holds the only chrome on screen, the mockup notes look like paper on a
board, and the shadow / tilt / grain criteria in `mission.md` are visibly satisfied.*

Most of that is assertable. The parts that are genuinely about how something *looks* and *feels*
are listed as manual rather than disguised as coverage — the same split P0 made in its decision
D5, for the same reason.

---

## Gate 1 — Command gates

All three exit zero from a clean checkout after `npm install`:

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, not merely passing. `eslint.config.js` gains one scoped override in this phase
(`react-refresh/only-export-components` off for `src/components/ui/**`); silencing anything else,
or adding a `// eslint-disable` line to our own code, fails this gate.

---

## Gate 2 — Automated assertions (Vitest)

Tests live in `src/__tests__/`. T1–T3 exist from P0 and are carried forward with the path edits
the rename forces. T4–T10 are new.

### T1 · The `@/` alias resolves — *carried forward, unchanged*

`alias.test.ts` needs no edit. It already imports through `@/lib/utils`, which is untouched.

### T2 · Tailwind emits utilities — *carried forward, edited*

`tailwind_build.test.ts` reads a source file by path and extracts its first `className`. Two
edits, applied at different points in [plan.md](./plan.md).

First, the helper filters to plain utilities before asserting, because the components this phase
adds carry variant classes whose emitted selectors are escaped (plan § 1.7).

Second, the path moves. It follows the rename to `src/app.tsx` in group 1, but by group 6
`app.tsx` is a three-line wrapper with no `className` at all and the helper throws by design. Its
**final** target is `src/components/board/board.tsx`, which is where the utility classes actually
live (plan § 6.4). Both the error message and the test names move with it.

```ts
// `.md\:flex` is what Tailwind emits for `md:flex`; asserting `.md:flex` would fail
// against a perfectly correct stylesheet. Restrict to utilities that need no escaping.
return classNames.split(/\s+/).filter((utility) => /^[a-z][a-z0-9-]*$/.test(utility))
```

The negative assertion — that a utility used nowhere in source is absent — stays exactly as it
is. It is what proves the scanner ran.

### T3 · The starter is gone — *carried forward, edited*

`starter_removed.test.ts` reads `src/App.tsx` in its second block. That path becomes
`src/app.tsx`. Nothing else changes; the deleted-path assertions still hold.

### T4 · Every file we author is snake_case — *criterion: decision D6, enforced by D7*

New file `src/__tests__/naming_convention.test.ts`. It walks `src/`, skips the CLI-owned paths,
and matches every remaining entry against the rule.

```ts
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
```

The last assertion is the point of the test. Without it, the cheapest way to make a failure go
away is to add a line to `EXEMPT`, and the rule erodes silently.

### T5 · The sidebar's shadcn defaults were amended — *criterion: decisions D4 and D8*

New file `src/__tests__/sidebar_amendments.test.ts`, reading `src/components/ui/sidebar.tsx` as
text. Source assertions are the right tool here: these are about what the file *contains*, and
re-running `shadcn add sidebar` would silently restore every one of them.

- No `document.cookie` and no `sidebar_state` anywhere in the file (D4).
- No `ease-linear` (D8).
- No `transition-all` (D8).
- The file **does** contain `ease-drawer`, the token that replaced `ease-linear`.

### T6 · Every token is warm — *criterion: mission.md, decision D3*

New file `src/__tests__/design_tokens.test.ts`. Parses every `oklch()` declaration out of
`src/index.css` — `:root` and `.dark` both — and asserts none is achromatic or absolute.

```ts
const tokens = [...css.matchAll(/(--[a-z0-9-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)/g)]
  .map(([, name, l, c]) => ({ name, lightness: Number(l), chroma: Number(c) }))

it('parsed the token block', () => expect(tokens.length).toBeGreaterThan(20))

it.each(tokens)('$name is warm, not a neutral gray', ({ chroma }) => {
  expect(chroma).toBeGreaterThanOrEqual(0.008)
})

it.each(tokens)('$name is neither pure white nor pure black', ({ lightness }) => {
  expect(lightness).toBeGreaterThan(0)
  expect(lightness).toBeLessThan(1)
})
```

This is the test that catches a future `shadcn add` re-flattening the palette, which is the
failure mode D3 was written against.

### T7 · The shell renders its chrome — *criterion: the sidebar is the chrome*

New file `src/__tests__/app_shell.test.tsx`, with `// @vitest-environment jsdom` as its first
line. jsdom has no `window.matchMedia`, and shadcn's `use-mobile` hook calls it on mount, so
every component test stubs it first — see § Test setup below.

- A `<nav>` landmark exists with an accessible name. shadcn's `Sidebar` does not emit one;
  `app_sidebar.tsx` supplies `<nav aria-label="Board sections">` around the menu.
- Exactly **one** navigation item, accessibly named `Notes`, carrying `aria-current="page"`.
  Assert the count is 1 — "at least one" would pass against a sidebar that quietly grew a second
  destination, which `mission.md` still lists as out of scope.
- Its badge text equals the mockup note count, read from the same exported array the board
  renders. Asserting the literal `3` would let the badge and the board drift apart.
- A `<main>` landmark exists for the board region.
- The item is a real `<button>` — `expect(item.tagName).toBe('BUTTON')`. The constitution calls a
  `div` with `onClick` a defect, and this is the phase that introduces the first one if nobody
  looks.

### T8 · Tilt is stable across re-renders — *criterion: mission.md, decision D11*

In `src/__tests__/board.test.tsx`. Render the board, read the `transform` off each note, re-render
with the same props, read them again, assert equality — and assert every value is non-zero and
within ±3°. A `Math.random()` tilt passes a single render and fails this.

### T9 · The dormant components stay dormant — *criterion: decision D9*

In `sidebar_amendments.test.ts`. Read every `.ts`/`.tsx` file under `src/` *except*
`src/components/ui/`, and assert none imports `@/components/ui/button`, `input`, `tooltip`,
`sheet`, `skeleton`, or `separator`. They arrived transitively; using one in P1 is building
ahead, and this is what makes that reviewable rather than a matter of noticing.

### T10 · No stock palette utilities in our components — *criterion: "every color comes from a token"*

In `design_tokens.test.ts`. Read every file under `src/components/board/` and
`src/components/layout/` and assert none matches Tailwind's stock color scale:

```ts
const STOCK = /\b(bg|text|border|ring|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/
```

`bg-paper-rose` does not match — the scale name must follow the property directly. `bg-stone-200`,
which `App.tsx` ships today, does. Also assert no `shadow-lg`/`shadow-md`/`shadow-xl`: the shadow
scale is `shadow-note`, `shadow-note-hover`, `shadow-note-drag`.

### Test setup

`src/__tests__/dom_setup.ts` — not a test file, so the runner will not collect it.

```ts
import { vi } from 'vitest'

// jsdom implements no matchMedia, and shadcn's use-mobile hook calls it on mount.
// Defaults to desktop so the sidebar renders its panel rather than the mobile Sheet.
export const stubMatchMedia = (matches = false) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
```

Every component test calls `stubMatchMedia()` in `beforeEach` and `afterEach(cleanup)` from
`@testing-library/react`. Cleanup is explicit because Vitest runs without globals here, so RTL
never registers its automatic hook — and the repo's existing tests import `describe`/`it`/`expect`
by name, a pattern this phase does not change.

Do **not** add a `test` block to `vite.config.ts`. Component files opt into jsdom with a
`// @vitest-environment jsdom` docblock, so the slow Vite build test in T2 keeps running in node.

---

## Gate 3 — Manual checks

Run `npm run dev`. These are about appearance and feel, which no unit test reaches.

**The board**

- [ ] **Paper reads as paper.** Each note carries a visible two-layer shadow — a tight contact
      shadow plus a wider ambient one. Depth reads as height off the board, not as a border.
- [ ] **Tilt is visible and varied.** No note sits perfectly square; none looks knocked over.
- [ ] **Grain is present on both surfaces.** The paper has texture and the board reads as cork or
      felt. Neither is a flat single color. Check at 100% zoom, not zoomed in.
- [ ] **Warm throughout.** No cold gray anywhere on screen, no pure white paper, no pure black
      text. Compare against `mission.md`'s palette criterion directly.
- [ ] **Text never touches an edge.** Generous padding inside every note.

**The sidebar**

- [ ] **The collapse feels like a drawer.** Toggle it by rail, by trigger, and by `⌘B`. Motion
      settles rather than stopping dead — if it reads as constant-speed, `ease-linear` survived.
- [ ] **Reduced motion is honoured.** Enable *Reduce motion* in System Settings → Accessibility →
      Display, reload, and toggle. The sidebar snaps between states instantly and still works.
- [ ] **The collapsed rail is usable.** Icons remain legible and the `Notes` tooltip appears.
- [ ] **Focus is always visible.** Tab through the whole shell. Every stop shows a ring; nothing
      is reachable without one, and nothing is skipped.
- [ ] **Nothing is disabled or dead.** The sidebar shows only controls that work. No greyed-out
      `New note`, no non-functional search field.
- [ ] **Narrow viewport.** Below `md`, the sidebar becomes a sheet and the board still fills the
      screen. Usable, not polished — polish is P10.

**Both**

- [ ] **The console is clean.** No errors, no warnings, no failed requests.
- [ ] **No layout shift on load.** The sidebar does not flash open then closed, or vice versa.

Record every box as ticked in the PR description. An unchecked box blocks merge.

---

## Gate 4 — Constitution compliance

- [ ] `specs/mission.md` principle 4 amended to permit sidebar chrome (**D2**), **in this same
      commit**. The out-of-scope line *"Multiple boards / workspaces / folders"* is unchanged.
- [ ] `specs/roadmap.md` P1 retitled and rewritten to match what shipped. No other phase
      renumbered.
- [ ] `specs/tech-stack.md` carries, in this same commit: the snake_case rule with its
      `src/components/ui/**` exemption; the file tree rewritten in snake_case; a **Testing**
      entry for `jsdom` and `@testing-library/react` with a rationale paragraph (**D5**); and the
      Primitives row corrected to the unified `radix-ui` package rather than `@radix-ui/react-*`.
- [ ] No runtime dependency beyond what `shadcn add sidebar` pulled: `radix-ui`, `lucide-react`,
      and the `class-variance-authority` / `clsx` / `tailwind-merge` set that P0 already had.
      Specifically **no `usehooks-ts`** — it is P3's, and D4 explains why it is not needed here.
- [ ] No state library. No `fetch`. No backend.
- [ ] No `useState`, `useReducer`, or context authored by us. `SidebarProvider`'s internal state
      is shadcn's and does not count.
- [ ] No `src/types/note.ts` yet — the mockup note type is local to the board module (**D10**).
- [ ] No `console.log` and no `any` in committed code.
- [ ] Exactly one shadcn component was *requested*: `sidebar`. The other six are its registry
      dependencies and are asserted dormant by **T9**.

---

## Merged means

1. Gates 1–4 pass on `feat/p1-the-shell-and-the-board`.
2. A PR is open **against `develop`**, not `main`, with the Gate 3 checkboxes ticked in the
   description.
3. The PR is approved and merged into `develop`, arriving as **one commit** for the phase.
4. `develop` at the merge commit builds, lints, and tests clean — verified on `develop` after the
   merge, not only on the branch.
5. P2 begins from that merge commit.

## Explicitly not required

Do not block the merge on these:

- Any real note state, creation, deletion, editing, or dragging (**P2**, **P4**, **P5**).
- Sidebar collapse persisting across reloads (**P3**, per **D4**).
- A working theme toggle or a designed dark mode (**P9**). The `.dark` token *values* are warm in
  this phase; nothing switches to them.
- The `New note`, `Search`, or `Theme` controls existing in any form (**P2**, **P7**, **P9**).
- Visual regression or screenshot tests.
- Mobile polish, responsive refinement, or the 100-note performance check (**P10**).
