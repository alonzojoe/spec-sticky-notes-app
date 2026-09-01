# P5 · A board that lines up — Validation

The phase's Done-when: *notes fill a grid newest-first, a new note takes the first slot and pushes
the rest along, deleting one closes the gap, dragging one onto another swaps them permanently, the
same reordering is reachable from the keyboard, and a board saved under P3 opens ordered rather
than scattered.*

Most of that is assertable. What is not — whether a grid is actually better than the scattered
board it replaces — is a judgement, and Gate 3 check 1 makes it in front of a real board rather
than letting a green suite imply it.

---

## Gate 1 — Command gates

```
npm run build     # tsc -b && vite build
npm run lint      # eslint . — no new warnings
npm test          # vitest run
```

Warning-free. `eslint.config.js` gains no override; no `// eslint-disable` in our own code.

`grep -rn "boardBounds\|findSpot\|NOTE_SIZE" src/` finds `NOTE_SIZE` only in `lib/grid.ts`. The
placement search is gone, not orphaned.

---

## Gate 2 — Automated assertions (Vitest)

T1–T26 come from P0–P3. T27–T36 are new.

### T1–T10 · carried forward

T4's `EXEMPT` pin still reads exactly `['components/ui', 'hooks/use-mobile.ts']`. `grid.ts` and
`use_draggable.ts` are ours and are snake_case, so they pass on merit.

T2 reads `board.tsx`'s first `className`. Group 4 rewrites that file; the first one must stay
`relative h-full w-full overflow-hidden bg-cork texture-cork` in shape — **the `overflow-hidden`
becomes `overflow-y-auto`, so T2's expected string is updated in the same commit.** If T2 starts
throwing *"declares no className to assert against"*, a `<div>` was reordered.

T10 forbids stock palette and shadow utilities in our components. `shadow-note-drag` is a token and
passes; `shadow-lg` on a dragged note would not.

### T11–T19 · the reducer — *extended*

T19 (purity) is the one to watch this phase. Group 4 sorts the notes array for layout, and sorting
in place would mutate the reducer's state. T19 freezes the board, so an in-place sort throws — but
only if the frozen state reaches the board. **T31 asserts the copy directly** rather than relying
on that.

### T27 · `add` stamps above every existing note

`notesReducer` with a seed carrying `order: 7` onto a board whose maximum is 3 produces a note with
`order: 7`, and **no other note's `order` changes**. The reducer does not renumber.

### T28 · `delete` renumbers nothing

Delete the middle note of five and assert the four survivors carry exactly the stamps they had. The
gap closes at render, by rank; a reducer that renumbered here would touch `updatedAt` on notes
nobody edited.

### T29 · `swap_order` exchanges two stamps and nothing else

- The two named notes trade `order`; every other note is untouched.
- Both swapped notes get the action's `at` as `updatedAt`.
- `a === b` returns the state unchanged.
- An id not on the board returns the state unchanged rather than throwing.

### T30 · The grid geometry is correct — `grid.test.ts`

- `columnsFor` never returns less than 1, including at width `0` and at negative widths.
- A width holding exactly *n* cells plus *n − 1* gutters plus two margins returns *n*, and one
  pixel less returns *n − 1*. This is the off-by-one the `+ GUTTER` in the numerator exists for.
- `slotOf(0, c)` is `{ x: MARGIN, y: MARGIN }` for every `c`.
- `slotOf(c, c)` starts the second row: same `x` as slot 0, `y` one `CELL.height + GUTTER` lower.
- `rowsFor(0, c)` is 0; `rowsFor(1, c)` is 1; `rowsFor(c + 1, c)` is 2.
- **No two slot indices in `0…n` produce overlapping rectangles.** Asserted by construction over a
  few column counts — this is the *"they will not override each other"* claim, and it belongs in a
  pure test rather than a rendered one.

### T31 · The board renders the grid in order, without mutating the store

- Five notes with known stamps render in descending `order`, read from the DOM.
- A pinned note renders ahead of every unpinned one regardless of its stamp, and un-pinning
  returns it to its place — its stamp never changed.
- **The array the board sorted is not the array the store holds.** Assert the store's order is
  unchanged after a render.

### T32 · A new note takes the first slot and pushes the rest along

Create a note on a board of three and assert it renders first, and that the other three are in
their previous relative order one slot later. This is principle 1's replacement, asserted.

### T33 · A drag that lands on another note swaps them

