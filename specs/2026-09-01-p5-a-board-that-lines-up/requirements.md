# P5 · A board that lines up — Requirements

**Phase:** P5 (fifth phase of [roadmap.md](../roadmap.md))
**Date:** 2026-09-01
**Branch:** `feat/p5-a-board-that-lines-up` off `main`
**Status:** specified

---

## Context

P3 merged into `main`. Notes are created from a toolbar dialog, written on in place, pinned and
deleted, and the whole board persists to `sticky-notes:board:v1`. Sixteen Vitest suites and 369
assertions pass.

Notes are placed by `lib/note_factory.ts`, which measures the board and searches a lattice of slots
for a spot clear of everything already there, jitters off it so the result reads as thrown, and
falls back to the roomiest gap it saw when the board is full. It is careful work and it still
produces a board that reads as scattered — and on a full board it gives up and lets notes touch,
because nothing in the app can move a note once it exists.

This phase replaces that model outright. Position stops being a coordinate the app searches for and
becomes a **slot index** the user controls: notes fill a grid newest-first, a new note takes the
first slot and pushes the rest along, deleting one closes the gap, and dragging one onto another
swaps their places permanently.

That is the opposite of what the constitution says. `mission.md` principle 1 is titled **"Spatial,
not sorted"** and reads *"Notes stay where I put them. No auto-layout, no reflow, no 'smart'
ordering. The only thing that changes stacking is me clicking a note."* Every one of those clauses
is contradicted here. **D1** rewrites the principle, and the rewrite is the phase's premise: if it
is rejected, nothing else in this document should be built.

This phase also takes the P5 slot, which the roadmap reserved for free dragging — pointer events,
live position updates, an 8px arrow-key nudge, clamping notes inside the board. Dragging ships, but
none of the rest survives contact with a grid. **D9** rewrites that section rather than adding a
phase beside it.

## Scope

Seven deliverables.

1. **The constitution amendment.** `mission.md` principle 1 rewritten from *spatial* to *ordered*,
   and the "Core scope" bullet that promises a freeform board corrected to match (**D1**).
2. **The data model.** `Note` gains `order: number` and loses `x` and `y`. Position is derived at
   render from `order` and the column count, so it stays correct when the window resizes (**D2**).
3. **The ordering rules, in the reducer.** `add` stamps the new note above every existing one;
   `delete` closes the gap; a new `swap_order` action exchanges two notes' stamps. All pure
   (**D3**, **D4**).
4. **The grid.** `lib/grid.ts` — a pure module turning a column count and a slot index into a
   pixel offset, and a board width into a column count. The board lays notes out through it and
   scrolls vertically when they overflow (**D5**).
5. **Dragging.** Pointer events with pointer capture. The note follows the pointer, the note under
   the pointer is highlighted as the swap target, and the drop swaps the two stamps. A drop on no
   note returns the dragged note to its slot (**D6**).
6. **The keyboard path.** A focused note moves one slot with the arrow keys, swapping with the note
   already there. `Home` and `End` send it to the first and last slot (**D7**).
7. **Migration.** The defensive read assigns `order` to any stored note that lacks one, newest
   first by `createdAt`, and ignores the `x` and `y` it finds. `version` stays `1` (**D8**).

Plus the documents this invalidates: `roadmap.md`'s P5 and P1 sections, `tech-stack.md`'s data
model, file tree and persistence contract, and `README.md`'s status (**D9**).

## Out of scope

- **Free positioning.** Deliberately removed, not deferred. There is no "unsnap" mode.
- **Multi-select or group drag.** Still in the roadmap's unscheduled list.
- **Reordering by anything but drag and the arrow keys.** No sort-by-colour, no manual sort menu.
- **Animating the reflow of every note when one is deleted.** The moves are transitioned
  (**D10**), not choreographed with a stagger; a stagger on a full board would take longer than
  the delete is worth.
- **Canvas pan and zoom.** The board scrolls vertically. Nothing else.
- **Column count as a user setting.** It is derived from the board width and nothing else.

## Decisions

### D1 · Principle 1 is rewritten, and it is the phase's premise

The current text:

> 1. **Spatial, not sorted.** Notes stay where I put them. No auto-layout, no reflow, no
>    "smart" ordering. The only thing that changes stacking is me clicking a note.

Every clause of that is false after this phase. A narrower amendment was considered — permitting a
note to *snap* to the nearest cell while keeping free positions and forbidding reflow — and it
genuinely would have preserved the principle's intent. It was rejected because it does not deliver
what was asked for: a grid ordered newest-first, where a new note pushes the others along.

The replacement:

> 1. **Ordered, not scattered.** Notes live in a grid, newest first. A new note takes the first
>    slot and pushes the rest along; deleting one closes the gap. The order is mine to change —
>    dragging a note onto another swaps the two of them, permanently — and nothing else reorders
>    the board.

