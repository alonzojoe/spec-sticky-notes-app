# P1 · The shell and the board — Plan

Seven task groups. Execute in order: each leaves the tree building, linting, and testing clean,
and in a state the next group can verify against. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Each group is test-first where a test is possible: write the assertion, watch it fail for the
right reason, then make it pass. Groups end with `npm run build && npm run lint && npm test`.
Commit at the end of each group while working — the phase is **squashed to one commit** when the
PR merges (roadmap rule: one phase, one commit).

**Ordering note.** The sidebar is installed (group 3) *before* the tokens are written (group 4).
`shadcn add` rewrites parts of `src/index.css`, and doing it the other way round would let the CLI
flatten the warm palette back to gray on its way in.

## Verified constraints

Checked against the installed toolchain before this plan was written. Do not substitute.

- **`ease-drawer` compiles; `duration-drawer` does not.** Tailwind v4 has an `--ease-*` theme
  namespace but no `--duration-*` one. `--duration-drawer: 200ms` in `@theme` emits a custom
  property and nothing else. Reference it as **`duration-(--duration-drawer)`**, which compiles to
  `transition-duration: var(--duration-drawer)`. Writing `duration-drawer` silently emits no rule
  and leaves the browser default in place.
- **`SidebarInset` renders a `<main>` element.** Do not wrap the board in another `<main>` —
  two `main` landmarks is an accessibility defect and T7 asserts exactly one.
- **Tailwind v4's `hover:` variant is already wrapped in `@media (hover: hover)`.** No manual
  guard is needed for hover styles written as Tailwind utilities.
- `SidebarMenuButton` renders a real `<button>`; `SidebarMenu` is a `<ul>`, `SidebarMenuItem` an
  `<li>`. None of them emits a `<nav>` — group 6 supplies one.

---

## 1. snake_case file names, enforced by a test

The rule applies to **file and directory names only**. React components keep PascalCase
identifiers (`function AppSidebar`), hooks keep camelCase (`useSidebar`). Renaming those would be
a different and much worse idea.

1.1 Create `src/__tests__/naming_convention.test.ts` with the walker, the two regexes, the
    `EXEMPT` allowlist, and all four assertions exactly as written in
    [validation.md](./validation.md) § T4 — including the final assertion that pins `EXEMPT` to
    its two entries.

1.2 `npm test`. Expect **failures naming `App.tsx`, `starter-removed.test.ts`, and
    `tailwind-build.test.ts`**. If it fails on anything else, the walker or a regex is wrong —
    fix that before renaming anything.

1.3 Rename the app component file. It is a case-only change on a case-insensitive filesystem, so
    it must go through a temporary name or git will not record it:

```sh
git mv src/App.tsx src/app_tmp.tsx
git mv src/app_tmp.tsx src/app.tsx
git status --short   # must show: R  src/App.tsx -> src/app.tsx
```

1.4 Rename the two kebab-cased tests:

```sh
git mv src/__tests__/starter-removed.test.ts src/__tests__/starter_removed.test.ts
git mv src/__tests__/tailwind-build.test.ts src/__tests__/tailwind_build.test.ts
```

1.5 Update `src/main.tsx` — `import App from './App.tsx'` becomes `import App from './app.tsx'`.

1.6 Update `src/__tests__/starter_removed.test.ts`: the second `it.each` block reads
    `fromRoot('src/App.tsx')`. Change it to `fromRoot('src/app.tsx')`. The describe text
    `'leaves no reference to %s in App.tsx'` should read `app.tsx` too.

1.7 Update `src/__tests__/tailwind_build.test.ts`. Two edits. First, the path in
    `utilitiesUsedInApp` becomes `src/app.tsx`. Second, filter to utilities that need no CSS
    escaping, because group 6 introduces variant classes whose selectors are escaped:

```ts
const utilitiesUsedInApp = () => {
  const app = readFileSync(join(root, 'src/app.tsx'), 'utf8')
  const classNames = app.match(/className="([^"]+)"/)?.[1]
  if (!classNames) throw new Error('app.tsx declares no className to assert against')
  // `md:flex` is emitted as `.md\:flex`; asserting the unescaped form would fail against
  // a correct stylesheet. Restrict the positive assertion to plain utilities.
  return classNames.split(/\s+/).filter((utility) => /^[a-z][a-z0-9-]*$/.test(utility))
}
```

