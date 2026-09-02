# P2 · Real notes, remembered — Requirements

**Phase:** P2 (third phase of [roadmap.md](../roadmap.md))
**Date:** 2026-08-13
**Branch:** `feat/p2-real-notes-remembered` off `develop`
**Status:** specified, not started

---

## Context

P1 merged into `develop`. The screen is finished and completely inert: `app_shell.tsx` wraps a
collapsible shadcn sidebar around a `<main>` board region, `board.tsx` maps a hardcoded
`MOCK_NOTES` array through a presentational `note_card.tsx`, and `app_sidebar.tsx` badges the
`Notes` destination with `MOCK_NOTES.length`. The `@theme` block carries the six papers, the cork,
the warm ink, the three-step shadow scale, four durations, three easing curves, and the two grain
utilities. Eight Vitest suites pass. There is no `useState` of ours anywhere, no `src/types/note.ts`,
and no persistence of any kind.

P1 also left two debts on purpose, both written down rather than forgotten. Its decision **D4**
deleted shadcn's `sidebar_state` cookie and shipped no replacement, recording that the collapse
state would be persisted later *through the same `useLocalStorage` call the board uses*. Its
decision **D10** shaped `MOCK_NOTES` as data rather than markup so that swapping it for a real
store would be a one-line change in `board.tsx`. This phase collects both.

This phase also changes the roadmap, and changes it more than P1 did. The reasoning is in **D1**
and the exact edits are in [plan.md](./plan.md) § 7.

## Scope

Seven deliverables. The first two are the store; everything after is what the store makes possible.

1. **The data model.** `src/types/note.ts` holding the `Note` and `BoardState` types exactly as
   [tech-stack.md](../tech-stack.md) § Data model already specifies them — including `z` and
   `pinned`, which nothing reads until later (**D3**). `mock_notes.ts` and its local `MockNote`
   type are deleted.
2. **The store.** A pure `notes_reducer.ts` handling `add`, `edit_body`, `delete`, and
   `toggle_pin`; `notes_context.tsx` with split state and dispatch providers; `use_notes.ts` for the
   consumer hooks; `lib/note_factory.ts` holding the impure seed generation the reducer must not do
   (**D8**).
3. **Persistence.** `usehooks-ts` installed. The board mirrored to `sticky-notes:board:v1` with
   writes debounced ~300ms, and a defensive read that falls back to an empty board rather than
   throwing (**D6**). Sidebar collapse persisted to `sticky-notes:sidebar` through the same hook,
   discharging P1's **D4** (**D7**).
4. **Creation, with the color chosen first.** A six-swatch paper palette in the sidebar's P2 slot.
   Clicking a swatch puts a note on the board in that color, at a slightly randomized position, with
   a tilt assigned once and stored, at `z = max + 1`, focused and ready for typing (**D4**).
5. **Writing on them.** Click a note — or focus it and press Enter — to edit in place in a plain
   `<textarea>` styled as the note itself. Autosave debounced on change and immediate on blur.
   Escape leaves edit mode. No Save button, no modal (**D9**).
6. **Pin and delete.** A pin toggle and a delete control per note, revealed on hover or focus of
   *that* note only. Pinned notes render above every unpinned note regardless of `z`, and pinning
   never changes a note's `x` or `y` (**D5**, **D10**).
7. **Constitution amendments.** `roadmap.md` P2 rewritten, P3 and P4 marked absorbed, P6 reduced;
   `tech-stack.md`'s file tree, persistence contract, and the "every action stamps `updatedAt`"
   sentence corrected; `README.md` status. All in this phase's commit.

## Out of scope

Deferred deliberately. Each belongs to a named later phase.

- **Dragging notes.** Positions are assigned at creation and never change in this phase. Pointer
  drag, keyboard drag, the lift shadow, and the drop-only write are **P5**. `--shadow-note-drag`
  stays unused.
- **Changing a note's color after creation.** The palette creates; it does not recolor. The
  per-note recolor control and the shadcn `popover`/`dropdown-menu` it needs are **P6**.
- **Search, tags, markdown, checkboxes.** **P9** and ***Markdown and checkboxes***. Note bodies are plain text rendered in
  a `<p>`; a `#tag` typed into one is just characters.
