# P2 · Real notes, remembered — Validation

How to know P2 actually succeeded. The phase's Done-when is: *a thought can be captured in one click
and typing, notes survive a hard refresh and a browser restart with identical colours, tilts and
stacking, pinned notes are still on top afterwards, and corrupting the localStorage value by hand
loads an empty board instead of white-screening.*

Almost all of that is assertable, and this is the first phase where the automated gate carries the
real weight — P1's criteria were about how things looked, P2's are about whether data survives.
What stays manual is listed as manual rather than disguised as coverage.

---

## Gate 1 — Command gates

All three exit zero from a clean checkout after `npm install`:

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free, not merely passing. `eslint.config.js` gains **no new override** in this phase. P1's
single scoped exemption (`react-refresh/only-export-components` off for `src/components/ui/**`)
stays exactly as it is; widening it to `src/context/**` to avoid splitting the contexts out of the
provider file fails this gate. So does any `// eslint-disable` line in our own code.

---

## Gate 2 — Automated assertions (Vitest)

Tests live in `src/__tests__/`. T1–T10 exist from P0 and P1. T11–T19 are new.

### T1 · The `@/` alias resolves — *carried forward, unchanged*

### T2 · Tailwind emits utilities — *carried forward, unchanged*

`tailwind_build.test.ts` already reads `src/components/board/board.tsx` and extracts its first
`className`. Group 4 rewrites that file but keeps
`className="relative h-full w-full overflow-hidden bg-cork texture-cork"` as the first one, so no
edit is required. If the test starts throwing *"declares no className to assert against"*, a `<div>`
was reordered — fix the component, not the test.

### T3 · The starter is gone — *carried forward, unchanged*

### T4 · Every file we author is snake_case — *carried forward, unchanged*

The walker covers `src/` recursively, so `board_storage.ts`, `note_factory.ts`, `paper.ts`,
`note_controls.tsx`, `note_palette.tsx`, `notes_reducer.ts`, `notes_context.tsx`, `use_notes.ts` and
`types/note.ts` are all checked the moment they exist. **The `EXEMPT` pin must still read exactly
`['components/ui', 'hooks/use-mobile.ts']`** — this phase adds nothing to it.

### T5 · The sidebar's shadcn defaults were amended — *carried forward, unchanged*

Still no `document.cookie`, no `sidebar_state`, no `ease-linear`, no `transition-all`, and still
`ease-drawer` present. Group 3 makes `SidebarProvider` controlled **from outside**; nothing inside
`src/components/ui/sidebar.tsx` is edited. If this test fails, a persistence shortcut was taken in
the wrong file.

### T6 · Every token is warm — *carried forward, unchanged*

No `@theme` value changes in this phase. The test's value is now as a tripwire: it catches a future
`shadcn add` flattening the palette, and P2 installs no shadcn component at all (**D11**).

### T7 · The shell renders its chrome — *rewritten*

`app_shell.test.tsx`. The badge no longer reads a fixture length, so the assertion gets stronger
rather than being deleted:

- Exactly one `<main>` landmark; one `<nav>` with an accessible name — unchanged from P1.
- Exactly one navigation item named `Notes`, carrying `aria-current="page"`, and it is a real
  `BUTTON` — unchanged from P1.
- With `localStorage` empty, the badge reads `0`.
- After clicking one palette swatch, the badge reads `1`. Comparing the badge against a length the
  test imported from the same module the component imported was always circular; this compares it
  against an action.

### T8 · Tilt is stable across re-renders — *rewritten*

`board.test.tsx`. Tilt now comes from the store rather than from a fixture, which makes the original
risk real for the first time. Seed `localStorage` with two notes carrying known tilts, render, read
the `transform` off each note, force a re-render, read them again, assert equality — and assert each
value is non-zero and within ±3°. Then dispatch an unrelated change (add a third note) and assert
the first two transforms are *still* identical. A `Math.random()` in a render path passes the first
half of this and fails the second.

### T9 · The dormant components stay dormant — *carried forward, unchanged*