1.8 `npm test` — green. `npm run build && npm run lint` — clean.

1.9 Commit: `refactor: rename source files to snake_case and guard the rule with a test`

**Leaves:** every file we author matching the rule, and a test that fails the build the first
time someone drifts from it.

---

## 2. The DOM test harness

2.1 `npm install -D jsdom @testing-library/react`

2.2 Amend `specs/tech-stack.md` **in this group, not later**. The constitution forbids a
    dependency landing without its line. Add to the stack table, under the existing Testing row:

```md
| DOM testing | **`jsdom` + `@testing-library/react`** | devDependencies. Component assertions run per-file via a `@vitest-environment jsdom` docblock. |
```

    And a paragraph under "Decisions and rationale":

```md
**`jsdom` + `@testing-library/react` for component tests.** They replace nothing — through P0
acceptance was filesystem and build assertions, which is all a phase with no components can
honestly check. From P1 the repo renders UI whose criteria are structural: a `<nav>` landmark,
an `aria-current` marker, a real `<button>` rather than a clickable `div`. A source-text grep
cannot assert any of those. Both are devDependencies, so the no-backend and no-state-library
rules are untouched. `@testing-library/jest-dom` is deliberately absent: its matchers are
convenience over `expect(el.getAttribute('aria-current')).toBe('page')`, at the cost of a third
dependency and a `types` entry in `tsconfig.app.json`.
```

2.3 Create `src/__tests__/dom_setup.ts` with the `stubMatchMedia` helper exactly as written in
    [validation.md](./validation.md) § Test setup. It is not a `.test.ts` file, so Vitest will not
    collect it.

2.4 Create `src/__tests__/app_shell.test.tsx`. Its **first line** must be the environment
    docblock — Vitest reads it before the imports:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'

beforeEach(() => stubMatchMedia())
afterEach(cleanup)