- **Dark mode.** No toggle, no `useTheme`, no `prefers-color-scheme` wiring. ***Dark mode*.**
- **An empty state.** A board with no notes is bare cork, and the palette sitting in the sidebar is
  the only invitation. `empty_state.tsx` is ***Polish***.
- **Delete confirmation.** Delete is immediate and there is no undo. The `alert-dialog` guard for a
  note with content is ***Polish***; the risk is accepted and recorded below.
- **Spring motion on add and delete.** Notes appear and disappear. The spring choreography is
  ***Polish***.
- **Any new shadcn component.** This phase installs none (**D11**). The six components P1 pulled in
  transitively stay dormant, and **T9** still asserts it.
- **Cross-tab synchronisation.** One user, one tab. See Risks.

## Decisions

**D1 — P2 absorbs P3 and P4, and takes the color and pin half of P6. No phase is renumbered.**
The roadmap as written ends P2 with a board that forgets everything on refresh, P3 with notes that
persist but cannot be written on, and P4 with the app finally usable three phases later. Each of
those is a phase that ships something the mission's one-sentence test — *can I capture a thought in
under two seconds, and will the board look exactly as I left it when I come back tomorrow?* —
answers "no" to. The roadmap's own preamble promises the opposite: *"From P2 onward the app is
genuinely usable."* This phase makes that sentence true on the phase it names.

What that costs is a large commit. What it buys is a phase whose acceptance criteria are the
mission's criteria rather than a checkpoint on the way to them.

`P3 · It remembers` and `P4 · Write on them` become tombstones in `roadmap.md` pointing here, and
`P6 · Colors and pinning` shrinks to `P6 · Change a note's color`. **Numbers are preserved** so that
every "**P5**", "**P9**" reference already written into P0's and P1's specs still resolves. A
renumbering would silently repoint a dozen cross-references in documents that are supposed to be
the constitution.

**D2 — The reducer is the source of truth; `localStorage` is a mirror.**
The alternative — `useLocalStorage` as the state itself, with the reducer applied on top — makes
every keystroke a synchronous storage write and puts serialization in the render path. Instead:
`useReducer` holds the board, lazily initialised *once* from storage on mount, and an effect pushes
the board back out through a debounced setter. Storage is never read again after mount and never
written during render, which is what [tech-stack.md](../tech-stack.md)'s persistence contract
demands ("Never write inside a render pass or a pointer-move handler").

**D3 — The whole `Note` shape ships now, including the fields nothing reads yet.**
`z` is written and read this phase (creation sets `max + 1`, pinning depends on it) but nothing
*changes* it — click-to-front is P5. `createdAt` is written and read by nothing at all.
[tech-stack.md](../tech-stack.md) states that changing the data model "means bumping `version` and
writing a migration." Shipping a narrower shape now would guarantee `sticky-notes:board:v2` and a
migration in P5, in exchange for deleting three lines from an interface. The committed model ships
whole, on the first phase that persists anything.

**D4 — Color is picked before the note exists, from the sidebar, not from the note.**
Six swatch buttons under a `New note` group label. One click creates a note in that color. The
alternatives both cost an interaction: a `New note` button that opens a picker is two clicks before
any paper appears, and a default-color button with recolor-after does not do what "pick the color
when adding" says. One click also keeps the mission's two-second capture test comfortably intact.

The palette is **not** hidden when the sidebar collapses to its rail. `mission.md` principle 4 says
the board stays fully usable with the sidebar collapsed, and creating a note is the primary action —
a rail that can only navigate is not usable. The 3×2 swatch grid becomes a 1×6 column at rail width.

**D5 — Pinning changes stacking only, and it is computed at render, not stored in `z`.**
`mission.md` principle 1 is *"Spatial, not sorted. Notes stay where I put them. No auto-layout, no
reflow."* Two implementations of "pinned notes render above" violate it and one does not:

- Sorting the notes array so pinned ones render last — changes DOM order, and therefore tab order,
  every time a pin is toggled. The board looks the same and the keyboard experience silently
  reshuffles. Rejected.
- Writing a huge value into the pinned note's `z` — corrupts the field P5 depends on, and unpinning
  cannot restore what the old `z` was. Rejected.
- Leaving array order, `x`, `y`, and `z` untouched and computing the applied `z-index` at render as
  `pinned ? z + maxZ + 1 : z`, where `maxZ` is the largest `z` on the board. Exact, reversible,
  order-preserving among pinned notes, and it needs no magic constant to be safe against a large
  `z`. **This one.**