Still asserting that nothing outside `src/components/ui/` imports `button`, `input`, `tooltip`,
`sheet`, `skeleton`, or `separator`. **The list does not shrink in this phase** — requirements
**D11** decided the swatches and the note controls are plain `<button>`s. If this test fails, a
shadcn `Button` was reached for; that is a decision to make in a spec, not in a component.

### T10 · No stock palette utilities in our components — *carried forward, unchanged*

The scan already covers `src/components/board/` and `src/components/layout/`, so `note_palette.tsx`
and `note_controls.tsx` are covered as soon as they land. Also still asserting no
`shadow-lg`/`shadow-md`/`shadow-xl`.

### T11 · The reducer is correct — *criterion: the store*

New file `src/__tests__/notes_reducer.test.ts`. Default `node` environment; the reducer imports no
React and needs no DOM.

- `add` appends a note with `body: ''`, `pinned: false`, and `createdAt === updatedAt === seed.at`.
- `add` sets `z` to the largest `z` on the board **plus one**, including when the board is empty
  (`z === 1`) and when `z` values are non-contiguous.
- `add` does not leak `seed.at` onto the note as an `at` property.
- `add` appends rather than prepends — `notes[notes.length - 1].id` is the new one. Array order is
  tab order and **D5** depends on it.
- `edit_body` sets `body` and `updatedAt` on the target and leaves `x`, `y`, `z`, `tilt`, `color`,
  `pinned` and `createdAt` untouched.
- `toggle_pin` flips `pinned` and stamps `updatedAt`; applying it twice returns the original
  `pinned` value.
- `delete` removes exactly the target and leaves the others in order.
- Every action against an id that is not on the board returns a board with the same notes.
- **The reducer never mutates its input.** Freeze the state and every note in it before dispatching:

```ts
const frozen = (board: BoardState): BoardState =>
  Object.freeze({ ...board, notes: Object.freeze(board.notes.map((n) => Object.freeze(n))) as Note[] })
```

  A `notes.push(...)` or a `note.pinned = !note.pinned` throws in strict mode instead of quietly
  passing every other assertion in this file.

### T12 · A corrupt board never reaches the reducer — *criterion: decision D6*

New file `src/__tests__/board_storage.test.ts`. Default `node` environment — `hydrate` is a pure
function of its argument.

Returns `EMPTY_BOARD` for each of: `null`, `undefined`, `'not json'`, `42`, `[]`, `{}`,
`{ version: 2, notes: [] }`, `{ version: '1', notes: [] }`, `{ version: 1, notes: 'nope' }`,
`{ version: 1, notes: [{ id: 'a' }] }` (a note missing most of its fields), and
`{ version: 1, notes: [validNote, { ...validNote, color: 'chartreuse' }] }` — one bad note rejects
the whole board, which is the documented behaviour and not an accident.

Returns the board unchanged for a well-formed one, and the returned object is not the same reference
as the input (`hydrate` must not hand the reducer a value someone else holds a pointer to).

Also assert the two key constants literally: `BOARD_KEY === 'sticky-notes:board:v1'` and
`SIDEBAR_KEY === 'sticky-notes:sidebar'`. They are a contract with data already on disk, and a typo
in either silently orphans every note the user has.

### T13 · The factory produces a legal seed — *criterion: decision D8*

New file `src/__tests__/note_factory.test.ts`. Over 200 generated seeds:

- `id` is a non-empty string, and all 200 are distinct. **Do not assert a UUID shape** — the id's
  only contract is uniqueness, and the test stubs `randomUUID` in environments that lack it.
- `tilt` is within `-3 .. 3` inclusive, and across 200 seeds at least one is negative and one is
  positive. `mission.md`: *"Notes never sit perfectly square."*
- `x` and `y` are integers inside the spawn window, and across 200 seeds neither is constant — two
  notes made in a row must not land on exactly the same spot.
- `at` is a number within a few seconds of `Date.now()`.

### T14 · The board persists and restores — *criterion: the phase's central claim*