describe('the application shell', () => {
  it('renders exactly one main landmark for the board region', () => {
    render(<App />)
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})
```

2.5 `npm test`. This passes immediately against today's `app.tsx` (`<main className="min-h-dvh
    bg-stone-200" />`). That is the point: it proves the harness renders React into jsdom before
    any component depends on it. Group 6 extends this file rather than replacing it.

2.6 Do **not** add a `test` block to `vite.config.ts`. Vitest's default environment stays `node`
    so the slow Vite build test in `tailwind_build.test.ts` is not dragged into jsdom.

2.7 `npm run build && npm run lint && npm test` — clean.

2.8 Commit: `test: add a jsdom + testing-library harness and record it in the tech stack`

**Leaves:** components are testable, and the constitution says so.

---

## 3. The shadcn sidebar, installed and amended

3.1 `npx shadcn@latest add sidebar`

3.2 Confirm what landed. Expect `src/components/ui/{sidebar,button,input,separator,sheet,
    skeleton,tooltip}.tsx`, `src/hooks/use-mobile.ts`, and `radix-ui` + `lucide-react` added to
    `dependencies`. Seven components for one request is correct and expected — see requirements
    **D9**. Do not delete the six you did not ask for; `sidebar.tsx` imports all of them.

3.3 `npm test`. The naming test from group 1 must still pass — its `EXEMPT` list already covers
    `components/ui` and `hooks/use-mobile.ts`. If it fails, the exemption paths are wrong, not the
    new files.

3.4 `npm run lint`. Expect `react-refresh/only-export-components` warnings from `sidebar.tsx`,
    which exports the `useSidebar` hook beside its components. The quality bar forbids new
    warnings, so scope the rule off for CLI-owned files. Append to the array in
    `eslint.config.js`:

```js
  {
    // shadcn writes and regenerates these. `sidebar.tsx` exports `useSidebar` beside its
    // components, which react-refresh flags. We do not hot-reload-author vendor-shaped files.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
```

    Do not disable the rule globally, and do not edit `useSidebar` out of `sidebar.tsx` — the
    shell imports it in group 6.

3.5 Create `src/__tests__/sidebar_amendments.test.ts` covering T5 and T9:

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../', import.meta.url))
const sidebar = readFileSync(join(src, 'components/ui/sidebar.tsx'), 'utf8')

// T5 — D4 and D8. Re-running `shadcn add sidebar` restores every one of these silently.
describe('the amendments to shadcn sidebar.tsx', () => {
  it.each(['document.cookie', 'sidebar_state'])('writes no %s (D4)', (fragment) => {
    expect(sidebar).not.toContain(fragment)
  })

  it.each(['ease-linear', 'transition-all'])('uses no %s (D8)', (fragment) => {
    expect(sidebar).not.toContain(fragment)
  })

  it('uses the drawer easing token instead', () => {
    expect(sidebar).toContain('ease-drawer')
  })
})

// T9 — D9. The six transitive components are dormant until a phase needs them.
const DORMANT = ['button', 'input', 'tooltip', 'sheet', 'skeleton', 'separator']

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = join(dir, item.name)
    if (relative(src, full).startsWith('components/ui')) return []
    if (item.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(item.name) ? [full] : []
  })

describe('the transitive shadcn components', () => {
  it.each(DORMANT)('is not imported outside the sidebar: %s', (component) => {
    for (const file of sourceFiles(src)) {
      expect(readFileSync(file, 'utf8')).not.toContain(`@/components/ui/${component}`)
    }
  })
})
```

3.6 `npm test`. Expect the four T5 assertions to fail — the freshly written `sidebar.tsx` has all
    of it.

3.7 In `src/components/ui/sidebar.tsx`, delete the cookie persistence. Inside `setOpen`, remove
    these two lines and the comment above them:

```ts
// This sets the cookie to keep the sidebar state.
document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
```

    Then delete the two now-unused constants at the top of the file:

```ts
const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
```

    Leave a comment where the write was, so the next reader knows this is deliberate:

```ts
      // Persistence is P3's, through `sticky-notes:sidebar` and `useLocalStorage`.
      // shadcn's cookie write was removed here — see specs/.../requirements.md D4.
```

    `noUnusedLocals` is on, so leaving either constant behind fails `tsc -b`. That is the desired
    behaviour, not an obstacle.

3.8 Replace the three `duration-200 ease-linear` occurrences with the token pair. They are in the
    collapse gap `div`, the fixed sidebar container, and `SidebarGroupLabel`:

```
- transition-[width] duration-200 ease-linear
+ transition-[width] duration-(--duration-drawer) ease-drawer

- transition-[left,right,width] duration-200 ease-linear
+ transition-[left,right,width] duration-(--duration-drawer) ease-drawer

- transition-[margin,opacity] duration-200 ease-linear
+ transition-[margin,opacity] duration-(--duration-drawer) ease-drawer
```

3.9 Replace `transition-all` on `SidebarRail`:

```
- absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear
+ absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-[background-color] duration-(--duration-hover) ease-out
```

    The rail's job is a hover affordance on a hairline target; only its background needs to move.

3.10 The tokens these classes reference do not exist until group 4, so the transitions fall back
     to the browser default for one commit. The T5 assertions are source-text checks and pass now;
     the visual check is Gate 3, run at the end of the phase.

3.11 `npm run build && npm run lint && npm test` — clean, no warnings.

3.12 Commit: `feat(ui): add the shadcn sidebar and amend its persistence and motion defaults`

**Leaves:** a sidebar component we own, with shadcn's cookie and its linear easing gone.

---

## 4. Design tokens

4.1 Create `src/__tests__/design_tokens.test.ts` with the T6 chroma/lightness assertions and the
    T10 stock-palette assertions from [validation.md](./validation.md). For T10, guard against the
    directories not existing yet — group 5 creates them:

```ts
const componentDirs = ['components/board', 'components/layout']
  .map((d) => join(src, d))
  .filter((d) => existsSync(d))
```

4.2 `npm test`. Expect **~50 failures** — every achromatic token shadcn wrote, plus
    `--border: oklch(1 0 0 / 10%)` in `.dark` failing both the chroma and the lightness
    assertions, plus `bg-stone-200` if `app.tsx` were already under `components/` (it is not; T10
    catches it in group 6).

4.3 Rewrite the `:root` block in `src/index.css`. Every value warm, none achromatic, none pure:

```css
:root {
    --background: oklch(0.963 0.012 84);
    --foreground: oklch(0.292 0.020 58);
    --card: oklch(0.978 0.011 88);
    --card-foreground: oklch(0.292 0.020 58);
    --popover: oklch(0.978 0.011 88);
    --popover-foreground: oklch(0.292 0.020 58);
    --primary: oklch(0.438 0.062 55);
    --primary-foreground: oklch(0.972 0.013 88);
    --secondary: oklch(0.918 0.018 82);
    --secondary-foreground: oklch(0.322 0.022 58);
    --muted: oklch(0.922 0.016 82);
    --muted-foreground: oklch(0.532 0.022 60);
    --accent: oklch(0.906 0.026 80);
    --accent-foreground: oklch(0.302 0.022 56);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.878 0.018 80);
    --input: oklch(0.878 0.018 80);
    --ring: oklch(0.612 0.074 58);
    --chart-1: oklch(0.760 0.098 62);
    --chart-2: oklch(0.712 0.086 96);
    --chart-3: oklch(0.668 0.074 32);
    --chart-4: oklch(0.622 0.066 300);
    --chart-5: oklch(0.582 0.058 228);
    --radius: 0.625rem;
    --sidebar: oklch(0.948 0.016 84);
    --sidebar-foreground: oklch(0.302 0.020 58);
    --sidebar-primary: oklch(0.438 0.062 55);
    --sidebar-primary-foreground: oklch(0.972 0.013 88);
    --sidebar-accent: oklch(0.898 0.028 80);
    --sidebar-accent-foreground: oklch(0.282 0.022 56);
    --sidebar-border: oklch(0.868 0.020 80);
    --sidebar-ring: oklch(0.612 0.074 58);
}
```

4.4 Rewrite the `.dark` block. Warm now, switched on in *Dark mode*. Note the two alpha values — the
    achromatic `oklch(1 0 0 / 10%)` must become a warm, non-white base or T6 fails on both counts:

```css
.dark {
    --background: oklch(0.238 0.016 58);
    --foreground: oklch(0.932 0.014 84);
    --card: oklch(0.278 0.018 58);
    --card-foreground: oklch(0.932 0.014 84);
    --popover: oklch(0.278 0.018 58);
    --popover-foreground: oklch(0.932 0.014 84);
    --primary: oklch(0.872 0.038 82);
    --primary-foreground: oklch(0.262 0.020 56);
    --secondary: oklch(0.328 0.020 58);
    --secondary-foreground: oklch(0.932 0.014 84);
    --muted: oklch(0.328 0.020 58);
    --muted-foreground: oklch(0.702 0.020 78);
    --accent: oklch(0.362 0.024 60);
    --accent-foreground: oklch(0.932 0.014 84);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(0.932 0.014 84 / 10%);
    --input: oklch(0.932 0.014 84 / 15%);
    --ring: oklch(0.558 0.058 60);
    --chart-1: oklch(0.702 0.086 62);
    --chart-2: oklch(0.662 0.078 96);
    --chart-3: oklch(0.618 0.068 32);
    --chart-4: oklch(0.578 0.060 300);
    --chart-5: oklch(0.538 0.054 228);
    --sidebar: oklch(0.262 0.018 58);
    --sidebar-foreground: oklch(0.932 0.014 84);
    --sidebar-primary: oklch(0.782 0.062 68);
    --sidebar-primary-foreground: oklch(0.242 0.018 56);
    --sidebar-accent: oklch(0.342 0.022 60);
    --sidebar-accent-foreground: oklch(0.932 0.014 84);
    --sidebar-border: oklch(0.932 0.014 84 / 10%);
    --sidebar-ring: oklch(0.558 0.058 60);
}
```

4.5 Add a second `@theme` block after the existing `@theme inline` one. This is the block
    [tech-stack.md](../tech-stack.md) and [mission.md](../mission.md) have been promising:

```css
@theme {
    /* Six papers. mission.md § Core scope names these exact six. */
    --color-paper-butter: oklch(0.941 0.055 96);
    --color-paper-apricot: oklch(0.906 0.068 62);
    --color-paper-rose: oklch(0.893 0.052 18);
    --color-paper-lilac: oklch(0.884 0.048 310);
    --color-paper-sky: oklch(0.901 0.045 232);
    --color-paper-mint: oklch(0.918 0.050 162);

    /* The board behind the paper. */
    --color-cork: oklch(0.632 0.072 62);
    --color-cork-deep: oklch(0.548 0.068 56);

    /* Warm ink — never pure black. */
    --color-ink: oklch(0.292 0.020 58);
    --color-ink-soft: oklch(0.452 0.018 58);

    /* Layered shadow: tight contact shadow + wide ambient shadow.
       Depth must read as height off the board, which one layer cannot do. */
    --shadow-note:
        0 1px 2px oklch(0.30 0.03 60 / 0.16),
        0 4px 10px oklch(0.30 0.03 60 / 0.12);
    --shadow-note-hover:
        0 2px 4px oklch(0.30 0.03 60 / 0.18),
        0 10px 22px oklch(0.30 0.03 60 / 0.16);
    --shadow-note-drag:
        0 3px 6px oklch(0.30 0.03 60 / 0.20),
        0 20px 40px oklch(0.30 0.03 60 / 0.22);

    /* Easing. Never ease-in: it delays the first frame, which is the one being watched. */
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

    /* Durations. Tailwind has no --duration-* namespace, so these are referenced as
       duration-(--duration-drawer), not duration-drawer. Verified against v4.3. */
    --duration-press: 100ms;
    --duration-hover: 160ms;
    --duration-drawer: 200ms;
    --duration-note: 240ms;
}
```

    The shadow values contain `oklch(...)` but are not colour tokens, and T6's regex only matches
    `--token: oklch(` directly — they are correctly out of scope for that assertion.

4.6 Add the two grain utilities. Tailwind v4 takes custom utilities through `@utility`. Both are
    inline SVG turbulence, so no asset is fetched and nothing 404s:

```css
@utility texture-paper {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23p)' opacity='0.20'/%3E%3C/svg%3E");
    background-blend-mode: multiply;
}