**D6 — The defensive read is ours, not the library's.**
`useLocalStorage` catches its own parse errors and returns the initial value, but "unparseable"
is only one of the two failure modes the contract names. The other is *structurally wrong* data — a
`version` that is not `1`, a `notes` field that is not an array, an object with the right version
and garbage inside it. A `hydrate` function validates the shape before the reducer ever sees it and
returns an empty board if anything is off. Trusting the library here would leave the app one
hand-edited `localStorage` entry away from a white screen, which is the exact failure the contract
was written to prevent.

Invalid stored data is replaced, not preserved. There is no quarantine, no backup key, and no
console warning — this is a single-user local app, and a corrupt board is a bug to fix, not data to
recover.

**D7 — Sidebar collapse persistence lands here, because P3 is where it was going and P3 is gone.**
P1's D4 deferred it explicitly and named the mechanism: `sticky-notes:sidebar`, through the same
`useLocalStorage` the board uses. `SidebarProvider` accepts `open` and `onOpenChange`, so it becomes
controlled from `app_shell.tsx` and nothing inside `src/components/ui/sidebar.tsx` is edited again.
Dropping this would leave a deliberate deferral pointing at a phase that no longer exists, which is
how debts become surprises.

**D8 — The reducer is pure, so `crypto.randomUUID()`, `Math.random()`, and `Date.now()` live
outside it.**
`add` needs an id, a tilt, a spawn position, and a timestamp; `edit_body` and `toggle_pin` need a
timestamp. All of them are generated at the dispatch site by `lib/note_factory.ts` and travel in the
action payload. The reducer receives a fully-determined `seed` and computes only what is a function
of existing state: `z = max + 1`.

This **refines** a sentence in [tech-stack.md](../tech-stack.md): *"Every action stamps
`updatedAt`."* Read literally that puts `Date.now()` inside the reducer and makes it untestable
without fake timers. The rule becomes: every mutating action *carries* the timestamp it stamps. The
file is amended in this phase's commit, and **T17** asserts the three impure calls appear nowhere in
`notes_reducer.ts`.

Tilt is `Math.random()` at creation and stored forever, never recomputed. `mission.md` names a
recomputed tilt as a bug, and P1's D11 shipped literal tilts specifically so this phase would not
inherit a pattern to unlearn.

**D9 — Editing is a mode, and the not-editing view stays a plain element.**
The tempting simplification is to render a `<textarea>` always, styled to look like static text —
no mode, no state machine, focus-on-create for free. It is rejected because of P5: a textarea
covering the note means `pointerdown` on the note's text begins a text selection, and there is
nothing left to grab the note by. P5 would have to undo it.

So: not editing, the body is a real `<button>` carrying the text, full-width and left-aligned. It is
focusable for free, Enter and Space work for free, and no `div` gets an `onClick` — the constitution
calls that a defect. Editing, it is a `<textarea>` with `defaultValue`, **uncontrolled**, so a
keystroke does not re-render every note on the board and the caret cannot jump. Escape and blur
leave the mode.

`editing` is `useState` local to `note_card.tsx`. The dividing line is durability: state that must
survive a refresh belongs to the reducer, ephemeral interaction state does not. A note that was
mid-edit when the tab closed reopens not-editing, and that is correct.

**D10 — Per-note controls are invisible until hovered or focused, and reachable by keyboard
regardless.**
`mission.md` principle 4: *"per-note controls appear on the note you're touching, not on all of them
at once."* Implemented with `group` / `group-hover` / `group-focus-within` and no per-note JavaScript
state. The trap is that `opacity-0` leaves a button focusable but invisible, so tabbing lands on
something nobody can see. `group-focus-within` on the note plus `focus-visible:opacity-100` on the
buttons closes it, and **T16** asserts it rather than trusting review.

**D11 — This phase installs no shadcn component, and the swatches and note controls are plain
`<button>`s.**
Nothing here needs one. `Button` is styled for chrome — its variants resolve to `--accent` and
`--primary`, which is right for a sidebar row and wrong for a control sitting on paper. Six colored
squares and two icon buttons are less code as plain elements with paper and ink tokens than as
`Button` overrides, and the roadmap rule is explicit: *"Don't build ahead. If a phase doesn't need a
shadcn component, don't install it yet."*