New file `src/__tests__/persistence.test.tsx`, `// @vitest-environment jsdom` on line one.
`localStorage.clear()` in `beforeEach`, `vi.useFakeTimers()` for the debounce, `afterEach(cleanup)`.

- Mounting `<App />` with a valid board already in `sticky-notes:board:v1` renders those notes, with
  their stored colours and tilts, **on the first render** — not after an effect. Assert against the
  result of `render()` without advancing timers.
- Mounting with `sticky-notes:board:v1` set to `'{{{'` renders an empty board and **does not
  throw**. This is the white-screen case, and it is the reason `hydrate` exists.
- Mounting with a structurally wrong value (`{"version":9,"notes":[]}`) does the same.
- Adding a note does **not** write to `localStorage` immediately. Advance timers past 300ms and the
  key now holds one note. This asserts the debounce exists rather than assuming it.
- Toggling the sidebar writes `sticky-notes:sidebar`, and mounting with it set to `false` renders
  the sidebar collapsed. P1's **D4** deferred exactly this; the test is where the debt is proven
  paid.
- **Nothing writes a cookie.** `document.cookie` is `''` after mounting and toggling.

### T15 · Colour is chosen at creation — *criterion: decision D4*

New file `src/__tests__/note_palette.test.tsx`, jsdom.

- Exactly **six** swatch buttons, one per entry in `NOTE_COLORS`, iterated from the exported array
  so a seventh paper cannot be added without a swatch appearing.
- Each is a real `BUTTON` with an accessible name naming its colour (`New Apricot note`).
- Clicking the Apricot swatch puts exactly one note on the board and that note's `className`
  contains `bg-paper-apricot`. Clicking Mint next produces a second note carrying `bg-paper-mint`,
  and the first is still apricot.
- The new note mounts with a **focused** `textarea` — `document.activeElement` is the note's text
  field. This is "focused and ready for typing", asserted rather than assumed.
- Adding a second note while the first is still open moves focus to the second and leaves **exactly
  one** textarea on the board. `startEditing` is only an initial value, so this works by the new
  textarea's `autoFocus` blurring the old one, which saves and closes it (plan § 6.2). It is worth
  asserting precisely because it is a cascade rather than a rule.

### T16 · Notes can be written on, and the text survives — *criterion: deliverable 5*

New file `src/__tests__/note_editing.test.tsx`, jsdom, fake timers.

- A note not being edited renders its body inside a real `BUTTON`, not a `div` with a handler.
- An empty note shows the placeholder text, and `localStorage` still holds `body: ''` — the
  placeholder is rendered, never stored.
- Clicking the body swaps it for a `textarea` carrying the current body as its value.
- Typing then blurring dispatches immediately: the rendered note shows the new text **without**
  advancing timers past the autosave debounce. The last keystroke before leaving a note is the one
  most easily lost, and this is the assertion that it is not.
- Typing and waiting past the debounce without blurring also persists.
- Escape leaves edit mode and keeps what was typed.
- The textarea is uncontrolled, asserted through its practical consequence: type into note A's
  textarea without blurring, then pin note **B**. A's textarea still holds the typed text and is
  still `document.activeElement`. A controlled textarea driven by `note.body` would revert to the
  last committed value when that unrelated board change re-rendered it.

### T17 · Pinning raises stacking and moves nothing — *criterion: mission.md principle 1, decision D5*

New file `src/__tests__/note_controls.test.tsx`, jsdom. This is the assertion the phase most needs to
get right, because a wrong implementation looks correct on screen.

Seed three notes. Record, for each: `style.left`, `style.top`, `style.zIndex`, and its index in
`container.querySelectorAll('[data-slot="note-card"]')`. Pin the middle one. Then assert:

- Its computed `zIndex` is strictly greater than every unpinned note's.
- Its `left` and `top` are **byte-identical** to before. No reflow, no relayout, no re-spawn.
- The DOM order of all three notes is **unchanged**. A sort would pass the first two assertions and
  fail this one, and it is the one that protects tab order.