@utility texture-cork {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.62' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23c)' opacity='0.36'/%3E%3C/svg%3E");
    background-blend-mode: multiply;
}
```

4.7 Add the reduced-motion rule inside the existing `@layer base` block. Movement goes; opacity
    and colour transitions stay, because they aid comprehension rather than causing motion
    sickness:

```css
  @media (prefers-reduced-motion: reduce) {
    [data-slot^='sidebar'],
    [data-slot='note-card'] {
      transition-property: opacity, background-color, color, box-shadow !important;
      transition-duration: var(--duration-press) !important;
    }
  }
```

4.8 `npm test` — T6 green. `npm run build && npm run lint` — clean.

4.9 Commit: `feat(tokens): replace the achromatic shadcn palette with the paper and cork tokens`

**Leaves:** a warm token system, asserted, with grain utilities and reduced-motion handling ready
for the components that arrive next.

---

## 5. The board

Data first, then the presentational note, then the surface. Nothing here holds state.

5.1 Create `src/components/board/mock_notes.ts`. The type is **local to this module** — promoting
    it to `src/types/note.ts` is P2's job, alongside the reducer that consumes it (**D10**). Tilt
    values are written out, never computed (**D11**):

```ts
export type MockNoteColor =
  | 'butter' | 'apricot' | 'rose' | 'lilac' | 'sky' | 'mint'