Pointer down on note A, move past the threshold, up over note B's rectangle. A and B have traded
places; nothing else moved; both `updatedAt` are stamped.

### T34 · A drag that lands on nothing changes nothing

Same gesture ending away from every note. No action is dispatched and the board is byte-identical.

### T35 · A click is not a drag

`pointerdown` then `pointerup` with no movement — and with movement under the 4px threshold — still
opens the note for editing. This is the assertion that catches the drag swallowing the edit path.

### T36 · The keyboard reorders

- `ArrowRight` on a focused note swaps it with the next in sorted order; `ArrowLeft` with the
  previous.
- `ArrowDown` swaps with the note one row away; `ArrowUp` back.
- `Home` sends it to the first slot, `End` to the last.
- At the first slot, `ArrowLeft` and `Home` do nothing — no wrap.
- **Arrow keys inside the note's textarea move the caret and never reorder.** The guard in plan
  § 6.2, asserted.

### T37 · A P3 board opens ordered — *migration, decision D8*

Seed `localStorage` with a `version: 1` board whose notes carry `x` and `y` and no `order`. On
load:

- Every note has a numeric `order`.
- They render newest-first by `createdAt`.
- `x` and `y` are gone from what is written back.
- The stored `version` is still `1`.
- A board whose notes carry a **non-numeric** `order` is repaired the same way rather than
  rendering `NaN` slots.

---

## Gate 3 — Manual checks

1. **Is it better?** Open a board of a dozen notes before and after. The scattered board is what
   the mission was built around; this replaces it. If the grid reads as worse, that belongs in the
   PR, not in a passing suite.
2. **Resize the window** from wide to narrow and back. Columns recompute, notes move to their new
   slots, nothing overlaps at any width, and nothing is left off-screen. Below one cell's width the
   board is a single column.
3. **Drag at 60fps** with 100+ notes, DevTools performance panel recording. The dragged note tracks
   the pointer with no lag — if it trails, the transition on `transform` was not disabled for it.
4. **Drag past the board edge** and release. The note returns to its slot; nothing is lost off
   screen.
5. **Delete a note from the middle** of a full board and watch the reflow. Every following note
   moves once, smoothly, in 240ms. No note passes through another.
6. **`prefers-reduced-motion: reduce`.** Notes still move to their slots, faster. They do not
   teleport — **D10** is deliberate about this and it is the check that proves it.
7. **Keyboard-only reorder.** Tab to a note, walk it across two rows with the arrows, `End`, then
   `Home`. Never touch the mouse.
8. **Reload.** The arrangement is exactly as left, including swaps made by keyboard.
9. **A real P3 board.** Before upgrading, note where things are. After, they are ordered
   newest-first. This is a one-way change and check 1 is where it gets judged.

---

## Gate 4 — Constitution compliance

Read `mission.md` **after** group 1 and check the app against it.

- **Principle 1, as amended.** The board reorders on create and delete and on nothing else. Editing
  a note does not move it. Pinning moves it only within the pinned group. **If any other event
  reorders the board, this gate fails** — that clause is the whole of what survived the rewrite.
- **Principle 2.** Editing is still in place on the note. The drag must not have broken the click
  that opens it: T35, and check 7.
- **Principle 3.** No Save button. A drag writes on drop, never during.
- **Principle 4.** No chrome was added to the board surface.
- **Principle 5.** T36 and check 7.
- **The tactile criteria.** Tilt is still random and still stored. Grain and cork are untouched.
  The dragged note lifts to `shadow-note-drag` — distinctly further than hover, which is what the
  mission asks for and what P1 defined the token for.

Check the amendment did not overreach: the new principle 1 must still forbid the board tidying
itself. If a future reader could use it to justify a sort-by-colour button, it is too loose.

## Merged means

- Gate 1 clean, including the `grep` for the deleted placement search.
- T1–T37 pass. `note_factory.test.ts`'s placement assertions are deleted, not weakened.
- Gate 3's nine checks done in a browser, with check 1's judgement written into the PR.
- Gate 4 walked, including the overreach check.
- `mission.md`, `roadmap.md`, `tech-stack.md`, `README.md` corrected in the same phase.

## Explicitly not required

- Animating the reflow with a stagger. **Out of scope**; check 5 is a human watching it.
- Multi-select or group drag. Unscheduled.
- Touch-device gesture testing beyond pointer events working. The mission asks for *usable* on a
  phone, not optimised for one.
- Undo for a swap. Session undo is unscheduled and this phase does not change that.
