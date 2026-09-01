# P6 · A note with a date — Plan

A groundwork step and seven task groups. Scope and rationale live in
[requirements.md](./requirements.md); the pass/fail gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `chore`, `build`, `feat`, `refactor`, `test`, `docs`.

**Ordering note.** Group 1 is the amendment. Groups 2–4 build the date bottom-up: a pure formatting
module, then the model, then the shared field, so the ISO/display boundary is under test before any
dialog touches it. Group 5 builds the view. **Group 6 is the swap** — the card stops being an editor
only once the view that replaces it works. Nothing between groups 1 and 6 removes a way to edit.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`line-clamp-*` is core in Tailwind v4.** No plugin needed. Verify it emits, the way P5 verified
  `animate-in` did not — that check is the reason this list exists.
- **`useDraggable` distinguishes a click from a drag** with its 4px threshold, and exposes
  `isDragging()`. Group 6's open-on-click depends on it.

*To verify in group 0:*

- **`npx shadcn@latest add calendar popover` writes only those two files** and pulls
  `react-day-picker`. If it rewrites `button.tsx`, review the diff — T5 guards P1's amendments and
  the sidebar is downstream of it.
- **The generated `calendar.tsx` compiles under Tailwind v4** and emits real styles. shadcn ships
  `tw-animate-css` classes this project does not have; P5 found the dialog's were inert. Assume the
  calendar's are too until the built CSS says otherwise.
- **`react-day-picker`'s version matches what the generated component expects.** Its v8→v9 rename of
  `selected`/`onSelect` and the `mode` prop is the usual failure, and it fails at runtime rather
  than at build.
- **`Popover` inside `Dialog` traps focus correctly.** Radix nests them, but the calendar popover
  opening inside the note view is the exact combination that breaks focus scopes. If it misbehaves,
  render the calendar inline in the dialog rather than fighting two nested scopes.

---

## 0. Groundwork

0.1 Branch off `feat/p5-a-board-that-lines-up`, since P6 builds on the grid and **PR #7 is not
    merged**. Rebase onto `main` once it is.

0.2 Full gate on a clean branch: 17 suites, 387 assertions.

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The amendment

1.1 `mission.md` principle 2 — replace with the text in **D1**.

1.2 `mission.md` § Core scope — the *Inline editing with autosave* bullet becomes *Open and edit*.

1.3 **Leave principle 3 exactly as it is.** It forbids the Save button this phase might otherwise
    reach for, and **D5** treats that as a constraint rather than something to amend.

1.4 Commit: `docs: amend the constitution so a note opens to be read and edited`

---

## 2. Dates, as pure functions

Test-first: `src/__tests__/dates.test.ts`, T38.

2.1 `src/lib/dates.ts`:

```ts
export const todayISO = (): string => …      // local components, never toISOString()
export const formatDate = (iso: string): string => …   // 'YYYY-MM-DD' -> 'MM/DD/YYYY'
export const isISODate = (value: unknown): value is string => …
export const isoFromEpoch = (ms: number): string => …  // for the migration
```

2.2 **`formatDate` slices the string; it does not construct a `Date`.** `new Date('2026-09-01')`
    parses as UTC midnight and renders as 31 August anywhere west of Greenwich, and that bug is
    invisible to whoever writes it in a UTC-ish timezone. `todayISO` reads `getFullYear`,
    `getMonth`, `getDate` off a local `Date` for the same reason.

2.3 Commit: `feat(state): add the pure date helpers`

---

## 3. The model

3.1 `src/types/note.ts` — `Note` gains `date: string`, `NoteSeed` gains `date: string`. Comment the
    ISO-in/`MM/DD/YYYY`-out split at the field, because it is the thing a reader will otherwise get
    wrong.

3.2 `notes_reducer.ts` — `add` takes `date` off the seed. New action
    `{ type: 'set_date'; id: string; date: string; at: number }`, stamping `updatedAt`. It follows
    `edit_body`'s shape exactly.

3.3 `note_factory.ts` — `createNoteSeed(color, topOrder, body = '', date = todayISO())`. The default
    keeps every existing call site meaning what it meant.

