# P5 · A board that lines up — Plan

A groundwork step and seven task groups. Execute in order: each leaves the tree building, linting
and testing clean. Scope and rationale live in [requirements.md](./requirements.md); the pass/fail
gate lives in [validation.md](./validation.md).

Test-first where a test is possible. Groups end with `npm run build && npm run lint && npm test`.
Commits are split by concern — `chore` for dependencies, `build`, `feat`, `refactor`, `test`,
`docs` — rather than one commit per group.

**Ordering note.** Group 1 is the amendment, because **D1** is the premise. Groups 2–4 build the
model, the pure grid module and the layout, so the board is a working grid before anything can drag
in it. Group 5 adds the drag, group 6 the keyboard. The old placement search is deleted in group 4,
once the thing replacing it renders.

## Constraints to confirm before writing code

*Proven in the repo today:*

- **`--duration-note` (240ms), `--duration-press`, `--ease-out`** all exist in `index.css`'s
  `@theme`, at lines 148 and 155–158.
- **The reduced-motion block** matches `[data-slot^='sidebar']`, `[data-slot^='dialog']` and
  `[data-slot='note-card']`. The note card is already covered; **D10** only changes what the
  override does for it.

*To verify in group 0:*

- **`ResizeObserver` exists in the installed jsdom.** Group 4 puts one on the board. If it is
  missing, stub it in `dom_setup.ts` beside `stubMatchMedia` — a constructor whose `observe` is a
  no-op is enough, because the tests drive the column count by setting the board's width directly.
- **`setPointerCapture` / `releasePointerCapture` exist on jsdom elements.** Group 5 calls both. If
  they are missing, stub them on `HTMLElement.prototype`; do not branch the production code around
  a test environment.
- **`PointerEvent` is constructible in jsdom.** Testing Library's `fireEvent.pointerDown` needs it.
  If not, the tests dispatch a `MouseEvent` with `pointerId` patched on, and say why.
- **`element.getBoundingClientRect()` returns zeroes in jsdom.** It does, and group 5's hit test
  depends on rects. The measured rectangles are therefore injected in tests through the same
  measurement seam the board already uses for its width — do not assert hit-testing against jsdom
  geometry.

---

## 0. Groundwork

0.1 Branch: `git switch main && git pull && git switch -c feat/p5-a-board-that-lines-up`.

0.2 `npm run build && npm run lint && npm test` on a clean `main`. Sixteen suites, 369 assertions.

0.3 Walk the "To verify" list. Record each answer in the group-0 commit message.

---

## 1. The amendment

Nothing here touches code.

1.1 `mission.md` principle 1. Replace:

> 1. **Spatial, not sorted.** Notes stay where I put them. No auto-layout, no reflow, no
>    "smart" ordering. The only thing that changes stacking is me clicking a note.

with:

> 1. **Ordered, not scattered.** Notes live in a grid, newest first. A new note takes the first
>    slot and pushes the rest along; deleting one closes the gap. The order is mine to change —
>    dragging a note onto another swaps the two of them, permanently — and nothing else reorders
>    the board.

1.2 `mission.md` § Core scope, first bullet. *"**Freeform board** — create, drag, and stack notes
    anywhere; click to bring to front."* becomes *"**Ordered board** — create, drag to reorder, and
    pin; the grid never rearranges itself except to open or close a slot."*

1.3 Leave the one-sentence test, and every bullet under "What modern UI means here", exactly as
    they are. Tilt, grain, shadow and spring are not amended.

1.4 Commit: `docs: amend the constitution for an ordered board`

---

## 2. The model and the ordering rules

Test-first: extend `notes_reducer.test.ts` with T27–T29 from [validation.md](./validation.md).

2.1 `src/types/note.ts` — `Note` gains `order: number`, loses `x` and `y`. `NoteSeed` gains
    `order: number` and loses `x` and `y` for the same reason. Comment `order` as *higher is
    earlier*, because the descending sense is the one thing about this field that is not obvious.

2.2 `src/context/notes_reducer.ts`:
    - `add` — `order` comes in on the seed. The reducer stays a function of its arguments.
    - `delete` — unchanged. It already filters, and **D3** is explicit that nothing renumbers.
    - new `swap_order` — `{ type: 'swap_order'; a: string; b: string; at: number }`. Exchanges the
      two notes' `order`, stamps both `updatedAt`. A swap where `a === b`, or where either id is
      missing, returns the state unchanged rather than throwing.

2.3 `src/lib/note_factory.ts` — the placement search goes. `findSpot`, `separation`,
    `clearanceAt`, `Placement`, `Spot`, `boardBounds`, and every constant serving them are deleted.
    What remains is the impure boundary: an id, a tilt, a timestamp, and now the order stamp.