The last clause is where the principle keeps its teeth, and it is the part to defend in review. The
board must never re-sort itself behind the user's back on any event other than a create or a
delete. Editing a note does not move it. Pinning does not move it beyond the pinned group. There is
no background tidy.

`mission.md`'s "Core scope" opens with *"**Freeform board** — create, drag, and stack notes
anywhere; click to bring to front."* That becomes *"**Ordered board** — create, drag to reorder,
and pin; the grid never rearranges itself except to open or close a slot."*

The one-sentence test is not amended. Capture is untouched by this phase.

### D2 · `order` replaces `x` and `y`

`Note` gains `order: number` and loses `x: number` and `y: number`.

Keeping `x` and `y` as a cache of the rendered position was the alternative and it is wrong: the
column count depends on the board's width, so a persisted pixel position is stale the moment the
window is resized. Deriving position at render is the only version that survives a resize, and once
position is derived, stored coordinates are dead fields that will drift.

`z` stays. It is no longer stacking order — a grid does not stack — and its only remaining job is
to lift the note being dragged above its neighbours. That is a real job, and the field is already
persisted, so nothing changes shape to accommodate it.

`tilt` stays, and stays random. `mission.md`'s tactile criteria are not amended by this phase: the
grid is what is formal, not the paper. Tilt within a gutter never causes an overlap, because the
gutter is wider than a 3° rotation of a 224px note displaces.

### D3 · `add` stamps above the maximum; `delete` closes the gap

`order` is a descending sort key: **higher is earlier in the grid.**

- `add` gives the new note `max(order) + 1`, so it takes slot 0 without touching any other note's
  stamp. One note changes, and the rest move because the derived layout shifted, not because they
  were rewritten.
- `delete` removes the note and leaves every remaining stamp alone. The gap closes because slots
  are assigned by *rank*, not by the stamp's value — the layout reads sorted position, so removing
  a note from the middle of the sequence closes the hole for free.

That last point is the one worth stating plainly: **nothing renumbers.** A dense grid falls out of
ranking a sparse sequence, and a reducer that rewrote every stamp on delete would be doing work the
render already does, and would touch `updatedAt` on notes nobody edited.

### D4 · Dragging edits the order; it does not float above it

A swap exchanges two notes' `order` stamps. Both notes' `updatedAt` are stamped, because their
arrangement is user data and a sync-aware future would need to know it changed.

The alternative — treating a drag as a temporary visual arrangement that the next created note
discards — was considered and rejected: it makes dragging pointless within one capture. Because a
swap edits the sort key itself, "the grid is always sorted by recency" and "my arrangement is
permanent" are both true at once. Dragging *is* how recency is edited.

Pinned notes sort ahead of unpinned ones, then by `order` descending. Pinning therefore moves a
note to the front of the pinned group and un-pinning returns it to its place among the rest — its
stamp never changes, so the round trip is lossless.

### D5 · The grid is a pure module

`src/lib/grid.ts`, no DOM and no React:

```ts
export const CELL = { width: 224, height: 144 } as const   // matches NOTE_SIZE
export const GUTTER = 16
export const MARGIN = 24

export const columnsFor = (boardWidth: number): number => …   // at least 1
export const slotOf = (index: number, columns: number): { x: number; y: number } => …
export const rowsFor = (count: number, columns: number): number => …
```

`columnsFor` returns at least 1 so a board narrower than one note still renders a single column
rather than dividing by zero. `NOTE_SIZE` moves out of `note_factory.ts` and into this module —
the factory no longer places anything, and leaving the constant behind in a file that no longer
uses it is how two sources of truth start.

The board measures itself with a `ResizeObserver` and holds the column count in state. Measuring
during render would tear; measuring once on mount would break on resize.

The board's container gains `overflow-y-auto`. It is `overflow-hidden` today, which was correct
when notes were placed inside the visible area and is not correct when a grid can be taller than
the viewport.

### D6 · Dragging is pointer events with pointer capture, and the drop target is a note

`hooks/use_draggable.ts` — `pointerdown` / `pointermove` / `pointerup`, `setPointerCapture` on the
element so the drag survives the pointer leaving it.

- **On `pointerdown`:** record the offset, raise `z` above the maximum, do not yet consider it a
  drag. A drag begins only after the pointer has moved more than 4px, so a click that opens a note
  for editing is not swallowed.
- **During the drag:** the note follows the pointer through `transform`. Nothing is dispatched;
  the store is untouched until the drop, which is what keeps a drag from writing to `localStorage`
  sixty times a second.