3.4 `board_storage.ts` — **D7**. A note whose `date` is absent or not `YYYY-MM-DD` gets one from
    `isoFromEpoch(createdAt)`. Rebuild the note object rather than spreading, exactly as the `order`
    repair does, so nothing unexpected survives.

3.5 T39–T40. Commit: `feat(state): give every note a calendar date`

---

## 4. The shared fields

4.1 `npx shadcn@latest add calendar popover`. `git status` — expect exactly two new files. Audit
    both for achromatic colour literals and for inert `tw-animate-css` classes, per P3's **D7** and
    P5's finding. The popover **is** anchored to its trigger, so unlike the dialog it should use
    `transform-origin: var(--radix-popover-content-transform-origin)`.

4.2 Extract `src/components/layout/paper_radiogroup.tsx` from `new_note_dialog.tsx` — the six
    swatches, the roving tabindex, the arrow keys, unchanged. Both dialogs use it.

4.3 `src/components/layout/date_field.tsx` — a button showing `formatDate(value)`, opening a
    `Popover` holding the `Calendar`. Props are `value: string` and `onChange: (iso: string) => void`;
    **the ISO boundary is inside this file** and no `Date` object escapes it.

4.4 `new_note_dialog.tsx` uses both. The date defaults to `todayISO()` **computed when the dialog
    opens**, not at module load — a tab left open overnight must not offer yesterday.

4.5 T41. Commit: `feat(board): add the date field and share the paper swatches`

---

## 5. The note view

Test-first: `src/__tests__/note_view_dialog.test.tsx`, T42–T44.

5.1 `src/components/layout/note_view_dialog.tsx`. Props: the note, and `onOpenChange`. Contents: the
    date field, the paper radiogroup, and a textarea holding the full body.

5.2 **No Save button and no Cancel** (**D5**). Body writes debounced at 300ms on change and
    immediately on close; colour and date dispatch immediately, because neither is typed. Done,
    Escape and the close control all take the same path.

5.3 The textarea is uncontrolled with a `defaultValue`, and **keyed on the note id**, so opening a
    different note does not show the previous one's text. This is the bug the P2 card avoided by
    unmounting; a long-lived dialog does not unmount.

5.4 `board.tsx` owns which note is open — one `useState<string | null>`, not a boolean plus a note,
    so the open note is always a live lookup and never a stale copy of a note that has since changed.

5.5 Commit: `feat(board): open a note to read and edit it`

---

## 6. The card becomes a summary

Only now, with the view working.

6.1 `note_card.tsx`: delete the `<textarea>`, `useDebounceCallback`, the blur handler, the local
    `editing` state, and the `startEditing` prop. `board.tsx` deletes the `openId` heuristic.

6.2 Fixed height `h-44`, `flex flex-col`. Date top-left: `text-xs text-ink-soft tabular-nums`. A
    `mt-3` gap. Body `line-clamp-4 text-sm leading-relaxed`.

6.3 The card opens the note on click **when the gesture was not a drag**, and on `Enter` or `Space`
    when the card itself has focus. The arrow keys still reorder.

6.4 `note_controls.tsx` — the pin and delete handlers **stop propagation**. Without this, deleting a
    note opens the note it just deleted.

6.5 A note created with an empty body opens its view immediately (**D6**).

6.6 T45–T47. Commit: `refactor(board): make the card a summary that opens the note`

---

## 7. Tests and the constitution

7.1 `note_editing.test.tsx` covered the card's textarea. That control no longer exists — **rewrite
    the suite against the view dialog rather than deleting the coverage.** The claims it makes
    (autosave on change, immediate on close, text survives a reload) are all still claims this app
    makes; only the control changed.

7.2 `roadmap.md`, `tech-stack.md`, `README.md` per **D8**. The old P6 moves to **P11** with a note
    that the view dialog's swatches discharge most of it.

7.3 Full gate.

7.4 Commits: `test: cover the date, the view and the summary card`, then
    `docs: record the note view across the constitution`.

---

## Status

Specified.

## Landing

PR into `main`. Until PR #7 merges this branch carries P5's commits too; rebase after it lands.