export interface MockNote {
  id: string
  body: string
  color: MockNoteColor
  x: number
  y: number
  /** Degrees, -3..3. A literal, never Math.random() — mission.md calls a recomputed tilt a bug. */
  tilt: number
}

// Hardcoded on purpose: P1 proves the visual language, P2 replaces this with real state.
// Swapping this for `useNotes()` should be a one-line change in board.tsx.
export const MOCK_NOTES: MockNote[] = [
  {
    id: 'mock-1',
    body: 'Where a note sits is part of what it means.',
    color: 'butter',
    x: 64,
    y: 48,
    tilt: -2.1,
  },
  {
    id: 'mock-2',
    body: 'Pick it up, move it, put it down.\nThe board stays where you left it.',
    color: 'sky',
    x: 296,
    y: 128,
    tilt: 1.4,
  },
  {
    id: 'mock-3',
    body: 'No save button.',
    color: 'rose',
    x: 152,
    y: 300,
    tilt: -0.8,
  },
]
```

5.2 Create `src/components/board/note_card.tsx`. Props in, markup out, no state:

```tsx
import type { MockNote } from '@/components/board/mock_notes'

// A static map, not a template string — Tailwind scans source text, and `bg-paper-${color}`
// would be invisible to the scanner and emit nothing.
const PAPER: Record<MockNote['color'], string> = {
  butter: 'bg-paper-butter',
  apricot: 'bg-paper-apricot',
  rose: 'bg-paper-rose',
  lilac: 'bg-paper-lilac',
  sky: 'bg-paper-sky',
  mint: 'bg-paper-mint',
}