- **The drop target** is the note whose rectangle contains the pointer, found by hit-testing the
  rendered notes. It is marked while hovered — a ring, matching the dialog's selected swatch — so
  the swap is visible before it happens.
- **On `pointerup`:** if there is a target and it is not the dragged note, dispatch `swap_order`.
  Otherwise dispatch nothing and let the note transition back to its slot.

There is no clamping, because there is nowhere out of bounds to go: a note that is not dropped on
another note returns to where it came from.

### D7 · The keyboard moves a note by one slot

`mission.md` principle 5 requires it, and this is the phase that would otherwise break it: dragging
is the only way to reorder, so a keyboard path is not optional.

A focused note responds to `ArrowLeft` / `ArrowRight` by swapping with the previous or next note in
sorted order, and to `ArrowUp` / `ArrowDown` by swapping with the note one row away. `Home` and
`End` swap it to the first and last slot. At the ends the key does nothing rather than wrapping —
wrapping would send a note from slot 0 to the far end on a keypress meant to nudge it.

The roadmap's 8px and 32px nudges are deleted with the free positioning they belonged to.

### D8 · The read assigns `order`; `version` stays 1

`lib/board_storage.ts` already refuses to throw on a bad value and falls back to an empty board.
This phase extends it: a stored note lacking a numeric `order` is given one, and `x` and `y` are
dropped if present. Ordering for migrated notes is by `createdAt` descending, so the board a user
comes back to is newest-first — the same rule the grid enforces from then on.

Bumping to `board:v2` with an explicit migration was the alternative. It is the more rigorous
answer and it was rejected on cost: a second key and a migration branch maintained forever, on a
single-user local board, to formalise a fix that runs once. **The honest risk is recorded in
§ Risks** — this is a schema change under an unchanged version number, and the defensive read is
the only thing making it safe.

### D9 · Every document this invalidates is corrected in the same commit

- **`mission.md`** — principle 1 and the Core scope bullet (**D1**).
- **`roadmap.md`** — P5 rewritten around the grid. P1's line about rendering three hardcoded notes
  "to prove the visual language" is historical and stays. *Polish*'s performance check gains the grid.
- **`tech-stack.md`** — the `Note` block, the file tree (`lib/grid.ts`, `hooks/use_draggable.ts`),
  and the persistence contract's note about what a stored board contains.
- **`README.md`** — status line to P5.

### D10 · Motion: notes transition to their slots; the dragged note does not

A note whose slot changed animates to the new one with a `transform` transition at
`--duration-note` (240ms) and `--ease-out`. Transitions rather than keyframes, because a second
delete during the first one's animation must retarget from where the note is rather than restart.

The note under the pointer has its transition switched off — a dragged note must track the pointer
exactly, and a 240ms transition on the thing following your hand is the classic mistake.

`prefers-reduced-motion` collapses the slot transition to `--duration-press` and keeps it, rather
than removing it: a note teleporting across the board on a delete is more disorienting than a fast
move, and the reduced-motion contract in `index.css` is about removing *gratuitous* movement, not
about making state changes unreadable.

## Constraints inherited from the constitution

- **`npm run build`, `npm run lint`, `npm test` pass, warning-free.** No new eslint override.
- **The app is never left broken.** Group ordering in [plan.md](./plan.md) builds the grid and the
  ordering before the drag that manipulates them.
- **Every file we author is `snake_case`.** `grid.ts`, `use_draggable.ts` comply.
- **Warm tokens only.** No `@theme` value changes; the drop-target ring uses `--color-ring`.
- **Keyboard-reachable.** **D7**.
- **Tilt, grain, layered shadows and the lift on drag** are mission criteria and are not amended.

## Risks

**The amendment is the phase.** **D1** inverts the principle the project was founded on. If it is
not accepted, deliverables 2–7 are all wrong. It is deliverable 1 and plan group 1 for that reason.

**A schema change under `version: 1`.** **D8** changes what a stored note contains without changing
the version that describes it. A board written by this build and read by an older one would render
every note at `x: undefined`. Nothing ships older builds, so the exposure is a developer checking
out an old commit against a live `localStorage` — annoying, not dangerous. Recorded rather than
mitigated.

**Losing every existing position is the point, and is still a loss.** Users who arranged notes
spatially under P2 will find that arrangement replaced by creation order on first load. There is no
undo. This is inherent to the feature as asked for, and Gate 3 check 1 is looking at a real board
before and after.

**Hit-testing during a drag reads layout.** `getBoundingClientRect` per candidate note on every
`pointermove` is O(n) per frame and will show up at the 100+ notes `mission.md` asks about. The
plan measures once at `pointerdown` (§ 5.3) rather than per move; if that proves wrong under a real
board, the fallback is computing the target arithmetically from the pointer and the grid geometry,
which is O(1) and needs no DOM at all.