The consequence is that P1's **D9** dormant set — `button`, `input`, `tooltip`, `sheet`, `skeleton`,
`separator` — stays dormant in full, and **T9** is carried forward with its list unchanged. If a
future phase needs `Button` on the board, that is a visible edit to a test, which is the point.

## Constraints inherited from the constitution

- `npm run build` (`tsc -b && vite build`), `npm run lint`, and `npm test` pass before the phase is
  done. Lint must be warning-free, not merely error-free.
- TypeScript `strict`; no `any` in committed code. `erasableSyntaxOnly` is on — the action union is
  a discriminated union of object types, not an enum.
- No `console.log` in committed code.
- **Every color, radius, shadow and duration comes from a token.** The six swatches use
  `bg-paper-*`; the controls use `text-ink-soft`; the transitions use `duration-(--duration-hover)`
  and `ease-out`. No `bg-stone-*`, no `shadow-lg`, no `duration-200`, no arbitrary values.
- Interactive elements are real `<button>`s or Radix primitives. A `div` with `onClick` is a defect
  — including the note body (**D9**).
- Every interactive element has a visible focus ring.
- `prefers-reduced-motion` is respected. The existing `@layer base` block already scopes
  `[data-slot='note-card']`; anything this phase animates on a note must be covered by it.
- **No new runtime dependency without updating `tech-stack.md` first.** `usehooks-ts` is the only
  one, and it is *already* in the committed stack table — verify rather than re-add (**Gate 4**).
- No state library. No `fetch`. No backend.
- One phase, one commit.

## Risks

| Risk | Handling |
| --- | --- |
| Deleting `mock_notes.ts` breaks `board.test.tsx` and `app_shell.test.tsx`, which both import `MOCK_NOTES`, and the badge assertion in **T7** reads its length. | The deletion and both test rewrites are one task group ([plan.md](./plan.md) § 3), not a follow-up. The badge assertion is rewritten to add notes through the UI and count them, which is a stronger test than the one it replaces. |
| A debounced write means the last edit before a tab closes can be lost. | Dispatch on blur is immediate rather than debounced, and the debounce is 300ms. Accepted: a `beforeunload` flush is a lifecycle hazard for 300ms of typing, and no phase asks for one. |
| `useLocalStorage` syncs across tabs via `storage` events, but the reducer is the source of truth (**D2**), so a second tab's write is overwritten by the first tab's next push. | Out of scope and recorded here rather than discovered later. `mission.md` scopes this to one user with no sync. Revisit only if a real two-tab workflow appears. |
| `crypto.randomUUID()` is unavailable in insecure contexts and may be missing from the jsdom build. | `note_factory.ts` is the single call site. Component tests stub it in `dom_setup.ts` alongside `matchMedia`; the factory's own test asserts the id is a non-empty string, not a UUID shape. |
| Delete is immediate and there is no undo. A misclick on a note holding real text destroys it. | Accepted for this phase and named in Out of scope. The delete control sits opposite the pin toggle with real spacing between them, and *Polish* adds the `alert-dialog` guard for notes with content. Not silently deferred — it is a roadmap line. |
| An uncontrolled `<textarea>` (**D9**) desynchronises if anything else writes `body` while it is open. | Nothing else writes `body` in this phase. When *Markdown and checkboxes* introduces a second writer, the textarea gets a `key={note.updatedAt}` or becomes controlled — recorded so it is a decision then rather than a bug. |
| Reading `localStorage` on mount can flash an empty board before the stored one appears. | The reducer is lazily initialised from the stored value on the *first* render, not in an effect. P1's Gate 3 "no layout shift on load" check is carried forward and now covers the board as well as the sidebar. |
| `useReducer`'s lazy initialiser runs on every render in React StrictMode double-invocation, and a `hydrate` with side effects would run twice. | `hydrate` is pure — it validates and returns. It does not write, log, or migrate. |
| The board becomes the first component to consume context, and a single context would re-render all 100+ notes on every keystroke. | Split state and dispatch contexts, as [tech-stack.md](../tech-stack.md) already specifies. The palette and the controls consume dispatch only and never re-render on a body edit. The 100-note performance check itself stays ***Polish***. |