export function NoteCard({ note }: { note: MockNote }) {
  return (
    <article
      data-slot="note-card"
      data-testid={`note-${note.id}`}
      className={`absolute w-56 rounded-lg p-4 text-ink shadow-note texture-paper ${PAPER[note.color]} transition-[box-shadow,transform] duration-(--duration-hover) ease-out hover:shadow-note-hover hover:-translate-y-0.5`}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        transform: `rotate(${note.tilt}deg)`,
      }}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
    </article>
  )
}
```

    The inline `transform` carries the tilt because it is per-note data, not a design token — this
    is the one place a style attribute is correct. `hover:-translate-y-0.5` is overridden by that
    inline transform and will not lift; that is accepted for P1, and P5 replaces the whole
    transform pipeline when drag arrives. Do not add `!important` to force it.

5.3 Create `src/components/board/board.tsx`:

```tsx
import { MOCK_NOTES } from '@/components/board/mock_notes'
import { NoteCard } from '@/components/board/note_card'

export function Board() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-cork texture-cork">
      {MOCK_NOTES.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  )
}
```

5.4 Create `src/__tests__/board.test.tsx` for T8. First line is the environment docblock:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { Board } from '@/components/board/board'
import { MOCK_NOTES } from '@/components/board/mock_notes'
import { stubMatchMedia } from '@/__tests__/dom_setup'

beforeEach(() => stubMatchMedia())
afterEach(cleanup)

const transforms = () =>
  MOCK_NOTES.map((note) => screen.getByTestId(`note-${note.id}`).style.transform)

describe('the board', () => {
  it('renders one card per mock note', () => {
    render(<Board />)
    expect(screen.getAllByRole('article')).toHaveLength(MOCK_NOTES.length)
  })

  it('gives every note a tilt within the -3..3 range, and never zero', () => {
    render(<Board />)
    for (const transform of transforms()) {
      const degrees = Number(transform.match(/rotate\((-?[\d.]+)deg\)/)?.[1])
      expect(Number.isNaN(degrees)).toBe(false)
      expect(degrees).not.toBe(0)
      expect(Math.abs(degrees)).toBeLessThanOrEqual(3)
    }
  })

  // A Math.random() tilt passes the test above and fails this one.
  it('keeps every tilt identical across a re-render', () => {
    const { rerender } = render(<Board />)
    const before = transforms()
    rerender(<Board />)
    expect(transforms()).toEqual(before)
  })
})
```

5.5 `npm test` — green, including T10, which now has `src/components/board/` to scan and finds no
    stock palette utility in it.

5.6 `npm run build && npm run lint` — clean.

5.7 Commit: `feat(board): add the cork surface and the paper note card`

**Leaves:** paper on cork, rendered from data, with tilt stability proven rather than assumed.

---

## 6. The shell