- The stored `z` values in `localStorage` are unchanged for all three — pinning writes `pinned` and
  `updatedAt`, and nothing else.
- Unpinning returns the note's `zIndex` to exactly its pre-pin value.
- With two notes pinned, the one with the larger `z` still renders above the other. Pinning is a
  layer, not a flattening.

### T18 · Per-note controls are quiet but reachable — *criterion: mission.md principle 4, decision D10*

Also in `note_controls.test.tsx`.

- On an unpinned, unhovered note both controls carry `opacity-0` **and** the escapes
  `group-hover:opacity-100`, `group-focus-within:opacity-100`, and `focus-visible:opacity-100`. A
  focusable element that never becomes visible when focused is an accessibility defect, and
  `opacity-0` alone is exactly that.
- Both are real `BUTTON`s with accessible names, and the pin button carries `aria-pressed` matching
  the note's state.
- A **pinned** note's pin button does not carry `opacity-0`. Pin state must be legible without
  pointing at every note in turn.
- The note card carries the `group` class — without it every `group-*` escape above is inert, which
  no other assertion would catch.
- Clicking delete removes that note and leaves the others.

### T19 · The reducer is pure — *criterion: decision D8*

New file `src/__tests__/reducer_purity.test.ts`. A source assertion over
`src/context/notes_reducer.ts`: it contains no `Date.now`, no `Math.random`, no `crypto.randomUUID`,
and no `from 'react'`. T11's frozen-state case proves it does not mutate; this proves it will not
quietly acquire a clock in P5 or P10 and turn every future test into one that needs fake timers.

### Test setup

`src/__tests__/dom_setup.ts` gains `stubRandomUUID` beside the existing `stubMatchMedia`, and only
if step 0.3 finds the installed jsdom lacks `crypto.randomUUID`. Every component test still calls
`stubMatchMedia()` in `beforeEach` and `afterEach(cleanup)` explicitly — Vitest runs without globals
here, so RTL never registers its automatic hook.

Every jsdom test in this phase also calls `localStorage.clear()` in `beforeEach`. Without it a board
written by one test hydrates the next, and T14 in particular passes for entirely the wrong reason.

Do **not** add a `test` block to `vite.config.ts`. Files opt into jsdom with the
`// @vitest-environment jsdom` docblock, so T11, T12, T13 and T19 keep running in node.

---

## Gate 3 — Manual checks

Run `npm run dev`. These are about durability and feel, which no unit test reaches.

**The one-sentence test**

- [ ] **Capture in under two seconds.** From a loaded page: click a swatch, type a sentence, click
      the board. Nothing else. If that takes more than two seconds or more than those three actions,
      the phase has missed its point.

**It remembers**

- [ ] **Hard refresh.** `⌘⇧R`. Every note is where it was, in the colour it was, at the tilt it was,
      with the text it had, and the pinned ones are still pinned and still on top.
- [ ] **Browser restart.** Quit the browser entirely, reopen, load the app. Same board.
- [ ] **Corrupt it by hand.** In DevTools, set `sticky-notes:board:v1` to `{{{`, reload. An empty
      board loads. No white screen, no error overlay, no console exception. Repeat with
      `{"version":9,"notes":[]}`.
- [ ] **The sidebar remembers too.** Collapse it, reload — still collapsed. Expand, reload — still
      expanded. Confirm in Application → Cookies that **no `sidebar_state` cookie exists**.
- [ ] **Typing does not hammer storage.** Watch Application → Local Storage while typing a long
      sentence. The value updates in bursts, not per keystroke.

**Colour and pinning**

- [ ] **Six papers, all distinguishable.** Create one of each. No two read as the same colour at
      arm's length, and all six carry ink that is comfortably readable.
- [ ] **The palette works on the rail.** Collapse the sidebar. The six swatches are still there as a
      single column, still legible, still clickable. `mission.md` principle 4: the board is fully
      usable with the sidebar collapsed.
- [ ] **Pinning does not move anything.** Pin a note in the middle of a pile. It rises above the
      others and does not shift by a pixel.