```ts
export function createNoteSeed(color: NoteColor, topOrder: number, body = ''): NoteSeed {
  return {
    id: crypto.randomUUID(),
    color,
    body,
    order: topOrder + 1,
    tilt: Number((Math.random() * TILT * 2 - TILT).toFixed(2)),
    at: Date.now(),
  }
}
```

    `NOTE_SIZE` moves to `lib/grid.ts` (group 3). This file is about 190 lines today and should end
    the group under 40 — the careful placement search it holds is the thing this phase makes
    unnecessary, and half-deleting it would leave dead constants that read as still-used.

2.4 `new_note_dialog.tsx` calls `createNoteSeed(color, topOrder(notes), body.trim())`. It no longer
    measures the board, so `boardBounds()` leaves with the rest of the search.

2.5 Commit: `feat(state): order notes by a stamp instead of a coordinate`

---

## 3. The grid module

Test-first: `src/__tests__/grid.test.ts`, T30.

3.1 `src/lib/grid.ts` per **D5**. Pure, no DOM, no React.

3.2 `columnsFor` must return at least 1. The arithmetic is
    `floor((width - 2 * MARGIN + GUTTER) / (CELL.width + GUTTER))` — the `+ GUTTER` is there
    because *n* columns carry *n − 1* gutters, and dropping it costs a column at exactly the widths
    where one fits.

3.3 Commit: `feat(board): add the pure grid geometry module`

---

## 4. The board lays out through it

4.1 `board.tsx`:
    - A `ResizeObserver` on the board element writes its width into state; `columnsFor` turns that
      into a column count. The initial value comes from a layout effect, so the first paint is not
      a single column that reflows.
    - Notes are sorted `pinned` first, then `order` descending, and their index in that sorted
      array is their slot. **The sort is a copy.** Sorting `notes` in place would mutate the
      reducer's array, and T19 (the purity test) exists because that class of bug is invisible.
    - Each note is positioned with `transform: translate(x, y) rotate(tilt)` from
      `slotOf(index, columns)`.
    - The container gains `overflow-y-auto` and a spacer sized by `rowsFor`, so the scroll height
      is right.

4.2 `note_card.tsx` — position and rotation move into a `transform` the board supplies. The
    `left`/`top` style attributes go. Add the slot transition per **D10**:
    `transition-transform duration-(--duration-note) ease-out`, and a `data-dragging` attribute
    that disables it.

4.3 `index.css` reduced-motion block: `[data-slot='note-card']`'s override currently drops
    `transform` from the transitioned properties. Per **D10** it must *keep* `transform` and
    shorten it to `--duration-press` instead, or a delete teleports every note after it. This is a
    deliberate exception to "movement goes" and the comment must say so.

4.4 T31 and T32. `npm run build && npm run lint && npm test`.

4.5 Commit: `feat(board): lay the notes out on the grid`

---

## 5. Dragging

Test-first: `src/__tests__/dragging.test.tsx`, T33–T35.

5.1 `src/hooks/use_draggable.ts` per **D6**. It owns pointer state and returns handlers plus the
    live offset; it dispatches nothing itself. The board passes it a callback for the drop.

5.2 The 4px threshold before a drag begins. Without it, `pointerup` after a stationary
    `pointerdown` is indistinguishable from a click, and clicking a note to edit it stops working.

5.3 **Measure once, at `pointerdown`.** Every note's rectangle is read into an array when the drag
    starts, not on every `pointermove`. § Risks explains why; the arithmetic fallback is there if
    a real board disagrees.

5.4 The hovered target gets `ring-2 ring-ring`, matching the dialog's selected swatch. The dragged
    note gets `shadow-note-drag`, which P1 defined and nothing has used yet.

5.5 Commit: `feat(board): drag a note onto another to swap their places`

---

## 6. The keyboard path

6.1 In `note_card.tsx`, on the article: `ArrowLeft`/`ArrowRight` swap with the adjacent note in
    sorted order, `ArrowUp`/`ArrowDown` swap with the note one row away, `Home`/`End` swap to the
    first and last slot. The article is already focusable for the edit path.

6.2 The keys must not fire while the note is being edited — the textarea is a child, and arrow keys
    inside it move the caret. Guard on the event target being the article itself.

6.3 T36. Commit: `feat(board): reorder a note from the keyboard`

---

## 7. Tests and the constitution

7.1 Suites that create notes and assert coordinates: `persistence.test.tsx`, `board.test.tsx`,
    `note_factory.test.ts`, `new_note_dialog.test.tsx`. `note_factory.test.ts` loses its placement
    assertions with the placement code — **delete them, do not weaken them into assertions that
    pass vacuously.**

7.2 `roadmap.md`, `tech-stack.md`, `README.md` per **D9**.

7.3 Full gate.

7.4 Commits: `test: cover the grid, the drag and the reordering`, then
    `docs: record the ordered board across the constitution`.

---

## Status

Specified.

## Landing

PR from `feat/p5-a-board-that-lines-up` into `main`.