6.1 Create `src/components/layout/app_sidebar.tsx`. One nav item. The slot comments are the
    contract between this phase and P2/P9/*Dark mode*:

```tsx
import { StickyNote } from 'lucide-react'

import { MOCK_NOTES } from '@/components/board/mock_notes'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

// Slots later phases fill. Named here so the sidebar grows by plan rather than by improvisation:
//   P2 — the "New note" action, as a SidebarGroup above the nav group
//   P9 — the search field and tag list, as a SidebarGroup below it
//   *Dark mode* — the theme toggle, in a SidebarFooter
// Nothing is rendered for them now. A control that cannot be used should not be drawn.
export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <StickyNote className="size-5 shrink-0 text-sidebar-primary" aria-hidden />
          <span className="truncate font-medium group-data-[collapsible=icon]:hidden">
            Sticky
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* shadcn's Sidebar emits no landmark of its own. */}
        <nav aria-label="Board sections">
          <SidebarGroup>
            <SidebarGroupLabel>Board</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive aria-current="page" tooltip="Notes">
                  <StickyNote aria-hidden />
                  <span>Notes</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{MOCK_NOTES.length}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
```

6.2 Create `src/components/layout/app_shell.tsx`. `SidebarInset` **is** the `<main>` element —
    verified against the registry source — so do not add another:

```tsx
import { Board } from '@/components/board/board'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* SidebarInset renders <main>. The board is the only thing in it — mission.md
          principle 4: chrome lives in the sidebar, never on the board surface. */}
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center px-3">
          <SidebarTrigger />
        </header>
        <div className="flex-1 overflow-hidden">
          <Board />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

    The header exists for one reason: below `md` the `SidebarRail` is hidden, so `SidebarTrigger`
    is the only pointer affordance for opening the sheet. It holds nothing else.

6.3 Rewrite `src/app.tsx`:

```tsx
import { AppShell } from '@/components/layout/app_shell'

function App() {
  return <AppShell />
}

export default App
```

    `bg-stone-200` is gone with it. That utility was P0's temporary proof that Tailwind worked;
    the cork token replaces it.

6.4 `npm test`. `tailwind_build.test.ts` now reads an `app.tsx` with **no `className`** and throws
    `'app.tsx declares no className to assert against'`. This is the test doing its job. Point it
    at the file that actually carries utility classes:

```ts
const app = readFileSync(join(root, 'src/components/board/board.tsx'), 'utf8')
```

    Update the error string and the two `describe`/`it` names to say `board.tsx`. The negative
    assertion is untouched.

6.5 Extend `src/__tests__/app_shell.test.tsx` with the rest of T7. Keep the existing main-landmark
    test; add:

```tsx
  it('exposes a named navigation landmark', () => {
    render(<App />)
    expect(screen.getByRole('navigation', { name: 'Board sections' })).toBeDefined()
  })

  it('offers exactly one destination, named Notes and marked current', () => {
    render(<App />)
    const items = screen.getAllByRole('button', { name: /notes/i })
    // Not "at least one" — a second destination is still out of scope in mission.md.
    expect(items).toHaveLength(1)
    expect(items[0].getAttribute('aria-current')).toBe('page')
  })

  it('makes the destination a real button, not a clickable div', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /notes/i }).tagName).toBe('BUTTON')
  })

  it('badges the destination with the live note count', () => {
    render(<App />)
    // Read from the array, not a literal — a literal lets badge and board drift apart.
    expect(screen.getByText(String(MOCK_NOTES.length))).toBeDefined()
  })
```

    Add `import { MOCK_NOTES } from '@/components/board/mock_notes'` to the file.

6.6 `npm test` — green. If `getAllByRole('button', { name: /notes/i })` returns two, the
    `SidebarTrigger`'s accessible name is colliding; give the trigger an explicit
    `aria-label="Toggle sidebar"` rather than loosening the query.

6.7 `npm run build && npm run lint` — clean, no warnings.

6.8 Commit: `feat(layout): add the sidebar shell around the board`

**Leaves:** the phase's screen — chrome on the left, cork and paper filling the rest.

---

## 7. Constitution amendments and the README

Documentation last, describing what shipped rather than what was intended. All of it lands in
this phase's commit; **Gate 4 rejects the PR without it.**

7.1 `specs/mission.md` — amend principle 4. Replace:

```md
4. **Quiet chrome.** The interface is the notes. Toolbars stay minimal and out of the way;
   controls appear on the note you're touching, not on all of them at once.
```

    with:

```md
4. **Quiet chrome.** The interface is the notes. Global controls live in one collapsible
   sidebar and never on the board surface itself; per-note controls appear on the note you're
   touching, not on all of them at once. The sidebar can be collapsed to a rail, and the board
   is fully usable with it collapsed.
```

    Leave the out-of-scope line *"Multiple boards / workspaces / folders (one board, one user)"*
    exactly as it is. One `Notes` destination is not a workspace switcher, and a second nav item
    needs its own amendment.

7.2 `specs/roadmap.md` — retitle and rewrite the P1 section:

```md
## P1 · The shell and the board

**Goal:** the application shell, and paper and cork on screen, with no state behind them.

- Rename every source file we author to `snake_case`; `src/components/ui/**` is exempt because
  `shadcn add` regenerates it. Enforce the rule with a test.
- Define the design tokens in `@theme`: six paper colors, cork backdrop, warm ink, the layered
  shadow scale, easing curves, and durations. Replace shadcn's achromatic defaults.
- `npx shadcn@latest add sidebar`. Delete its cookie persistence and its `ease-linear` motion.
- Build the shell: a collapsible sidebar holding one nav item, **Notes**, plus named slots for
  the New-note (P2), search (P9), and theme (*Dark mode*) controls. The board fills the rest.
- Build the board surface with its cork/felt texture and the paper grain utility.
- Render three **hardcoded** notes to prove the visual language: layered shadow, tilt, grain,
  padding.

**Done when:** the sidebar collapses cleanly and holds the only chrome on screen, the mockup
notes look like paper on a board, and the shadow/tilt/grain criteria in `mission.md` are visibly
satisfied. No `useState` of ours yet.
```

    Add to **P3 · It remembers** a bullet, so D4's deferral is not lost:

```md
- Sidebar collapse persisted under `sticky-notes:sidebar`, through the same `useLocalStorage`
  the board uses. P1 deliberately shipped no replacement for shadcn's deleted cookie.
```

    Renumber nothing else.

7.3 `specs/tech-stack.md` — mostly already done. Three of its four edits **landed with this spec**,
    because they are forward-looking rules rather than descriptions of shipped code, and the file's
    own constitution says a dependency does not arrive without its line being written *first*:

    - the Primitives row corrected to the unified `radix-ui` package;
    - the **File and directory names are `snake_case`** hard rule, with both exemptions;
    - the "State architecture" tree rewritten in snake_case.

    **Verify all three are present and match what actually shipped** — in particular that the tree
    lists the files group 5 and group 6 really created, and no file they did not. Correct the tree
    rather than the code if they disagree; the tree is the claim, the code is the fact.

    The one edit still outstanding is the **DOM-testing row and its rationale paragraph** from
    group 2. It should already be in from that group — verify rather than duplicate. If it is
    missing, Gate 4 fails and the dependency is in the tree without its line, which is exactly the
    violation P0's decision D4 was written against.

7.4 `README.md` — replace the **Status** paragraph:

```md
## Status

P1 (*the shell and the board*) is complete: the design tokens are defined in `@theme` and every
one of them is warm, the app is wrapped in a collapsible shadcn sidebar holding a single
**Notes** destination, and the board renders three hardcoded notes on a cork surface to prove
the paper aesthetic. Source files we author are `snake_case`, enforced by a test. There is no
state yet — P2 makes the notes real.
```

7.5 Re-read [validation.md](./validation.md) § Gate 4 and tick every box against the actual diff.

7.6 `npm run build && npm run lint && npm test` — clean.

7.7 Commit: `docs: amend the constitution for the sidebar shell and the snake_case rule`

**Leaves:** the constitution describing the codebase that exists.

---

## Landing

- Branch: `feat/p1-the-shell-and-the-board` off `develop`.
- Run Gate 3 manually before opening the PR — `npm run dev`, walk the checklist, including the
  reduced-motion pass and the narrow viewport.
- Open a PR **targeting `develop`**, not `main`, with the Gate 3 boxes ticked in the description.
- Squash to **one commit** on merge (roadmap rule: one phase, one commit).
- Merge criteria are in [validation.md](./validation.md) § Merged means.