- [ ] **Pin state is visible without hovering.** Glance at the board and tell which notes are
      pinned.

**Quiet chrome**

- [ ] **An unhovered board is quiet.** With the pointer off the board, no note shows a control
      except the pin on a pinned note.
- [ ] **Hover reveals one note's controls, not all of them.**
- [ ] **Keyboard reaches everything.** Tab from the sidebar through the board. Every stop shows a
      visible focus ring, including the pin and delete buttons, which become visible when focused.
      Enter on a note body opens it for editing; Escape closes it and keeps the text.
- [ ] **Reduced motion.** Enable *Reduce motion* in System Settings → Accessibility → Display,
      reload. The sidebar snaps, the controls appear without fading, and everything still works.

**Both**

- [ ] **The console is clean.** No errors, no warnings, no failed requests — including after
      corrupting `localStorage`.
- [ ] **No layout shift on load.** The board does not flash empty before the stored notes appear,
      and the sidebar does not flash open then closed.

Record every box as ticked in the PR description. An unchecked box blocks merge.

---

## Gate 4 — Constitution compliance

- [ ] `specs/roadmap.md` P2 rewritten to match what shipped; **P3 and P4 replaced with tombstones,
      headings kept, nothing renumbered**; P6 reduced to per-note recolour (**D1**).
- [ ] `specs/tech-stack.md` carries, in this same commit: the sidebar key in the persistence
      contract; the corrected "every mutating action *carries* the timestamp it stamps" sentence
      (**D8**); the file tree matching the files that actually exist, with `mock_notes.ts` and
      `note_toolbar.tsx` removed and `board_storage.ts`, `note_factory.ts`, `paper.ts` and
      `note_controls.tsx` added.
- [ ] `src/types/note.ts` matches `tech-stack.md` § Data model in substance. `version` is still `1`
      and there is **no migration**, because **D3** shipped the shape whole.
- [ ] Exactly one new runtime dependency: `usehooks-ts`. Its line was already in `tech-stack.md`
      before it was installed — verify it is there **once**, not twice.
- [ ] No state library. No `fetch`. No backend. No `console.log`. No `any`.
- [ ] **No shadcn component installed** (**D11**). `components.json`'s registry additions are
      unchanged from P1, and T9's dormant list is unchanged.
- [ ] No new `eslint.config.js` override and no `// eslint-disable` in our code.
- [ ] Every colour, radius, shadow and duration in the new components comes from a token. T10
      covers the components; check `note_palette.tsx`'s ring and border classes by eye as well.
- [ ] `src/components/ui/sidebar.tsx` is **not modified** in this phase's diff.
- [ ] `src/index.css` is **not modified** in this phase's diff. If it is, something animated a
      transform that `prefers-reduced-motion` then had to be taught about — reconsider the
      animation instead (plan § 7.4).

---

## Merged means

1. Gates 1–4 pass on `feat/p2-real-notes-remembered`.
2. A PR is open **against `develop`**, not `main`, with the Gate 3 checkboxes ticked in the
   description.
3. The PR is approved and merged into `develop`, arriving as **one commit** for the phase.
4. `develop` at the merge commit builds, lints, and tests clean — verified on `develop` after the
   merge, not only on the branch.
5. P5 begins from that merge commit. P3 and P4 are tombstones and are skipped.

## Explicitly not required

Do not block the merge on these:

- Moving a note by any means, pointer or keyboard (**P5**). Notes sit where they spawned.
- Click-to-front. `z` is set at creation and never changes again in this phase (**P5**).
- Changing a note's colour after it exists (**P6**).
- Search, tags, markdown, or checkboxes (**P9**, **P10**).
- A theme toggle or a designed dark mode (**P11**).
- An empty state, spring motion on add and delete, a delete confirmation, or the 100-note
  performance check (**P12**).
- Cross-tab synchronisation, undo, or a trash/archive. The first is a recorded risk; the other two
  are out of scope in `mission.md`.
